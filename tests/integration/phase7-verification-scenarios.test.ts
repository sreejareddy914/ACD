// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { extractPageContent } from '../../src/content/dom-extractor';
import { analyzeWebpageContent } from '../../src/analysis/analyzer';
import { DEFAULT_SETTINGS } from '../../src/services/storage';
import { ExtractedContent } from '../../src/analysis/types';

describe('Phase 7 Verification: 10 Real-World Website Scenarios', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // Scenario 1: Legitimate high-end store (Verified clean, 0/100 LOW RISK, not falsely flagged)
  it('Scenario 1: Legitimate high-end store with honest pricing produces 0/100 LOW RISK', async () => {
    document.title = 'Artisan Leather Goods | Handcrafted Luxury';
    document.body.innerHTML = `
      <header>
        <nav><a href="/">Home</a><a href="/catalog">Bags</a><a href="/about">Our Story</a></nav>
      </header>
      <main>
        <h1>Handcrafted Heritage Weekender</h1>
        <div class="product-pricing">
          <del class="original-price">$500.00</del>
          <span class="current-price">$400.00</span>
          <span class="discount-badge">20% off</span>
        </div>
        <p class="description">Made from vegetable-tanned Italian calfskin leather with brass hardware.</p>
        <div class="returns-policy">
          <p>We offer complimentary 30-day returns and a lifetime warranty on all stitching.</p>
        </div>
        <button class="btn-purchase">Add to Shopping Bag</button>
      </main>
    `;

    const content = extractPageContent();
    const result = await analyzeWebpageContent(content, {
      settings: { ...DEFAULT_SETTINGS, aiAssisted: false, ruleBased: true }
    });

    expect(result.riskScore).toBe(0);
    expect(result.riskLevel).toBe('LOW RISK');
    expect(result.findings).toHaveLength(0);
    expect(result.scanStatus).toBe('completed');
    expect(result.summary).toContain('No significant dark patterns');
  });

  // Scenario 2: Amazon product page with urgency, scarcity, and social proof
  it('Scenario 2: Amazon product page with "Only 2 left in stock" and "Order within 2 hrs 35 mins"', async () => {
    document.title = 'Sony WH-1000XM5 Wireless Headphones | Amazon';
    document.body.innerHTML = `
      <header><div class="nav-belt"><span>Amazon</span><input type="text" /></div></header>
      <main>
        <h1 id="title">Sony WH-1000XM5 Wireless Industry Leading Noise Canceling Headphones</h1>
        <div id="dealBadge"><span class="badge">Limited time deal</span></div>
        <div id="deliveryMessage">Order within 2 hrs 35 mins to get it tomorrow</div>
        <div id="availability">Only 2 left in stock - order soon.</div>
        <div id="socialProof">1K+ bought in past month</div>
        <div id="price">
          <span class="price">$348.00</span>
          <del class="strike">$399.99</del>
        </div>
        <button id="add-to-cart-button">Add to Cart</button>
        <button id="buy-now-button">Buy Now</button>
      </main>
    `;

    const content = extractPageContent();
    expect(content.visibleTexts.length).toBeGreaterThan(0);

    const result = await analyzeWebpageContent(content, {
      settings: { ...DEFAULT_SETTINGS, aiAssisted: false, ruleBased: true }
    });

    expect(result.findings.length).toBeGreaterThanOrEqual(2);
    const categories = result.findings.map(f => f.category);
    expect(categories).toContain('urgency');
    expect(categories).toContain('scarcity');
    expect(result.riskScore).toBeGreaterThanOrEqual(25);
    expect(['MODERATE RISK', 'HIGH RISK']).toContain(result.riskLevel);
  });

  // Scenario 3: Fast-fashion store (Myntra/Shein-style) with large catalogs and multiple tricks
  it('Scenario 3: Fast-fashion store with fake countdown, math discrepancy, and sneak-into-basket add-on', async () => {
    document.title = 'Summer Flash Sale | FashionTrend';
    let fillerNav = '';
    for (let i = 0; i < 40; i++) {
      fillerNav += `<div class="nav-item-${i}"><span>Category ${i}</span></div>`;
    }

    document.body.innerHTML = `
      <header><div class="mega-menu">${fillerNav}</div></header>
      <main>
        <div class="countdown-banner">
          <div class="timer">Sale ends in 01h 15m 00s</div>
        </div>
        <div class="product-card" id="card-dress">
          <h2>Floral Maxi Dress</h2>
          <span class="sale-price">₹2,000</span>
          <del class="original-price">₹3,000</del>
          <span class="discount-badge">65% OFF</span>
        </div>
        <div class="stock-alert">Almost gone - selling out fast!</div>
        <div class="addon-wrap">
          <label>
            <input type="checkbox" id="chk-bag" checked name="packaging_addon" />
            Add Eco Packaging & Priority Delivery for +₹49
          </label>
        </div>
        <button class="checkout-btn">Proceed to Pay</button>
      </main>
    `;

    const content = extractPageContent();
    expect(content.timers.length).toBeGreaterThanOrEqual(1);
    expect(content.prices.length).toBeGreaterThanOrEqual(2);
    expect(content.discounts.length).toBeGreaterThanOrEqual(1);

    const result = await analyzeWebpageContent(content, {
      settings: { ...DEFAULT_SETTINGS, aiAssisted: false, ruleBased: true }
    });

    const categories = result.findings.map(f => f.category);
    expect(categories).toContain('urgency');
    expect(categories).toContain('scarcity');
    expect(categories).toContain('discounts');
    expect(categories).toContain('hidden_charges');

    // Verify arithmetic discrepancy was caught (33% actual vs 65% claimed)
    const discFinding = result.findings.find(f => f.category === 'discounts');
    expect(discFinding?.classification).toBe('verified_deceptive');
    expect(result.riskScore).toBeGreaterThanOrEqual(50);
  });

  // Scenario 4: Travel booking site (Booking/Expedia-style) with viewer pressure and resort fees
  it('Scenario 4: Travel booking site with real-time viewer tickers and mandatory resort fees', async () => {
    document.title = 'Grand Azure Resort & Spa | BookRooms';
    document.body.innerHTML = `
      <main>
        <h1>Deluxe Ocean View Suite</h1>
        <div class="viewer-tag">14 travelers are viewing this property right now</div>
        <div class="stock-tag">Only 1 room left on our site!</div>
        <div class="price-breakdown">
          <div>Room Rate: $220 / night</div>
          <div class="mandatory-fee">Mandatory Resort Fee: $45 per night</div>
        </div>
        <button>Reserve Room</button>
      </main>
    `;

    const content = extractPageContent();
    const result = await analyzeWebpageContent(content, {
      settings: { ...DEFAULT_SETTINGS, aiAssisted: false, ruleBased: true }
    });

    const categories = result.findings.map(f => f.category);
    expect(categories).toContain('scarcity');
    expect(categories).toContain('hidden_charges');
    expect(result.riskScore).toBeGreaterThanOrEqual(25);
  });

  // Scenario 5: Subscription service (Adobe/Gym-style roach motel)
  it('Scenario 5: Subscription service with call-to-cancel barrier and double-negative retention', async () => {
    document.title = 'Account Membership Settings | ProCloud';
    document.body.innerHTML = `
      <main>
        <h1>Manage Plan</h1>
        <p>Pro Creative Cloud Annual Plan</p>
        <div class="cancel-hurdle">
          <p>Online cancellation is unavailable. You must call us to cancel: 1-800-555-9988.</p>
        </div>
        <div class="dialog-actions">
          <button id="stay-btn">Don't cancel and keep my membership</button>
        </div>
      </main>
    `;

    const content = extractPageContent();
    const result = await analyzeWebpageContent(content, {
      settings: { ...DEFAULT_SETTINGS, aiAssisted: false, ruleBased: true }
    });

    const roach = result.findings.find(f => f.category === 'cancellation');
    expect(roach).toBeDefined();
    expect(roach?.classification).toBe('verified_deceptive');
    expect(result.riskScore).toBeGreaterThanOrEqual(35);
  });

  // Scenario 6: Paywall modal without close button (Forced Signup)
  it('Scenario 6: Paywall registration modal without close button', async () => {
    document.title = 'Investigative Report | Daily Tribune';
    document.body.innerHTML = `
      <main>
        <article>
          <h1>The Evolution of City Infrastructure</h1>
          <p>Cities across the globe are modernizing electrical grids and water systems...</p>
        </article>
        <div role="dialog" class="modal show" id="paywall-gate">
          <h2>Create an account to continue reading</h2>
          <p>Sign up now to proceed with unlimited access to all articles.</p>
          <input type="email" placeholder="Enter email" />
          <button>Sign Up Free</button>
        </div>
      </main>
    `;

    const content = extractPageContent();
    expect(content.modals.length).toBeGreaterThanOrEqual(1);
    expect(content.modals[0].hasCloseButton).toBe(false);

    const result = await analyzeWebpageContent(content, {
      settings: { ...DEFAULT_SETTINGS, aiAssisted: false, ruleBased: true }
    });

    const forced = result.findings.find(f => f.category === 'forced_signup');
    expect(forced).toBeDefined();
    expect(forced?.evidence).toContain('Create an account to continue reading');
  });

  // Scenario 7: Multi-currency global shopping site (€, £, ¥, ₹)
  it('Scenario 7: Multi-currency pricing extraction and arithmetic verification across global currencies', async () => {
    document.title = 'Global Flagship Store | Tokyo & Paris';
    document.body.innerHTML = `
      <main>
        <div class="product-eur">
          <del class="mrp">€150.00</del>
          <span class="price">€100.00</span>
          <span class="discount">-50%</span>
        </div>
        <div class="product-jpy">
          <del class="mrp">¥30,000</del>
          <span class="price">¥20,000</span>
          <span class="discount">-33%</span>
        </div>
      </main>
    `;

    const content = extractPageContent();
    expect(content.prices.length).toBeGreaterThanOrEqual(2);
    expect(content.discounts.length).toBeGreaterThanOrEqual(2);

    const result = await analyzeWebpageContent(content, {
      settings: { ...DEFAULT_SETTINGS, aiAssisted: false, ruleBased: true }
    });

    // The EUR product claimed -50%, but 150 -> 100 is only 33% off: math discrepancy!
    const discFinding = result.findings.find(f => f.category === 'discounts');
    expect(discFinding).toBeDefined();
    expect(discFinding?.classification).toBe('verified_deceptive');
  });

  // Scenario 8: Purely static clean informational site
  it('Scenario 8: Static encyclopedia site produces 0/100 LOW RISK without false positives', async () => {
    document.title = 'Photosynthesis - Encyclopedia of Life';
    document.body.innerHTML = `
      <article>
        <h1>Photosynthesis</h1>
        <p>Photosynthesis is a biological process used by plants, algae, and certain bacteria to synthesize nutrients from water and carbon dioxide using sunlight.</p>
        <p>The primary light-absorbing pigment is chlorophyll, located within chloroplasts.</p>
        <ul>
          <li>Light-dependent reactions</li>
          <li>Calvin cycle (Light-independent reactions)</li>
        </ul>
      </article>
    `;

    const content = extractPageContent();
    const result = await analyzeWebpageContent(content, {
      settings: { ...DEFAULT_SETTINGS, aiAssisted: false, ruleBased: true }
    });

    expect(result.riskScore).toBe(0);
    expect(result.riskLevel).toBe('LOW RISK');
    expect(result.findings).toHaveLength(0);
    expect(result.scanStatus).toBe('completed');
  });

  // Scenario 9: Empty/unrendered initial page returns insufficient_evidence
  it('Scenario 9: Unrendered or zero-content page safely returns insufficient_evidence state', async () => {
    document.title = 'App Loading...';
    document.body.innerHTML = ``; // Completely empty DOM before hydration

    const content = extractPageContent();
    const result = await analyzeWebpageContent(content, {
      settings: { ...DEFAULT_SETTINGS, aiAssisted: false, ruleBased: true }
    });

    expect(result.scanStatus).toBe('insufficient_evidence');
    expect(result.summary).toContain('Insufficient readable content extracted');
    expect(result.riskScore).toBe(0);
  });

  // Scenario 10: AI Offline / Quota Exceeded fallback scenario
  it('Scenario 10: Graceful fallback when AI backend is unavailable or quota exceeded', async () => {
    document.title = 'Gadget Store';
    document.body.innerHTML = `
      <main>
        <h1>Smart Speaker</h1>
        <div class="deal-timer">Sale ends in 00:45:00</div>
        <p>High fidelity sound with smart assistant integration.</p>
      </main>
    `;

    const content = extractPageContent();

    // Call analyzer with aiAssisted=true pointing to a non-existent port (offline AI)
    const result = await analyzeWebpageContent(content, {
      settings: {
        ...DEFAULT_SETTINGS,
        aiAssisted: true,
        ruleBased: true,
        apiEndpoint: 'http://localhost:9999/api/analyze' // unreachable
      }
    });

    // Pipeline should complete gracefully without throwing
    expect(result.scanStatus).toBe('partial');
    expect(result.aiAvailable).toBe(false);
    expect(result.diagnostics?.backend.status).toBe('error');
    // Local rules still caught the countdown timer!
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.findings[0].category).toBe('urgency');
    expect(result.riskScore).toBeGreaterThan(0);
  });
});
