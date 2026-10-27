interface HighlightState {
  element: HTMLElement;
  originalOutline: string;
  originalBoxShadow: string;
  originalTransition: string;
  badgeEl?: HTMLElement;
}

let activeHighlight: HighlightState | null = null;

export function removeActiveHighlight(): void {
  if (activeHighlight) {
    const { element, originalOutline, originalBoxShadow, originalTransition, badgeEl } = activeHighlight;
    try {
      element.style.outline = originalOutline;
      element.style.boxShadow = originalBoxShadow;
      element.style.transition = originalTransition;
      if (badgeEl && badgeEl.parentElement) {
        badgeEl.parentElement.removeChild(badgeEl);
      }
    } catch {
      // ignore DOM detachment
    }
    activeHighlight = null;
  }
}

export function highlightElementOnPage(
  elementId: string,
  findingTitle: string,
  categoryName: string
): { success: boolean; message?: string } {
  removeActiveHighlight();

  let el = document.querySelector<HTMLElement>(`[data-clearchoice-id="${elementId}"]`);
  if (!el && elementId) {
    el = document.getElementById(elementId);
  }
  if (!el) {
    return {
      success: false,
      message: 'The original element could not be located. The evidence was collected during an earlier observation.'
    };
  }

  // Preserve previous styles
  const originalOutline = el.style.outline;
  const originalBoxShadow = el.style.boxShadow;
  const originalTransition = el.style.transition;

  // Apply prominent security highlight
  el.style.transition = 'outline 0.2s ease, box-shadow 0.2s ease';
  el.style.outline = '3px solid #ea580c';
  el.style.boxShadow = '0 0 16px rgba(234, 88, 12, 0.45)';

  // Scroll into view if supported
  if (typeof el.scrollIntoView === 'function') {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Create floating annotation badge
  const badge = document.createElement('div');
  badge.className = 'clearchoice-highlight-overlay';
  badge.setAttribute('data-clearchoice-ui', 'true');
  badge.style.position = 'absolute';
  badge.style.zIndex = '2147483647';
  badge.style.backgroundColor = '#0f172a';
  badge.style.color = '#ffffff';
  badge.style.padding = '6px 12px';
  badge.style.borderRadius = '6px';
  badge.style.fontSize = '12px';
  badge.style.fontWeight = '600';
  badge.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  badge.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
  badge.style.display = 'flex';
  badge.style.alignItems = 'center';
  badge.style.gap = '8px';
  badge.style.maxWidth = '320px';
  badge.style.lineHeight = '1.3';

  // Badge content
  badge.innerHTML = `
    <span style="color: #ea580c;">⚠️</span>
    <span style="flex: 1;"><strong>ClearChoice AI:</strong> ${categoryName} — ${findingTitle}</span>
    <button id="cc-dismiss-badge" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:14px;padding:0 2px;">✕</button>
  `;

  // Position badge right above element
  const rect = el.getBoundingClientRect();
  badge.style.top = `${window.scrollY + Math.max(10, rect.top - 36)}px`;
  badge.style.left = `${window.scrollX + Math.max(10, rect.left)}px`;

  document.body.appendChild(badge);

  const dismissBtn = badge.querySelector('#cc-dismiss-badge');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeActiveHighlight();
    });
  }

  activeHighlight = {
    element: el,
    originalOutline,
    originalBoxShadow,
    originalTransition,
    badgeEl: badge
  };

  return { success: true };
}
