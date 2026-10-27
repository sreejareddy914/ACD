// ClearChoice AI - Background Service Worker (Manifest V3)

chrome.runtime.onInstalled.addListener(async () => {
  console.log('ClearChoice AI extension installed/updated.');

  // Create right-click context menu item to toggle the floating panel
  if (chrome.contextMenus) {
    try {
      chrome.contextMenus.create({
        id: 'clearchoice-toggle-panel',
        title: 'ClearChoice AI: Toggle Floating Panel',
        contexts: ['page', 'action']
      });
    } catch {
      // Menu item may already exist
    }
  }

  // Configure Chrome side panel behavior if supported
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    try {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
    } catch (err) {
      console.warn('sidePanel.setPanelBehavior error:', err);
    }
  }
});

// Handle context menu clicks
if (chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'clearchoice-toggle-panel' && tab && tab.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_FLOATING_PANEL' });
      } catch (err) {
        console.warn('Could not communicate with tab:', err);
      }
    }
  });
}

// Handle keyboard shortcut commands (e.g. Alt+Shift+D)
if (chrome.commands && chrome.commands.onCommand) {
  chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'toggle-floating-panel') {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        try {
          await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_FLOATING_PANEL' });
        } catch (err) {
          console.warn('Could not communicate with tab:', err);
        }
      }
    }
  });
}

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'UPDATE_BADGE') {
    const { score, level } = message;
    if (score !== undefined) {
      const text = score > 0 ? String(score) : '';
      chrome.action.setBadgeText({ text });

      let color = '#16a34a'; // green
      if (level === 'VERY HIGH RISK') color = '#dc2626'; // red
      else if (level === 'HIGH RISK') color = '#ea580c'; // orange
      else if (level === 'MODERATE RISK') color = '#d97706'; // amber

      chrome.action.setBadgeBackgroundColor({ color });
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'CALL_AI_BACKEND') {
    fetch(message.endpoint || 'http://localhost:3001/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message.payload)
    })
      .then(async res => {
        if (res.ok) {
          const data = await res.json();
          sendResponse({ success: true, ok: true, data });
        } else {
          const errorText = await res.text().catch(() => '');
          sendResponse({ success: true, ok: false, status: res.status, errorText });
        }
      })
      .catch(err => {
        sendResponse({ success: false, error: err?.message || 'Network request failed' });
      });
    return true; // Async sendResponse
  }

  if (message.type === 'PAGE_MUTATED') {
    sendResponse({ success: true });
    return true;
  }

  return false;
});
