import { ExtractedContent } from '../analysis/types';
import { extractPageContent } from '../content/dom-extractor';
import { highlightElementOnPage, removeActiveHighlight } from '../content/element-highlighter';

export async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
    try {
      // 1. Try querying the active tab in current window
      let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        // 2. In extension popups or sidepanels, currentWindow can refer to popup; query lastFocusedWindow
        [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      }
      if (!tab) {
        // 3. Fallback: query all active tabs and pick the web page tab
        const tabs = await chrome.tabs.query({ active: true });
        tab = tabs.find(t => t.url && !t.url.startsWith('chrome-extension://')) || tabs[0];
      }
      return tab || null;
    } catch (err) {
      console.warn('ClearChoice AI: Error querying active tab:', err);
      return null;
    }
  }
  return null;
}

export async function extractContentFromActiveTab(): Promise<ExtractedContent> {
  const isExtensionContext = typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id);

  if (isExtensionContext) {
    const tab = await getActiveTab();
    if (!tab || !tab.id) {
      throw new Error('No active webpage tab found. Please click on an open website tab before scanning.');
    }

    console.log(`[ClearChoice AI Debug] Target active tab identified: id=${tab.id}, url=${tab.url}`);

    if (tab.url) {
      if (
        tab.url.startsWith('chrome://') ||
        tab.url.startsWith('chrome-extension://') ||
        tab.url.startsWith('edge://') ||
        tab.url.startsWith('devtools://') ||
        tab.url.startsWith('about:') ||
        tab.url.startsWith('view-source:')
      ) {
        throw new Error('ClearChoice AI cannot analyze browser-internal system pages. Please navigate to an active website (e.g. an e-commerce, shopping, or media site).');
      }
      if (tab.url.includes('chromewebstore.google.com') || tab.url.includes('chrome.google.com/webstore')) {
        throw new Error('Chrome extension policies prohibit analyzing the Chrome Web Store. Please open an e-commerce or subscription site to scan.');
      }
    }

    // Attempt 1: Send message to existing content script
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_CONTENT', scrollAndCollect: true });
      if (response && response.success && response.content) {
        console.log('[ClearChoice AI Debug] Content received via runtime message passing.');
        return response.content;
      }
      if (response && response.error) {
        throw new Error(response.error);
      }
    } catch (msgErr: any) {
      // If the error is a domain extraction error rather than a disconnected receiver, rethrow immediately
      if (msgErr.message && !msgErr.message.includes('Could not establish connection') && !msgErr.message.includes('Receiving end does not exist')) {
        throw msgErr;
      }
      console.log('[ClearChoice AI Debug] Content script receiver not yet connected, attempting bounded script injection:', msgErr.message);
    }

    // Attempt 2: Inject content script dynamically via chrome.scripting (1 bounded retry)
    if (chrome.scripting) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        await new Promise(r => setTimeout(r, 150));

        const retryResp = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_CONTENT', scrollAndCollect: true });
        if (retryResp && retryResp.success && retryResp.content) {
          console.log('[ClearChoice AI Debug] Content received after dynamic script injection.');
          return retryResp.content;
        }
        if (retryResp && retryResp.error) {
          throw new Error(retryResp.error);
        }
      } catch (injectionErr: any) {
        console.warn('[ClearChoice AI Debug] Script injection retry failed:', injectionErr?.message);
      }

      // Attempt 3: Direct function execution via chrome.scripting (failsafe)
      try {
        const [execResult] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            if ((window as any).__clearchoice_extract) {
              return (window as any).__clearchoice_extract();
            }
            return null;
          }
        });
        if (execResult && execResult.result) {
          console.log('[ClearChoice AI Debug] Content extracted via direct scripting execution.');
          return execResult.result;
        }
      } catch (directExecErr: any) {
        console.warn('[ClearChoice AI Debug] Direct execution fallback failed:', directExecErr?.message);
      }
    }

    throw new Error('Could not establish connection to the webpage content script. Please ensure the page is fully loaded or reload the webpage (Cmd+R / F5).');
  }

  // Fallback for local web development / demo mode when running in the same DOM window (non-extension)
  console.log('[ClearChoice AI Debug] Non-extension browser context detected; running in-DOM extraction.');
  return extractPageContent();
}

export async function triggerHighlight(
  elementId: string,
  findingTitle: string,
  categoryName: string
): Promise<{ success: boolean; message?: string }> {
  const tab = await getActiveTab();

  if (tab && tab.id) {
    try {
      return await chrome.tabs.sendMessage(tab.id, {
        type: 'HIGHLIGHT_ELEMENT',
        elementId,
        findingTitle,
        categoryName
      });
    } catch {
      return { success: false, message: 'Could not communicate with the webpage to highlight element.' };
    }
  }

  // Fallback in same DOM
  return highlightElementOnPage(elementId, findingTitle, categoryName);
}

export async function triggerRemoveHighlight(): Promise<void> {
  const tab = await getActiveTab();

  if (tab && tab.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'REMOVE_HIGHLIGHT' });
      return;
    } catch {
      // ignore
    }
  }

  removeActiveHighlight();
}
