import { UserSettings, ScanHistoryItem } from '../analysis/types';

export const DEFAULT_SETTINGS: UserSettings = {
  autoScan: false,
  aiAssisted: true, // connect to backend AI analysis by default
  ruleBased: true,
  highlightingEnabled: true,
  historyEnabled: true,
  theme: 'light',
  apiEndpoint: 'http://localhost:3001/api/analyze',
  allowlist: [],
  notificationsEnabled: false
};

const SETTINGS_KEY = 'clearchoice_settings';
const HISTORY_KEY = 'clearchoice_history';

export async function getSettings(): Promise<UserSettings> {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise(resolve => {
      chrome.storage.local.get([SETTINGS_KEY], res => {
        resolve({ ...DEFAULT_SETTINGS, ...(res[SETTINGS_KEY] || {}) });
      });
    });
  }

  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise(resolve => {
      chrome.storage.local.set({ [SETTINGS_KEY]: settings }, () => resolve());
    });
  }

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export async function getHistory(): Promise<ScanHistoryItem[]> {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise(resolve => {
      chrome.storage.local.get([HISTORY_KEY], res => {
        resolve(res[HISTORY_KEY] || []);
      });
    });
  }

  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addHistoryItem(item: ScanHistoryItem): Promise<void> {
  const current = await getHistory();
  // Keep up to 50 items, newest first
  const updated = [item, ...current.filter(i => i.id !== item.id)].slice(0, 50);

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise(resolve => {
      chrome.storage.local.set({ [HISTORY_KEY]: updated }, () => resolve());
    });
  }

  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export async function deleteHistoryItem(id: string): Promise<void> {
  const current = await getHistory();
  const updated = current.filter(i => i.id !== id);

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise(resolve => {
      chrome.storage.local.set({ [HISTORY_KEY]: updated }, () => resolve());
    });
  }

  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export async function clearAllHistory(): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise(resolve => {
      chrome.storage.local.set({ [HISTORY_KEY]: [] }, () => resolve());
    });
  }

  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([]));
  } catch {
    // ignore
  }
}
