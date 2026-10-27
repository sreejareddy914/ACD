import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { FloatingPanel } from './FloatingPanel';
import { extractPageContent, scrollAndCollectPageContent } from './dom-extractor';
import { highlightElementOnPage, removeActiveHighlight } from './element-highlighter';
import { startMutationMonitoring, stopMutationMonitoring } from './mutation-monitor';
import panelCss from '../index.css?inline';

const ROOT_ID = 'clearchoice-extension-root';

// Module-level state variables declared before any function access
let lastUrl = typeof window !== 'undefined' ? window.location.href : '';
let reactRoot: Root | null = null;
let hostElement: HTMLElement | null = null;
let isPanelVisible = false; // Start hidden on ordinary pages until explicitly toggled by user

/**
 * Register Chrome runtime message listener IMMEDIATELY at script load time.
 * This guarantees the extension can communicate with this tab (e.g. for DOM extraction
 * or element highlighting) even if UI mounting is deferred or encounters an issue.
 */
if (!(window as any).__CLEARCHOICE_INITIALIZED__) {
  (window as any).__CLEARCHOICE_INITIALIZED__ = true;
  (window as any).__clearchoice_extract = extractPageContent;
  (window as any).__clearchoice_scroll_extract = scrollAndCollectPageContent;

  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      // 1. Health check ping
      if (message.type === 'PING') {
        sendResponse({ success: true, ready: true, url: window.location.href });
        return true;
      }

      // 2. DOM Content Extraction (Full Page with safe scroll-and-collect support)
      if (message.type === 'EXTRACT_CONTENT') {
        const enableScroll = message.scrollAndCollect !== false;
        scrollAndCollectPageContent({ enableScroll })
          .then(content => sendResponse({ success: true, content }))
          .catch(err => {
            console.error('ClearChoice AI: DOM extraction error', err);
            sendResponse({ success: false, error: err?.message || 'DOM extraction failed' });
          });
        return true; // Asynchronous sendResponse
      }

      // 3. Highlight Element on Page
      if (message.type === 'HIGHLIGHT_ELEMENT') {
        try {
          const result = highlightElementOnPage(
            message.elementId,
            message.findingTitle || '',
            message.categoryName || ''
          );
          sendResponse(result);
        } catch (err: any) {
          sendResponse({ success: false, message: err?.message || 'Highlight failed' });
        }
        return true;
      }

      // 4. Remove Active Highlight
      if (message.type === 'REMOVE_HIGHLIGHT') {
        try {
          removeActiveHighlight();
          sendResponse({ success: true });
        } catch {
          sendResponse({ success: false });
        }
        return true;
      }

      // 5. Toggle Floating Panel
      if (message.type === 'TOGGLE_FLOATING_PANEL') {
        togglePanelVisibility();
        sendResponse({ success: true, visible: isPanelVisible });
        return true;
      }

      // 6. Mutation Monitoring
      if (message.type === 'START_MONITORING') {
        try {
          startMutationMonitoring(() => {
            try {
              chrome.runtime.sendMessage({ type: 'PAGE_MUTATED' });
            } catch {
              // Ignore extension context invalidation
            }
          });
          sendResponse({ success: true });
        } catch {
          sendResponse({ success: false });
        }
        return true;
      }

      if (message.type === 'STOP_MONITORING') {
        try {
          stopMutationMonitoring();
          sendResponse({ success: true });
        } catch {
          sendResponse({ success: false });
        }
        return true;
      }

      return false;
    });
  }
}

/**
 * Creates the isolated host element and shadow root for the ClearChoice floating panel.
 * Kept hidden until explicitly toggled.
 */
function initFloatingPanel() {
  try {
    if (typeof document === 'undefined') return;
    if (document.getElementById(ROOT_ID)) return;

    hostElement = document.createElement('div');
    hostElement.id = ROOT_ID;
    hostElement.setAttribute('data-clearchoice-ui', 'true');
    hostElement.style.display = 'none';

    const shadowRoot = hostElement.attachShadow({ mode: 'open' });

    const styleEl = document.createElement('style');
    styleEl.textContent = panelCss;
    shadowRoot.appendChild(styleEl);

    const mountPoint = document.createElement('div');
    mountPoint.id = 'clearchoice-mount-root';
    shadowRoot.appendChild(mountPoint);

    const targetParent = document.documentElement || document.body;
    if (targetParent) {
      targetParent.appendChild(hostElement);
    }
  } catch (err) {
    console.warn('ClearChoice AI: Failed to initialize floating panel host:', err);
  }
}

/**
 * Renders or updates the React FloatingPanel component inside Shadow DOM.
 * Only mounts React when the panel is actually visible.
 */
function renderPanel() {
  if (!hostElement) return;

  if (!isPanelVisible) {
    hostElement.style.display = 'none';
    return;
  }

  hostElement.style.display = 'block';

  try {
    const mountPoint = hostElement.shadowRoot?.getElementById('clearchoice-mount-root');
    if (!mountPoint) return;

    if (!reactRoot) {
      reactRoot = createRoot(mountPoint);
    }

    reactRoot.render(
      <React.StrictMode>
        <FloatingPanel
          pageUrl={lastUrl}
          onClosePanel={() => {
            isPanelVisible = false;
            renderPanel();
          }}
        />
      </React.StrictMode>
    );
  } catch (err) {
    console.error('ClearChoice AI: Failed to render floating panel:', err);
  }
}

function togglePanelVisibility() {
  isPanelVisible = !isPanelVisible;
  if (!hostElement || !document.getElementById(ROOT_ID)) {
    initFloatingPanel();
    isPanelVisible = true;
  }
  renderPanel();
}

// Initialize floating panel host structure safely after DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initFloatingPanel(), { once: true });
  } else {
    initFloatingPanel();
  }
}

// Detect SPA navigation
function checkUrlChange() {
  if (typeof window === 'undefined') return;
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    if (reactRoot && isPanelVisible) {
      renderPanel();
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', checkUrlChange);
  window.addEventListener('hashchange', checkUrlChange);

  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    const ret = originalPushState.apply(this, args);
    checkUrlChange();
    return ret;
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function (...args) {
    const ret = originalReplaceState.apply(this, args);
    checkUrlChange();
    return ret;
  };
}
