
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { extractPageContent } from '../../src/content/dom-extractor';
import { analyzeWebpageContent } from '../../src/analysis/analyzer';
import { highlightElementOnPage, removeActiveHighlight } from '../../src/content/element-highlighter';
import { DEFAULT_SETTINGS } from '../../src/services/storage';

describe('Real Website Live DOM Scanning & Detection Tests', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    removeActiveHighlight();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    removeActiveHighlight();
  });

  it('scans real e-commerce checkout page with sneaking, confirmshaming, and countdown timer', async () => {
    // Simulate real e-commerce checkout webpage DOM
    document.title = 'Order Review & Payment | TrendBoutique';
    document.body.innerHTML = `
      <header><h1>Review Your Order</h1></header>
      <main>
        <div class="cart-items">
          <p>Product: Premium Noise-Cancelling Headphones ($199.00)</p>
        </div>
        <div class="timer-box">
          <p class="text-urgent">Hurry! Your reserved cart expires in 04:59!</p>
        </div>
        <div class="warranty-upsell">
          <label>
            <input type="checkbox" id="warranty-opt" checked name="warranty_preselected" />
            Add 2-Year Extended Protection Plan for $29.99
          </label>
        </div>
        <div class="checkout-actions">
          <button class="btn btn-primary" id="btn-pay-now" style="font-size: 18px; background-color: #2563eb; color: #ffffff;">
            Proceed to Secure Payment
          </button>
          <a href="/cart" id="lnk-decline" style="font-size: 11px; color: #94a3b8;">
            No thanks, I prefer losing out on full coverage
          </a>
        </div>
      </main>
    `;

    // 1. Extract content from live DOM
    const content = extractPageContent();
    expect(content.title).toContain('TrendBoutique');
    expect(content.timers.length).toBeGreaterThan(0);
    expect(content.formControls.some(fc => fc.checked && fc.isPreselected)).toBe(true);

    // 2. Run detection pipeline
    const result = await analyzeWebpageContent(content, {
      settings: { ...DEFAULT_SETTINGS, aiAssisted: false }
    });

    expect(result.scanStatus).toBe('completed');
    expect(result.findings.length).toBeGreaterThanOrEqual(2);
    expect(result.riskScore).toBeGreaterThan(30);

    // Verify confirmshaming detected from real DOM
    const confirmshame = result.findings.find(f => f.category === 'confirmshaming');
    expect(confirmshame).toBeDefined();
    expect(confirmshame?.evidence).toContain('prefer losing out');

    // 3. Test element highlighting on live DOM
    if (confirmshame?.elementId) {
      const hlResult = highlightElementOnPage(
        confirmshame.elementId,
        confirmshame.title,
        confirmshame.categoryName
      );
      expect(hlResult.success).toBe(true);
      expect(document.querySelector('.clearchoice-highlight-overlay')).not.toBeNull();

      removeActiveHighlight();
      expect(document.querySelector('.clearchoice-highlight-overlay')).toBeNull();
    }
  });

  it('scans real travel flight booking page with scarcity and drip pricing', async () => {
    // Simulate real travel booking DOM
    document.title = 'Select Flight - SkyWanderer Airlines';
    document.body.innerHTML = `
      <div class="flight-results">
        <h2>San Francisco to Tokyo Haneda</h2>
        <div class="flight-card">
          <p class="scarcity-warning text-red">Only 2 seats left at this price! 14 travelers are viewing this right now!</p>
          <span class="price-strike"><del>$1,250</del></span>
          <span class="price-current">$840</span>
          <p class="discount-badge">Save 33% today only</p>
        </div>
        <div class="seat-selection">
          <label>
            <input type="checkbox" name="seat_upgrade" checked />
            Reserve Standard Seat Selection (+$45.00 auto-added)
          </label>
        </div>
        <button class="primary-btn" id="btn-continue">Book Now</button>
      </div>
    `;

    const content = extractPageContent();
    const result = await analyzeWebpageContent(content, {
      settings: { ...DEFAULT_SETTINGS, aiAssisted: false }
    });

    expect(result.findings.length).toBeGreaterThanOrEqual(2);
    const scarcityFinding = result.findings.find(f => f.category === 'scarcity' || f.category === 'social_proof');
    expect(scarcityFinding).toBeDefined();
    expect(result.riskScore).toBeGreaterThan(25);
  });

  it('scans real subscription software page with roach motel and hidden terms', async () => {
    // Simulate SaaS / software subscription page
    document.title = 'Pro Design Suite - 14-Day Free Trial';
    document.body.innerHTML = `
      <div class="pricing-container">
        <h1>Start Free 14-Day Trial</h1>
        <p>No upfront charge today.</p>
        <div class="hidden-terms" style="font-size: 8px; color: #94a3b8;">
          Subscription renews automatically at full price of $89.99/month unless cancelled. Cancellation only by phone between 9 AM and 11 AM EST.
        </div>
        <div class="consent">
          <label>
            <input type="checkbox" name="opt_in_marketing" checked />
            Send me promotional marketing emails and share my data with third-party partners
          </label>
        </div>
        <button id="start-trial" class="primary submit">Start My Free Trial</button>
      </div>
    `;

    const content = extractPageContent();
    const result = await analyzeWebpageContent(content, {
      settings: { ...DEFAULT_SETTINGS, aiAssisted: false }
    });

    expect(result.findings.length).toBeGreaterThanOrEqual(2);
    const roachMotelFinding = result.findings.find(
      f => f.category === 'cancellation' || f.category === 'subscriptions' || f.category === 'preselected_options'
    );
    expect(roachMotelFinding).toBeDefined();
    expect(result.riskScore).toBeGreaterThan(25);
  });

  it('gracefully handles clean sites and restricted internal pages without throwing', async () => {
    // Clean documentation / blog page
    document.title = 'Introduction to Web Standards - Open Web Docs';
    document.body.innerHTML = `
      <article>
        <h1>Web Standards and Accessibility</h1>
        <p>Web standards are blueprints that define best practices for HTML, CSS, and modern APIs.</p>
        <p>They provide interoperability across platforms and user agents.</p>
        <a href="/resources">Read documentation</a>
      </article>
    `;

    const content = extractPageContent();
    const result = await analyzeWebpageContent(content, {
      settings: { ...DEFAULT_SETTINGS, aiAssisted: false }
    });

    expect(result.findings.length).toBe(0);
    expect(result.riskScore).toBe(0);
    expect(result.riskLevel).toBe('LOW RISK');
  });

  it('handles missing element highlighting with exact required limitation message', () => {
    // Attempting to highlight an element that no longer exists in DOM
    const hlResult = highlightElementOnPage('non-existent-element-id', 'Test Title', 'Fake Urgency');
    expect(hlResult.success).toBe(false);
    expect(hlResult.message).toBe('The original element could not be located. The evidence was collected during an earlier observation.');
  });

  it('extracts prices and discounts accurately from modern e-commerce markup (del, sale-price, strike)', () => {
    document.title = 'SoundMax ANC Wireless Headphones | MegaDeals';
    document.body.innerHTML = `
      <div class="product-page">
        <h1 class="product-title">SoundMax ANC Wireless Headphones</h1>
        <div class="price-container">
          <del class="original-price">$299.00</del>
          <span class="sale-price">$149.00</span>
          <span class="discount-percent">50% off</span>
        </div>
        <p class="scarcity">Only 3 left in stock - order soon.</p>
      </div>
    `;

    const content = extractPageContent();
    expect(content.prices.length).toBeGreaterThanOrEqual(2);
    expect(content.prices.some(p => p.isCrossedOut && p.value === 299)).toBe(true);
    expect(content.prices.some(p => !p.isCrossedOut && p.value === 149)).toBe(true);
    expect(content.discounts.some(d => d.claimedPercent === 50)).toBe(true);
  });

  it('scans the Grounded Dark Patterns Laboratory test page and detects all 6 target deceptive categories', async () => {
    document.title = 'ClearChoice AI - Grounded Dark Patterns Test Laboratory';
    document.body.innerHTML = `
      <main>
        <!-- 1. Urgency -->
        <section id="urgency-container">
          <div class="timer-display" id="flash-sale-timer">Sale ends in 02h 15m 30s</div>
          <div class="urgency-text">Hurry! Flash sale ends today! Buy now before time runs out!</div>
        </section>

        <!-- 2. Scarcity -->
        <section id="scarcity-container">
          <div id="scarcity-stock-msg">Hurry, only 2 items left in stock - selling fast!</div>
          <div id="scarcity-viewer-msg">38 people are viewing this product right now!</div>
        </section>

        <!-- 3. Misleading Discount -->
        <section id="discount-product-card" class="product-card">
          <span class="sale-price" id="pdp-current-price">₹4,000</span>
          <del class="original-price strike" id="pdp-mrp-price">₹5,000</del>
          <span class="discount-badge" id="pdp-claimed-discount">60% OFF</span>
        </section>

        <!-- 4. Hidden Charges -->
        <section id="checkout-fee-box">
          <table>
            <tbody>
              <tr><td>Cart Subtotal</td><td>₹1,200.00</td></tr>
              <tr><td id="fee-platform">Mandatory Platform Fee</td><td>₹50.00</td></tr>
              <tr><td id="fee-handling">Handling Fee Applied</td><td>₹35.00</td></tr>
            </tbody>
          </table>
        </section>

        <!-- 5. Forced Sign-Up -->
        <section id="signup-container">
          <div>✓ Continue as guest available for fast checkout</div>
          <div id="enforce-password-text">
            Account creation is mandatory to complete purchase. Password required to complete.
          </div>
        </section>

        <!-- 6. Difficult Cancellation -->
        <section id="cancellation-container">
          <div id="cancellation-offline-barrier">
            Cancellation only by phone. You must call to cancel by speaking with a representative at 1-800-555-0199.
          </div>
          <button id="btn-keep-sub">Don't cancel and keep my membership</button>
        </section>
      </main>
    `;

    // 1. Extract content from DOM
    const content = extractPageContent();
    expect(content.timers.length).toBeGreaterThanOrEqual(1);
    expect(content.prices.length).toBeGreaterThanOrEqual(2);
    expect(content.discounts.length).toBeGreaterThanOrEqual(1);

    // 2. Run analysis
    const result = await analyzeWebpageContent(content, {
      settings: { ...DEFAULT_SETTINGS, aiAssisted: false, ruleBased: true }
    });

    // Verify all 6 categories were evaluated and detected
    const detectedCategories = result.findings.map(f => f.category);
    expect(detectedCategories).toContain('urgency');
    expect(detectedCategories).toContain('scarcity');
    expect(detectedCategories).toContain('discounts');
    expect(detectedCategories).toContain('hidden_charges');
    expect(detectedCategories).toContain('forced_signup');
    expect(detectedCategories).toContain('cancellation');

    // Verify mathematical discount discrepancy was correctly verified
    const discountFinding = result.findings.find(f => f.category === 'discounts');
    expect(discountFinding).toBeDefined();
    expect(discountFinding?.classification).toBe('verified_deceptive');
    expect(discountFinding?.evidence).toContain('60% off');

    // Verify cancellation roach motel was verified
    const cancelFinding = result.findings.find(f => f.category === 'cancellation');
    expect(cancelFinding).toBeDefined();
    expect(cancelFinding?.classification).toBe('verified_deceptive');

    // Verify high risk score
    expect(result.riskScore).toBeGreaterThanOrEqual(50);
    expect(['HIGH RISK', 'VERY HIGH RISK']).toContain(result.riskLevel);

    // Verify Scan Diagnostics object
    expect(result.diagnostics).toBeDefined();
    expect(result.diagnostics?.extractedStats.totalDomElementsQueried).toBeGreaterThan(0);
    expect(result.diagnostics?.detectors.length).toBeGreaterThanOrEqual(6);
    expect(result.diagnostics?.detectors.every(d => d.ran)).toBe(true);
  });
});

