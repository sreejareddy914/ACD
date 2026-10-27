// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractPageContent, safeClassName, isElementVisible } from '../../src/content/dom-extractor';
import { extractContentFromActiveTab, getActiveTab } from '../../src/services/messaging';
import { analyzeWebpageContent } from '../../src/analysis/analyzer';
import { DEFAULT_SETTINGS } from '../../src/services/storage';

describe('ClearChoice AI — Scan Reliability, DOM Extractor, and Messaging Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('1. safeClassName Helper and SVG Handling', () => {
    it('safely extracts class names from standard HTML elements', () => {
      const div = document.createElement('div');
      div.className = 'btn primary large';
      expect(safeClassName(div)).toBe('btn primary large');
    });

    it('handles null, undefined, and elements without className', () => {
      expect(safeClassName(null)).toBe('');
      expect(safeClassName(undefined)).toBe('');
      const div = document.createElement('div');
      expect(safeClassName(div)).toBe('');
    });

    it('safely extracts baseVal from SVG elements with SVGAnimatedString', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'lucide lucide-shopping-cart strike-price');
      // In JSDOM and real browser, svg.className is an SVGAnimatedString
      const classNameStr = safeClassName(svg);
      expect(classNameStr).toContain('lucide-shopping-cart');
      expect(classNameStr).toContain('strike-price');
    });

    it('safely evaluates visibility on SVG elements without throwing', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      document.body.appendChild(svg);
      expect(() => isElementVisible(svg)).not.toThrow();
    });
  });

  describe('2. DOM Extraction with SVGs and Complex Elements', () => {
    it('extracts content correctly on a page containing SVG icons and buttons', () => {
      document.body.innerHTML = `
        <header>
          <svg class="icon strike"><path d="M0 0" /></svg>
          <button class="primary btn-main">
            <svg class="lucide lucide-tag"><circle cx="5" cy="5" r="5" /></svg>
            Add to Bag
          </button>
        </header>
        <main>
          <div class="product">
            <span class="mrp strike-price">₹1,999</span>
            <span class="price current-price">₹999</span>
            <span class="discount">50% OFF</span>
            <div class="timer">Sale ends in 02:45</div>
          </div>
        </main>
      `;

      const content = extractPageContent();
      expect(content).toBeDefined();
      expect(content.visibleTexts.length).toBeGreaterThan(0);
      expect(content.prices.length).toBeGreaterThan(0);
      expect(content.discounts.length).toBeGreaterThan(0);
      expect(content.timers.length).toBeGreaterThan(0);
      expect(content.buttons.length).toBe(1);
      expect(content.buttons[0].isPrimary).toBe(true);
    });

    it('handles completely empty or minimal DOM content without crashing', () => {
      document.body.innerHTML = '';
      const content = extractPageContent();
      expect(content).toBeDefined();
      expect(content.visibleTexts).toEqual([]);
      expect(content.prices).toEqual([]);
      expect(content.discounts).toEqual([]);
      expect(content.timers).toEqual([]);
      expect(content.totalCharactersExtracted).toBe(0);
    });

    it('excludes ClearChoice extension UI from DOM extraction', () => {
      document.body.innerHTML = `
        <div id="clearchoice-extension-root">
          <div class="timer">Internal timer 05:00</div>
          <span>Internal price ₹500</span>
        </div>
        <div data-clearchoice-ui="true">
          <span>Internal text</span>
        </div>
        <div class="user-content">
          <p>Genuine website content</p>
        </div>
      `;

      const content = extractPageContent();
      const extractedTexts = content.visibleTexts.map(t => t.text);
      expect(extractedTexts).toContain('Genuine website content');
      expect(extractedTexts).not.toContain('Internal timer 05:00');
      expect(extractedTexts).not.toContain('Internal price ₹500');
    });
  });

  describe('3. Messaging Resilience and Error Propagation', () => {
    it('throws structured error when attempting to scan browser-internal URLs', async () => {
      (globalThis as any).chrome = {
        runtime: { id: 'test-id' },
        tabs: {
          query: vi.fn().mockResolvedValue([{ id: 101, url: 'chrome://extensions', title: 'Extensions' }])
        }
      };

      await expect(extractContentFromActiveTab()).rejects.toThrow(
        /cannot analyze browser-internal system pages/i
      );
    });

    it('throws structured error when attempting to scan Chrome Web Store', async () => {
      (globalThis as any).chrome = {
        runtime: { id: 'test-id' },
        tabs: {
          query: vi.fn().mockResolvedValue([{ id: 102, url: 'https://chromewebstore.google.com/detail/123', title: 'Store' }])
        }
      };

      await expect(extractContentFromActiveTab()).rejects.toThrow(
        /policies prohibit analyzing the Chrome Web Store/i
      );
    });

    it('handles transient connection failure by attempting bounded script injection', async () => {
      let callCount = 0;
      const mockSendMessage = vi.fn().mockImplementation((_tabId, msg) => {
        if (msg.type === 'EXTRACT_CONTENT') {
          callCount++;
          if (callCount === 1) {
            // First call fails because content script was not injected yet
            return Promise.reject(new Error('Could not establish connection. Receiving end does not exist.'));
          }
          // Second call after injection succeeds
          return Promise.resolve({
            success: true,
            content: {
              url: 'https://example-shop.com',
              domain: 'example-shop.com',
              title: 'Shop',
              timestamp: Date.now(),
              visibleTexts: [{ id: '1', tag: 'p', text: '50% discount ends now', fontSize: 16, color: '#000', backgroundColor: '#fff' }],
              buttons: [],
              links: [],
              formControls: [],
              prices: [],
              discounts: [],
              timers: [],
              modals: []
            }
          });
        }
        return Promise.resolve({});
      });

      const mockExecuteScript = vi.fn().mockResolvedValue([{ result: null }]);

      (globalThis as any).chrome = {
        runtime: { id: 'test-id' },
        tabs: {
          query: vi.fn().mockResolvedValue([{ id: 201, url: 'https://example-shop.com', title: 'Shop' }]),
          sendMessage: mockSendMessage
        },
        scripting: {
          executeScript: mockExecuteScript
        }
      };

      const content = await extractContentFromActiveTab();
      expect(content).toBeDefined();
      expect(content.domain).toBe('example-shop.com');
      expect(mockExecuteScript).toHaveBeenCalledTimes(1);
      expect(callCount).toBe(2);
    });

    it('propagates extraction error if content script returns { success: false, error: ... }', async () => {
      (globalThis as any).chrome = {
        runtime: { id: 'test-id' },
        tabs: {
          query: vi.fn().mockResolvedValue([{ id: 202, url: 'https://example-shop.com', title: 'Shop' }]),
          sendMessage: vi.fn().mockResolvedValue({
            success: false,
            error: 'DOM tree contains inaccessible shadow boundaries'
          })
        }
      };

      await expect(extractContentFromActiveTab()).rejects.toThrow(
        'DOM tree contains inaccessible shadow boundaries'
      );
    });

    it('throws structured error if content script remains completely unreachable after retry', async () => {
      (globalThis as any).chrome = {
        runtime: { id: 'test-id' },
        tabs: {
          query: vi.fn().mockResolvedValue([{ id: 203, url: 'https://example-shop.com', title: 'Shop' }]),
          sendMessage: vi.fn().mockRejectedValue(new Error('Could not establish connection. Receiving end does not exist.'))
        },
        scripting: {
          executeScript: vi.fn().mockRejectedValue(new Error('Cannot access contents of url'))
        }
      };

      await expect(extractContentFromActiveTab()).rejects.toThrow(
        /Could not establish connection to the webpage content script/i
      );
    });
  });

  describe('4. Analyzer Pipeline and Empty vs Clean Page Distinction', () => {
    it('produces legitimate clean result on a clean non-empty page', async () => {
      const cleanContent = {
        url: 'https://clean-store.com',
        domain: 'clean-store.com',
        title: 'Clean Store',
        timestamp: Date.now(),
        visibleTexts: [
          { id: '1', tag: 'h1', text: 'Welcome to Organic Goods', fontSize: 24, color: '#000', backgroundColor: '#fff' },
          { id: '2', tag: 'p', text: 'All items made from certified organic cotton.', fontSize: 14, color: '#333', backgroundColor: '#fff' }
        ],
        buttons: [{ id: 'b1', text: 'View Catalog', isPrimary: true }],
        links: [],
        formControls: [],
        prices: [{ id: 'p1', raw: '₹499', value: 499, currency: '₹', isCrossedOut: false }],
        discounts: [],
        timers: [],
        modals: []
      };

      const result = await analyzeWebpageContent(cleanContent, {
        settings: { ...DEFAULT_SETTINGS, aiAssisted: false, ruleBased: true }
      });

      expect(result.riskScore).toBe(0);
      expect(result.riskLevel).toBe('LOW RISK');
      expect(result.findings).toHaveLength(0);
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics.extractedStats.visibleElementsExtracted).toBe(2);
    });

    it('accurately counts extracted stats and detector executions in diagnostics', async () => {
      const darkPatternContent = {
        url: 'https://sneaky-store.com',
        domain: 'sneaky-store.com',
        title: 'Sneaky Store',
        timestamp: Date.now(),
        visibleTexts: [
          { id: '1', tag: 'p', text: 'Hurry! Only 2 items left in stock — 45 people viewing now!', fontSize: 16, color: '#000', backgroundColor: '#fff' },
          { id: '2', tag: 'div', text: 'Flash sale ends in 04:30', fontSize: 14, color: '#f00', backgroundColor: '#fff' }
        ],
        buttons: [{ id: 'b1', text: 'Buy Now', isPrimary: true }],
        links: [],
        formControls: [],
        prices: [],
        discounts: [],
        timers: [{ id: 't1', text: 'Flash sale ends in 04:30', isTicking: true }],
        modals: []
      };

      const result = await analyzeWebpageContent(darkPatternContent, {
        settings: { ...DEFAULT_SETTINGS, aiAssisted: false, ruleBased: true }
      });

      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.diagnostics.detectors.length).toBeGreaterThanOrEqual(6);
      const urgencyDetector = result.diagnostics.detectors.find(d => d.category === 'urgency');
      expect(urgencyDetector).toBeDefined();
      expect(urgencyDetector!.findingsCount).toBeGreaterThan(0);
    });
  });
});
