import { AnalysisResult, UserSettings } from './types';

export interface CachedAnalysisEntry {
  cacheKey: string;
  url: string;
  contentFingerprint: string;
  configKey: string;
  timestamp: number;
  result: AnalysisResult;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
const memoryCache = new Map<string, CachedAnalysisEntry>();
const CACHE_STORAGE_PREFIX = 'clearchoice_cache_';

/**
 * Computes a deterministic cache key from page URL, content fingerprint, and scan settings.
 */
export function computeAnalysisCacheKey(
  url: string,
  contentFingerprint: string,
  settings: Pick<UserSettings, 'aiAssisted' | 'ruleBased'>
): string {
  // Normalize URL (strip URL fragments like #anchor)
  let cleanUrl = url;
  try {
    const u = new URL(url);
    u.hash = '';
    cleanUrl = u.toString();
  } catch {
    cleanUrl = url;
  }

  const configKey = `ai=${Boolean(settings.aiAssisted)}:rb=${Boolean(settings.ruleBased)}`;
  return `${cleanUrl}:::${contentFingerprint}:::${configKey}`;
}

/**
 * Retrieves a cached analysis result if the URL, content fingerprint, and scan configuration match,
 * and the entry has not expired. Returns null if forceFresh is requested or cache missed.
 */
export async function getCachedAnalysis(
  url: string,
  contentFingerprint: string,
  settings: UserSettings,
  forceFresh?: boolean
): Promise<AnalysisResult | null> {
  if (forceFresh) {
    return null;
  }

  const cacheKey = computeAnalysisCacheKey(url, contentFingerprint, settings);
  const now = Date.now();

  // 1. Check in-memory cache
  const memEntry = memoryCache.get(cacheKey);
  if (memEntry) {
    if (now - memEntry.timestamp < CACHE_TTL_MS) {
      console.log(`[ClearChoice AI Trace] Cache HIT (memory) for ${url} [fp: ${contentFingerprint}]`);
      return {
        ...memEntry.result,
        isCached: true,
        cacheTimestamp: memEntry.timestamp
      };
    } else {
      memoryCache.delete(cacheKey);
    }
  }

  // 2. Check persistent storage (Chrome storage or localStorage)
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      const storageKey = `${CACHE_STORAGE_PREFIX}${encodeURIComponent(cacheKey).slice(0, 100)}`;
      const res = await new Promise<Record<string, any>>(resolve => {
        chrome.storage.local.get([storageKey], resolve);
      });
      const stored = res[storageKey] as CachedAnalysisEntry | undefined;
      if (stored && stored.contentFingerprint === contentFingerprint && (now - stored.timestamp < CACHE_TTL_MS)) {
        memoryCache.set(cacheKey, stored);
        console.log(`[ClearChoice AI Trace] Cache HIT (storage) for ${url} [fp: ${contentFingerprint}]`);
        return {
          ...stored.result,
          isCached: true,
          cacheTimestamp: stored.timestamp
        };
      }
    } catch {
      // Storage lookup fallback
    }
  }

  return null;
}

/**
 * Saves a validated analysis result to cache.
 * Avoids caching incomplete, failed, or insufficient-evidence results.
 */
export async function setCachedAnalysis(
  url: string,
  contentFingerprint: string,
  settings: UserSettings,
  result: AnalysisResult
): Promise<void> {
  // Never cache failed or insufficient evidence analyses as successful results
  if (result.scanStatus === 'error' || result.scanStatus === 'insufficient_evidence') {
    return;
  }

  const cacheKey = computeAnalysisCacheKey(url, contentFingerprint, settings);
  const entry: CachedAnalysisEntry = {
    cacheKey,
    url,
    contentFingerprint,
    configKey: `ai=${Boolean(settings.aiAssisted)}:rb=${Boolean(settings.ruleBased)}`,
    timestamp: Date.now(),
    result
  };

  memoryCache.set(cacheKey, entry);

  // Limit memory cache size to 30 items
  if (memoryCache.size > 30) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      const storageKey = `${CACHE_STORAGE_PREFIX}${encodeURIComponent(cacheKey).slice(0, 100)}`;
      await new Promise<void>(resolve => {
        chrome.storage.local.set({ [storageKey]: entry }, () => resolve());
      });
    } catch {
      // ignore
    }
  }
}

/**
 * Clears all cached analyses from memory and persistent storage.
 */
export async function clearAnalysisCache(): Promise<void> {
  memoryCache.clear();
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      const allKeys = await new Promise<Record<string, any>>(resolve => {
        chrome.storage.local.get(null, resolve);
      });
      const cacheKeysToRemove = Object.keys(allKeys).filter(k => k.startsWith(CACHE_STORAGE_PREFIX));
      if (cacheKeysToRemove.length > 0) {
        await new Promise<void>(resolve => {
          chrome.storage.local.remove(cacheKeysToRemove, () => resolve());
        });
      }
    } catch {
      // ignore
    }
  }
}
