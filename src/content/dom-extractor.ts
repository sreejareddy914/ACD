import {
  ExtractedContent,
  ExtractedElement,
  ExtractedFormControl,
  ExtractedPrice,
  ExtractedDiscount,
  ExtractedTimer,
  ExtractionCoverage
} from '../analysis/types';
import { normalizeText, parsePrice, parseDiscountClaim, isSensitiveField } from '../analysis/normalizer';

let elementCounter = 0;

/**
 * Configurable, documented extraction limits.
 * Prevents memory exhaustion and unresponsiveness on massive single-page web applications.
 */
export const EXTRACTION_LIMITS = {
  maxVisibleTexts: 1200,
  maxButtons: 120,
  maxLinks: 100,
  maxPrices: 120,
  maxDiscounts: 80,
  maxTimers: 50,
  maxFormControls: 80,
  maxModals: 20,
  maxRawCandidates: 2000,
  maxIframesInspected: 10
};

/**
 * Safely extracts the class name string from any DOM element, including
 * SVGElement (where el.className is an SVGAnimatedString), MathML, or custom elements.
 */
export function safeClassName(el: Element | null | undefined): string {
  if (!el) return '';
  if (typeof el.className === 'string') return el.className;
  if (el.className && typeof el.className === 'object' && 'baseVal' in el.className) {
    return (el.className as SVGAnimatedString).baseVal || '';
  }
  return String(el.className || '');
}

export function getOrCreateElementId(el: Element): string {
  let id = el.getAttribute('data-clearchoice-id');
  if (!id) {
    if (el.id && !document.querySelector(`[data-clearchoice-id="${el.id}"]`)) {
      id = el.id;
    } else {
      elementCounter++;
      id = `cc-el-${elementCounter}`;
    }
    el.setAttribute('data-clearchoice-id', id);
  }
  return id;
}

export function isElementVisible(el: Element | null | undefined): boolean {
  if (!el || typeof el !== 'object' || !('nodeType' in el) || el.nodeType !== 1) return false;
  // Ignore ClearChoice extension UI
  if (el.id === 'clearchoice-extension-root' || el.closest?.('#clearchoice-extension-root') || el.closest?.('[data-clearchoice-ui]')) {
    return false;
  }
  try {
    if (el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true') {
      return false;
    }
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
      return false;
    }
    
    const isJsdom = typeof navigator !== 'undefined' && navigator.userAgent.includes('jsdom');
    if (!isJsdom) {
      if (style.display !== 'contents') {
        const rect = el.getBoundingClientRect?.();
        if (rect && rect.width <= 0 && rect.height <= 0) {
          const rects = el.getClientRects?.();
          if (!rects || rects.length === 0) return false;
        }
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Computes a fast, deterministic content fingerprint for snapshot verification and caching.
 */
export function computeContentFingerprint(
  url: string,
  title: string,
  texts: ExtractedElement[],
  prices: ExtractedPrice[],
  timers: ExtractedTimer[]
): string {
  const textSummary = texts.slice(0, 15).map(t => t.text).join('|');
  const priceSummary = prices.slice(0, 10).map(p => `${p.raw}:${p.value}`).join('|');
  const timerSummary = timers.slice(0, 5).map(t => t.text).join('|');
  const payload = `${url}::${title}::${texts.length}::${prices.length}::${timers.length}::${textSummary}::${priceSummary}::${timerSummary}`;

  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `fp-${Math.abs(hash).toString(36)}-${texts.length}t${prices.length}p`;
}

export interface ExtractionOptions {
  scrollPassCompleted?: boolean;
}

/**
 * Extracts visible, sanitized page content from the DOM across the entire page (including below the fold).
 * Strictly excludes password fields, OTPs, credit cards, CVVs, tokens, and cookies.
 */
export function extractPageContent(options?: ExtractionOptions): ExtractedContent {
  const visibleTexts: ExtractedElement[] = [];
  const buttons: Array<{
    id: string;
    text: string;
    ariaLabel?: string;
    isPrimary?: boolean;
    computedStyle?: { fontSize: string; color: string; backgroundColor: string; opacity: string };
  }> = [];
  const links: Array<{ id: string; text: string; href?: string }> = [];
  const formControls: ExtractedFormControl[] = [];
  const prices: ExtractedPrice[] = [];
  const discounts: ExtractedDiscount[] = [];
  const timers: ExtractedTimer[] = [];
  const modals: Array<{ id: string; title: string; content: string; hasCloseButton: boolean }> = [];

  const seenTextIds = new Set<string>();
  const seenPriceIds = new Set<string>();
  const seenDiscountIds = new Set<string>();
  const seenTimerIds = new Set<string>();
  const textOccurrenceCount = new Map<string, number>();

  const truncationReasons: string[] = [];

  // Timer format regex covering: 04:59, 12m 30s, 02h 15m 30s, 2h 15m, ends in ..., sale ends in ..., order within ...
  const timerPattern = /(?:\b(?:\d{1,2}:\d{2}(?::\d{2})?|\d{1,2}\s*m(?:in)?\s*\d{1,2}\s*s)\b|\b\d{1,2}\s*h(?:rs?)?\s*(?::|\s)\s*\d{1,2}\s*m|\bends\s+in\s+\d+|\bsale\s+ends\s+in\b|\border\s+within\s+(?:the\s+next\s+)?\d+)/i;

  // =========================================================================
  // PASS 1: Interactive Elements (Buttons, Forms, Modals, Links, Cookie Banner)
  // =========================================================================

  // 1a. Interactive buttons & CTA controls
  const buttonEls = Array.from(document.querySelectorAll<HTMLElement>(
    'button, [role="button"], input[type="submit"], input[type="button"], a.btn, a.button, [class*="btn" i]'
  ));
  if (buttonEls.length > EXTRACTION_LIMITS.maxButtons) {
    truncationReasons.push(`Buttons collection reached limit (${EXTRACTION_LIMITS.maxButtons} of ${buttonEls.length} candidates extracted).`);
  }
  for (const btn of buttonEls.slice(0, EXTRACTION_LIMITS.maxButtons)) {
    if (!isElementVisible(btn)) continue;
    const rawText = btn.innerText || btn.textContent || btn.getAttribute('aria-label') || btn.getAttribute('title') || btn.getAttribute('value') || '';
    const text = normalizeText(rawText);
    if (!text) continue;

    const id = getOrCreateElementId(btn);
    const style = window.getComputedStyle(btn);
    const isPrimary = btn.classList.contains('primary') || /primary|btn-main|submit|checkout/i.test(safeClassName(btn));

    buttons.push({
      id,
      text,
      ariaLabel: btn.getAttribute('aria-label') || btn.getAttribute('title') || undefined,
      isPrimary,
      computedStyle: {
        fontSize: style.fontSize,
        color: style.color,
        backgroundColor: style.backgroundColor,
        opacity: style.opacity
      }
    });
  }

  // 1b. Form controls: checkboxes & radios (STRICTLY ignoring sensitive inputs)
  const inputEls = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="checkbox"], input[type="radio"]'));
  if (inputEls.length > EXTRACTION_LIMITS.maxFormControls) {
    truncationReasons.push(`Form controls reached limit (${EXTRACTION_LIMITS.maxFormControls} of ${inputEls.length} candidates extracted).`);
  }
  for (const input of inputEls.slice(0, EXTRACTION_LIMITS.maxFormControls)) {
    const name = input.name || input.id || '';
    if (isSensitiveField(name)) continue;

    const id = getOrCreateElementId(input);
    let label = '';
    if (input.labels && input.labels.length > 0) {
      label = normalizeText(input.labels[0].innerText || input.labels[0].textContent || '');
    } else if (input.parentElement) {
      label = normalizeText(input.parentElement.innerText || input.parentElement.textContent || '');
    }
    label = label || input.getAttribute('aria-label') || input.getAttribute('title') || name;

    formControls.push({
      id,
      type: input.type,
      label,
      checked: input.checked,
      required: input.required,
      isPreselected: input.defaultChecked || input.checked
    });
  }

  // 1c. Modals and Dialogs
  const modalEls = Array.from(document.querySelectorAll<HTMLElement>(
    '[role="dialog"], dialog[open], .modal.show, .modal.active, .popup.visible, [data-modal="true"]'
  ));
  for (const mod of modalEls.slice(0, EXTRACTION_LIMITS.maxModals)) {
    const id = getOrCreateElementId(mod);
    const titleEl = mod.querySelector('h1, h2, h3, h4, .modal-title, .title');
    const title = normalizeText(titleEl ? ((titleEl as HTMLElement).innerText || titleEl.textContent || '') : '');
    const content = normalizeText(mod.innerText || mod.textContent || '').slice(0, 400);
    const closeBtn = mod.querySelector('button[aria-label*="close" i], .close, .btn-close, [data-dismiss="modal"]');

    modals.push({
      id,
      title: title || 'Dialog',
      content,
      hasCloseButton: closeBtn !== null
    });
  }

  // 1d. Links (prioritize cancellation, terms, guest checkout, privacy, policy)
  const allLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'));
  const priorityLinks = allLinks.filter(l => {
    const t = (l.textContent || '' + l.getAttribute('aria-label') || '' + l.getAttribute('title') || '').toLowerCase();
    return /cancel|terms|policy|privacy|unsubscribe|guest|return|refund/i.test(t);
  });
  const normalLinks = allLinks.filter(l => !priorityLinks.includes(l));
  const linkCandidates = [...priorityLinks, ...normalLinks].slice(0, EXTRACTION_LIMITS.maxLinks);

  for (const link of linkCandidates) {
    if (!isElementVisible(link)) continue;
    const text = normalizeText(link.innerText || link.textContent || link.getAttribute('aria-label') || link.getAttribute('title') || '');
    if (!text) continue;
    const id = getOrCreateElementId(link);
    links.push({
      id,
      text,
      href: link.getAttribute('href') || undefined
    });
  }

  // 1e. Cookie Banner Detection
  let cookiesBanner: ExtractedContent['cookiesBanner'] | undefined;
  const cookieBannerEl = document.querySelector<HTMLElement>(
    '#onetrust-banner-sdk, .cookie-banner, #cookie-banner, [aria-label*="cookie" i], .cc-banner, .cookie-consent'
  );
  if (cookieBannerEl && isElementVisible(cookieBannerEl)) {
    const id = getOrCreateElementId(cookieBannerEl);
    const acceptBtn = cookieBannerEl.querySelector<HTMLElement>('button[id*="accept" i], button[class*="accept" i], button:not([class*="reject" i])');
    const rejectBtn = cookieBannerEl.querySelector<HTMLElement>('button[id*="reject" i], button[class*="reject" i], button[id*="decline" i]');
    const manageBtn = cookieBannerEl.querySelector<HTMLElement>('button[id*="settings" i], button[class*="manage" i], a[href*="cookie"]');

    cookiesBanner = {
      id,
      acceptButtonId: acceptBtn ? getOrCreateElementId(acceptBtn) : undefined,
      rejectButtonId: rejectBtn ? getOrCreateElementId(rejectBtn) : undefined,
      acceptText: acceptBtn ? normalizeText(acceptBtn.innerText || acceptBtn.textContent || '') : 'Accept All',
      rejectText: rejectBtn ? normalizeText(rejectBtn.innerText || rejectBtn.textContent || '') : undefined,
      hasReject: rejectBtn !== null,
      hasManage: manageBtn !== null
    };
  }

  // 1f. Accessible Iframe Inspection
  let accessibleIframesCount = 0;
  let inaccessibleIframesCount = 0;
  try {
    const iframeEls = Array.from(document.querySelectorAll<HTMLIFrameElement>('iframe'));
    for (const iframe of iframeEls.slice(0, EXTRACTION_LIMITS.maxIframesInspected)) {
      try {
        const iframeDoc = iframe.contentDocument;
        if (iframeDoc && iframeDoc.body) {
          accessibleIframesCount++;
          const iframeContent = Array.from(iframeDoc.querySelectorAll<HTMLElement>('p, span, h1, h2, h3, button, a')).slice(0, 15);
          for (const el of iframeContent) {
            if (!isElementVisible(el)) continue;
            const raw = el.innerText || el.textContent || '';
            const text = normalizeText(raw);
            if (!text || text.length < 2 || text.length > 350) continue;
            const id = getOrCreateElementId(el);
            if (!seenTextIds.has(id)) {
              seenTextIds.add(id);
              visibleTexts.push({
                id,
                tag: `iframe:${el.tagName.toLowerCase()}`,
                text,
                fontSize: 14,
                color: '#333'
              });
            }
          }
        } else {
          inaccessibleIframesCount++;
        }
      } catch {
        // Cross-origin iframe security restriction
        inaccessibleIframesCount++;
      }
    }
  } catch {
    // Iframes query error
  }

  if (inaccessibleIframesCount > 0) {
    truncationReasons.push(`${inaccessibleIframesCount} cross-origin iframe(s) could not be inspected due to browser security restrictions.`);
  }

  // =========================================================================
  // PASS 2: Dedicated Whole-DOM Targeted Scans (Timers, Prices, Discounts)
  // Ensures essential e-commerce elements are NEVER choked by header navigation divs!
  // =========================================================================

  // 2a. Dedicated Timer Scan
  const timerEls = Array.from(document.querySelectorAll<HTMLElement>(
    '[class*="timer" i], [class*="countdown" i], [class*="clock" i], [id*="timer" i], [id*="countdown" i], [data-timer], time, [class*="deal-timer" i]'
  ));
  for (const el of timerEls.slice(0, EXTRACTION_LIMITS.maxTimers)) {
    if (!isElementVisible(el)) continue;
    const text = normalizeText(el.innerText || el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || '');
    if (!text || text.length > 120) continue;
    const id = getOrCreateElementId(el);
    if (!seenTimerIds.has(id) && timerPattern.test(text)) {
      seenTimerIds.add(id);
      timers.push({ id, text, isTicking: true });
    }
  }

  // 2b. Dedicated Price & Cross-Out Scan
  const priceEls = Array.from(document.querySelectorAll<HTMLElement>(
    '.price, [class*="price" i], [data-price], [itemprop="price"], [class*="mrp" i], [class*="strike" i], del, s, strike, [class*="original-price" i], [class*="crossed" i], [class*="was-price" i], [class*="regular-price" i], [class*="sale-price" i]'
  ));
  if (priceEls.length > EXTRACTION_LIMITS.maxPrices) {
    truncationReasons.push(`Prices collection reached limit (${EXTRACTION_LIMITS.maxPrices} of ${priceEls.length} candidates extracted).`);
  }
  for (const el of priceEls.slice(0, EXTRACTION_LIMITS.maxPrices)) {
    if (!isElementVisible(el)) continue;
    const text = normalizeText(el.innerText || el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || '');
    if (!text || text.length > 50) continue;
    const id = getOrCreateElementId(el);
    if (seenPriceIds.has(id)) continue;

    const priceObj = parsePrice(text, id);
    if (priceObj) {
      seenPriceIds.add(id);
      const style = window.getComputedStyle(el);
      const parentEl = el.parentElement;
      const isCrossed =
        style.textDecoration.includes('line-through') ||
        style.textDecorationLine?.includes('line-through') ||
        el.tagName === 'DEL' ||
        el.tagName === 'S' ||
        el.tagName === 'STRIKE' ||
        /(?:strike|mrp|original|crossed|was-price|regular-price|del|line-through)/i.test(safeClassName(el)) ||
        Boolean(parentEl && (parentEl.tagName === 'DEL' || parentEl.tagName === 'S' || /(?:strike|mrp|original|crossed|was-price)/i.test(safeClassName(parentEl))));

      prices.push({
        ...priceObj,
        isCrossedOut: isCrossed
      });
    }
  }

  // 2c. Dedicated Discount Scan & Contextual Container Price Linking
  const discountEls = Array.from(document.querySelectorAll<HTMLElement>(
    '[class*="discount" i], [class*="save" i], [class*="off" i], [class*="deal" i], [class*="saving" i], [class*="badge" i], .badge'
  ));
  for (const el of discountEls.slice(0, EXTRACTION_LIMITS.maxDiscounts)) {
    if (!isElementVisible(el)) continue;
    const text = normalizeText(el.innerText || el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || '');
    if (!text || text.length > 80) continue;
    const id = getOrCreateElementId(el);
    if (seenDiscountIds.has(id)) continue;

    const discountObj = parseDiscountClaim(text, id);
    if (discountObj) {
      seenDiscountIds.add(id);

      // Search up the DOM tree for a realistic product or pricing container (avoiding immediate single-wrapper divs)
      const container = el.closest(
        '[data-component-type*="product"], [class*="product" i], [class*="item" i], [class*="card" i], [class*="pdp" i], [class*="pricing" i], [class*="offer" i], form, tr, li, section, article'
      );
      if (container) {
        const containerPrices = Array.from(container.querySelectorAll<HTMLElement>('.price, [class*="price" i], [class*="mrp" i], [class*="strike" i], del, s, strike, span, p'))
          .map(elem => {
            const pText = normalizeText(elem.innerText || elem.textContent || '');
            const p = parsePrice(pText, getOrCreateElementId(elem));
            if (!p) return null;
            const eStyle = window.getComputedStyle(elem);
            const isCrossed = eStyle.textDecoration.includes('line-through') || elem.tagName === 'DEL' || elem.tagName === 'S' || /(?:strike|mrp|original)/i.test(safeClassName(elem));
            return { ...p, isCrossedOut: isCrossed };
          })
          .filter((p): p is ExtractedPrice & { isCrossedOut: boolean } => p !== null && p.value > 0);

        const crossed = containerPrices.find(p => p.isCrossedOut);
        const regular = containerPrices.find(p => !p.isCrossedOut && (!crossed || p.id !== crossed.id));

        if (crossed && regular) {
          discountObj.originalPrice = crossed.value;
          discountObj.salePrice = regular.value;
          discountObj.currency = crossed.currency || regular.currency;
        }
      }

      discounts.push(discountObj);
    }
  }

  // =========================================================================
  // PASS 3: Semantic Content Elements & Dedicated Dark Pattern Targets
  // Captures headings, paragraphs, fine print, fees, stock notices below the fold
  // =========================================================================

  // Dedicated query targeting priority elements first: urgency, scarcity, fees, cancellation terms
  const priorityTargetEls = Array.from(document.querySelectorAll<HTMLElement>(
    '[class*="stock" i], [id*="stock" i], [class*="urgency" i], [id*="urgency" i], [class*="scarcity" i], [id*="scarcity" i], [class*="inventory" i], [id*="inventory" i], [class*="hurry" i], [id*="hurry" i], [class*="viewer" i], [id*="viewer" i], [class*="fee" i], [id*="fee" i], [class*="charge" i], [id*="charge" i], [class*="surcharge" i], [id*="surcharge" i], [class*="terms" i], [id*="terms" i], [class*="fine" i], [id*="fine" i], [class*="legal" i], [id*="legal" i], [class*="disclaimer" i], [id*="disclaimer" i], [class*="cancel" i], [id*="cancel" i], [class*="alert" i], [id*="alert" i], [class*="notice" i], [id*="notice" i], [class*="banner" i], [id*="banner" i]'
  ));

  // Semantic text elements across the whole document DOM (including below-the-fold leaf divs, tables, headers, paragraphs)
  const semanticContentEls = Array.from(document.querySelectorAll<HTMLElement>(
    'p, span, a, h1, h2, h3, h4, h5, h6, li, td, th, strong, b, em, small, label, del, s, strike, blockquote, dt, dd, figcaption, div'
  ));

  const rawCandidates = [...priorityTargetEls, ...semanticContentEls];
  const totalElementsQueried = rawCandidates.length;

  if (rawCandidates.length > EXTRACTION_LIMITS.maxRawCandidates) {
    truncationReasons.push(`Page DOM contains ${rawCandidates.length} text candidates. Buffer safely evaluated first ${EXTRACTION_LIMITS.maxRawCandidates} elements.`);
  }

  for (const el of rawCandidates.slice(0, EXTRACTION_LIMITS.maxRawCandidates)) {
    // For container elements (DIV, SECTION, ARTICLE), check if they contain block-level children
    if (el.tagName === 'DIV' || el.tagName === 'SECTION' || el.tagName === 'ARTICLE') {
      const hasBlockChildren = Array.from(el.children).some(child =>
        /^(DIV|SECTION|ARTICLE|MAIN|HEADER|FOOTER|NAV|ASIDE|UL|OL|LI|TABLE|P|H[1-6])$/i.test(child.tagName)
      );
      if (hasBlockChildren) {
        // If container has block-level children, only extract if it has direct text content
        const directText = Array.from(el.childNodes)
          .filter(n => n.nodeType === 3)
          .map(n => n.textContent?.trim() || '')
          .join(' ');
        if (directText.length < 3) continue;
      }
    }
    if (!isElementVisible(el)) continue;

    const raw = el.innerText || el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || '';
    const text = normalizeText(raw);
    if (!text || text.length < 2 || text.length > 350) continue;

    // Deduplicate repeated identical text phrases (keep at most 3 occurrences of identical text)
    const normKey = text.toLowerCase();
    const count = textOccurrenceCount.get(normKey) || 0;
    if (count >= 3) continue;
    textOccurrenceCount.set(normKey, count + 1);

    const id = getOrCreateElementId(el);
    if (seenTextIds.has(id)) continue;
    seenTextIds.add(id);

    const style = window.getComputedStyle(el);
    const fontSize = parseFloat(style.fontSize) || 16;

    visibleTexts.push({
      id,
      tag: el.tagName.toLowerCase(),
      text,
      fontSize,
      color: style.color,
      backgroundColor: style.backgroundColor
    });

    // Check timer format if not already captured
    if (!seenTimerIds.has(id) && timerPattern.test(text)) {
      seenTimerIds.add(id);
      timers.push({ id, text, isTicking: true });
    }

    // Check price format if not already captured
    if (!seenPriceIds.has(id)) {
      const priceObj = parsePrice(text, id);
      if (priceObj) {
        seenPriceIds.add(id);
        const parentEl = el.parentElement;
        const isCrossed =
          style.textDecoration.includes('line-through') ||
          style.textDecorationLine?.includes('line-through') ||
          el.tagName === 'DEL' ||
          el.tagName === 'S' ||
          el.tagName === 'STRIKE' ||
          /(?:strike|mrp|original|crossed|was-price|regular-price|del|line-through)/i.test(safeClassName(el)) ||
          Boolean(parentEl && (parentEl.tagName === 'DEL' || parentEl.tagName === 'S' || /(?:strike|mrp|original|crossed|was-price)/i.test(safeClassName(parentEl))));

        prices.push({ ...priceObj, isCrossedOut: isCrossed });
      }
    }

    // Check discount format if not already captured
    if (!seenDiscountIds.has(id)) {
      const discountObj = parseDiscountClaim(text, id);
      if (discountObj) {
        seenDiscountIds.add(id);
        discounts.push(discountObj);
      }
    }

    if (visibleTexts.length >= EXTRACTION_LIMITS.maxVisibleTexts) {
      truncationReasons.push(`Visible texts reached maximum limit (${EXTRACTION_LIMITS.maxVisibleTexts} elements).`);
      break;
    }
  }

  const totalCharactersExtracted = visibleTexts.reduce((acc, t) => acc + t.text.length, 0);

  const pageUrl = typeof window !== 'undefined' ? window.location.href : 'http://localhost';
  const pageDomain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const pageTitle = typeof document !== 'undefined' ? (document.title || pageDomain) : pageDomain;

  const contentFingerprint = computeContentFingerprint(
    pageUrl,
    pageTitle,
    visibleTexts,
    prices,
    timers
  );

  const isTruncated = truncationReasons.length > 0;

  const extractionCoverage: ExtractionCoverage = {
    isTruncated,
    truncationReasons,
    totalDomElementsQueried: totalElementsQueried,
    totalCharactersExtracted,
    scrollPassCompleted: Boolean(options?.scrollPassCompleted),
    inaccessibleIframesCount,
    accessibleIframesCount,
    contentFingerprint,
    snapshotTimestamp: Date.now(),
    limitsApplied: {
      maxTexts: EXTRACTION_LIMITS.maxVisibleTexts,
      maxButtons: EXTRACTION_LIMITS.maxButtons,
      maxLinks: EXTRACTION_LIMITS.maxLinks,
      maxPrices: EXTRACTION_LIMITS.maxPrices,
      maxDiscounts: EXTRACTION_LIMITS.maxDiscounts,
      maxTimers: EXTRACTION_LIMITS.maxTimers,
      maxFormControls: EXTRACTION_LIMITS.maxFormControls
    }
  };

  // Trace debug logs for live developer inspection
  console.log(`[ClearChoice AI Trace] DOM Extraction: ${totalElementsQueried} DOM elements queried, ${visibleTexts.length} visible elements extracted (${totalCharactersExtracted} chars). Fingerprint: ${contentFingerprint}`);
  if (isTruncated) {
    console.warn('[ClearChoice AI Trace] DOM Extraction notes:', truncationReasons);
  }

  return {
    url: pageUrl,
    domain: pageDomain,
    title: pageTitle,
    timestamp: Date.now(),
    visibleTexts,
    buttons,
    links,
    formControls,
    prices,
    discounts,
    timers,
    modals,
    cookiesBanner,
    isTruncated,
    totalElementsQueried,
    totalCharactersExtracted,
    contentFingerprint,
    inaccessibleIframesCount,
    accessibleIframesCount,
    extractionCoverage
  };
}

/**
 * Performs a safe, bounded scroll pass to trigger lazy-loaded below-the-fold content,
 * restores the user's original scroll coordinates, and extracts the full current-page DOM.
 * NEVER clicks buttons, NEVER submits forms, and NEVER performs financial or account actions.
 */
export async function scrollAndCollectPageContent(options?: { enableScroll?: boolean; forceScroll?: boolean }): Promise<ExtractedContent> {
  const isJsdom = typeof navigator !== 'undefined' && navigator.userAgent.includes('jsdom');
  const canScroll = typeof window !== 'undefined' && typeof window.scrollTo === 'function' && (!isJsdom || Boolean(options?.forceScroll)) && options?.enableScroll !== false;

  if (!canScroll) {
    return extractPageContent({ scrollPassCompleted: false });
  }

  const origX = window.scrollX || 0;
  const origY = window.scrollY || 0;
  let scrollPassCompleted = false;

  try {
    const scrollHeight = Math.min(document.documentElement?.scrollHeight || document.body?.scrollHeight || 0, 5000);
    const viewportHeight = window.innerHeight || 800;

    if (scrollHeight > viewportHeight * 1.3) {
      // Bounded step 1: 50% scroll
      window.scrollTo({ top: Math.round(scrollHeight * 0.5), behavior: 'instant' as any });
      await new Promise(r => setTimeout(r, 120));

      // Bounded step 2: near bottom (max 5000px)
      window.scrollTo({ top: Math.max(0, scrollHeight - viewportHeight), behavior: 'instant' as any });
      await new Promise(r => setTimeout(r, 120));

      scrollPassCompleted = true;
    }
  } catch (err) {
    console.warn('[ClearChoice AI Trace] Safe scroll pass encounter:', err);
  } finally {
    // Guaranteed restoration of original viewport position
    try {
      window.scrollTo({ top: origY, left: origX, behavior: 'instant' as any });
    } catch {
      // ignore
    }
  }

  return extractPageContent({ scrollPassCompleted });
}
