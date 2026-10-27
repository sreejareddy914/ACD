import { describe, it, expect } from 'vitest';
import { runAllRules } from '../../src/analysis/rules';
import { ExtractedContent } from '../../src/analysis/types';

function createMockContent(overrides: Partial<ExtractedContent> = {}): ExtractedContent {
  return {
    url: 'https://teststore.com/item',
    domain: 'teststore.com',
    title: 'Product Page',
    timestamp: Date.now(),
    visibleTexts: [],
    buttons: [],
    links: [],
    formControls: [],
    prices: [],
    discounts: [],
    timers: [],
    modals: [],
    ...overrides
  };
}

describe('Deterministic Rule Detection Suite', () => {
  it('detects fake urgency countdown timers', () => {
    const content = createMockContent({
      timers: [{ id: 't1', text: '03:45', isTicking: true }]
    });
    const findings = runAllRules(content);
    expect(findings.some(f => f.category === 'urgency')).toBe(true);
  });

  it('detects fake scarcity claims', () => {
    const content = createMockContent({
      visibleTexts: [{ id: 'v1', tag: 'span', text: 'Only 2 left in stock — hurry!' }]
    });
    const findings = runAllRules(content);
    expect(findings.some(f => f.category === 'scarcity')).toBe(true);
  });

  it('detects discount arithmetic discrepancies', () => {
    const content = createMockContent({
      discounts: [{
        id: 'd1',
        text: 'Save 50%!',
        claimedPercent: 50,
        originalPrice: 100,
        salePrice: 80 // actual is 20%
      }]
    });
    const findings = runAllRules(content);
    expect(findings.some(f => f.category === 'discounts')).toBe(true);
  });

  it('detects preselected paid add-on options', () => {
    const content = createMockContent({
      formControls: [{
        id: 'fc1',
        type: 'checkbox',
        label: 'Add 2-Year Extended Warranty for $19.99',
        checked: true,
        isPreselected: true
      }]
    });
    const findings = runAllRules(content);
    expect(findings.some(f => f.category === 'preselected_options')).toBe(true);
  });

  it('detects confirmshaming refusal wording', () => {
    const content = createMockContent({
      buttons: [{
        id: 'b1',
        text: 'No thanks, I hate discounts and prefer paying full price'
      }]
    });
    const findings = runAllRules(content);
    expect(findings.some(f => f.category === 'confirmshaming')).toBe(true);
  });

  it('detects difficult cancellation (Roach Motel)', () => {
    const content = createMockContent({
      visibleTexts: [{
        id: 'c1',
        tag: 'p',
        text: 'To cancel your membership, you must call to cancel between 9am-11am EST.'
      }]
    });
    const findings = runAllRules(content);
    expect(findings.some(f => f.category === 'cancellation')).toBe(true);
  });

  it('detects asymmetric cookie consent banners', () => {
    const content = createMockContent({
      cookiesBanner: {
        id: 'cookie-1',
        acceptText: 'Accept All',
        hasReject: false,
        hasManage: true
      }
    });
    const findings = runAllRules(content);
    expect(findings.some(f => f.category === 'privacy_manipulation')).toBe(true);
  });

  it('detects suspicious upfront job training and interview fees', () => {
    const content = createMockContent({
      visibleTexts: [{
        id: 'j1',
        tag: 'div',
        text: '100% guaranteed placement after training. Pay registration fee to interview.'
      }]
    });
    const findings = runAllRules(content);
    expect(findings.some(f => f.category === 'job_internship')).toBe(true);
  });

  it('returns clean zero findings on neutral, clean webpage', () => {
    const cleanContent = createMockContent({
      title: 'About Solar Energy Technology',
      visibleTexts: [
        { id: 'c1', tag: 'h1', text: 'Introduction to Photovoltaic Cells' },
        { id: 'c2', tag: 'p', text: 'Silicon solar cells convert sunlight into electricity through the photovoltaic effect.' }
      ],
      buttons: [
        { id: 'b1', text: 'Read Research Paper' }
      ]
    });
    const findings = runAllRules(cleanContent);
    expect(findings).toHaveLength(0);
  });

  it('does NOT falsely cross-contaminate prices or flag math errors on multi-item catalog grids', () => {
    // Multi-item catalog (e.g. Amazon / Meesho deal grid) with many products
    const multiItemCatalog = createMockContent({
      title: 'Great Indian Festival Deals',
      prices: [
        { id: 'p1', raw: '₹199', value: 199, currency: 'INR', isCrossedOut: true },  // Item 1 crossed
        { id: 'p2', raw: '₹149', value: 149, currency: 'INR', isCrossedOut: false }, // Item 1 sale
        { id: 'p3', raw: '₹999', value: 999, currency: 'INR', isCrossedOut: true },  // Item 2 crossed
        { id: 'p4', raw: '₹299', value: 299, currency: 'INR', isCrossedOut: false }  // Item 2 sale
      ],
      discounts: [
        // Discount badges without paired prices in catalog grid (e.g. deal cards)
        { id: 'd1', text: '71% off', claimedPercent: 71 },
        { id: 'd2', text: '61% off', claimedPercent: 61 },
        { id: 'd3', text: '69% off', claimedPercent: 69 },
        { id: 'd4', text: '53% off', claimedPercent: 53 }
      ]
    });

    const findings = runAllRules(multiItemCatalog);
    // Should NOT flag false positive math errors or false inversions by comparing item 4 against item 1
    const discountErrors = findings.filter(f => f.category === 'discounts' && f.classification === 'verified_deceptive');
    expect(discountErrors).toHaveLength(0);
  });
});
