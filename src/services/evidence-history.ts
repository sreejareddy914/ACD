/**
 * ClearChoice AI — Local Evidence History Service
 *
 * Implements privacy-preserving, origin-scoped observation records across visits.
 * Enables detectors to verify:
 * 1. Timer resets (e.g. countdown reaches zero and restarts)
 * 2. Scarcity claim persistence (e.g. "Only 2 left" recorded across multiple hours/days)
 * 3. Historical reference prices (prevents ungrounded price assertions)
 * 4. Stored observations without cross-site leakage or sensitive data collection
 */

export interface TimerObservationRecord {
  timerText: string;
  secondsRemaining?: number;
  observedAt: number;
  pageUrl: string;
  origin: string;
}

export interface ScarcityObservationRecord {
  claimText: string;
  observedAt: number;
  pageUrl: string;
  origin: string;
}

export interface PriceObservationRecord {
  productId?: string;
  originalPrice?: number;
  salePrice: number;
  currency: string;
  observedAt: number;
  pageUrl: string;
  origin: string;
}

export interface PageObservationHistory {
  origin: string;
  pageUrl: string;
  timerObservations: TimerObservationRecord[];
  scarcityObservations: ScarcityObservationRecord[];
  priceObservations: PriceObservationRecord[];
  visitCount: number;
  firstSeenAt: number;
  lastSeenAt: number;
}

const OBSERVATIONS_STORAGE_KEY = 'clearchoice_evidence_history';
const MAX_STORED_ORIGINS = 100;
const MAX_RECORDS_PER_PAGE = 20;

// In-memory cache for fast access
let memoryHistoryCache: Record<string, PageObservationHistory> = {};

function getPageKey(origin: string, pageUrl: string): string {
  try {
    const u = new URL(pageUrl);
    // Use origin + pathname without query params/hash for stable product tracking
    return `${u.origin}${u.pathname}`;
  } catch {
    return `${origin}:${pageUrl}`;
  }
}

/**
 * Loads observation history from chrome.storage.local or localStorage
 */
export async function loadObservationHistory(): Promise<Record<string, PageObservationHistory>> {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise(resolve => {
      chrome.storage.local.get([OBSERVATIONS_STORAGE_KEY], res => {
        const data = res[OBSERVATIONS_STORAGE_KEY] || {};
        memoryHistoryCache = data;
        resolve(data);
      });
    });
  }

  try {
    const raw = localStorage.getItem(OBSERVATIONS_STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    memoryHistoryCache = data;
    return data;
  } catch {
    return memoryHistoryCache;
  }
}

/**
 * Saves observation history
 */
export async function saveObservationHistory(data: Record<string, PageObservationHistory>): Promise<void> {
  memoryHistoryCache = data;

  // Enforce size limits: keep newest 100 pages
  const keys = Object.keys(data);
  if (keys.length > MAX_STORED_ORIGINS) {
    const sorted = keys.sort((a, b) => data[b].lastSeenAt - data[a].lastSeenAt);
    const pruned: Record<string, PageObservationHistory> = {};
    for (let i = 0; i < MAX_STORED_ORIGINS; i++) {
      pruned[sorted[i]] = data[sorted[i]];
    }
    data = pruned;
    memoryHistoryCache = pruned;
  }

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise(resolve => {
      chrome.storage.local.set({ [OBSERVATIONS_STORAGE_KEY]: data }, () => resolve());
    });
  }

  try {
    localStorage.setItem(OBSERVATIONS_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage full or disabled
  }
}

/**
 * Retrieves observation history for a specific page URL and origin
 */
export async function getPageHistory(origin: string, pageUrl: string): Promise<PageObservationHistory | null> {
  const history = await loadObservationHistory();
  const key = getPageKey(origin, pageUrl);
  return history[key] || null;
}

/**
 * Records a timer observation and checks if a timer reset occurred
 */
export async function recordTimerObservation(
  origin: string,
  pageUrl: string,
  timerText: string,
  secondsRemaining?: number
): Promise<{ resetDetected: boolean; observationCount: number; previousObservations: TimerObservationRecord[] }> {
  const history = await loadObservationHistory();
  const key = getPageKey(origin, pageUrl);
  const now = Date.now();

  const current: PageObservationHistory = history[key] || {
    origin,
    pageUrl,
    timerObservations: [],
    scarcityObservations: [],
    priceObservations: [],
    visitCount: 0,
    firstSeenAt: now,
    lastSeenAt: now
  };

  const prevTimers = [...current.timerObservations];
  let resetDetected = false;

  // Check for reset: previous timer reached 0 or very low (< 30s) and now new timer is high (> 60s)
  if (secondsRemaining !== undefined && prevTimers.length > 0) {
    const last = prevTimers[prevTimers.length - 1];
    if (last.secondsRemaining !== undefined) {
      if (last.secondsRemaining <= 30 && secondsRemaining > 120) {
        resetDetected = true;
      } else if (last.secondsRemaining < secondsRemaining && (now - last.observedAt) > 10000) {
        // Timer jumped upward after more than 10 seconds
        resetDetected = true;
      }
    }
  }

  // Append new observation
  current.timerObservations.push({
    timerText,
    secondsRemaining,
    observedAt: now,
    pageUrl,
    origin
  });

  if (current.timerObservations.length > MAX_RECORDS_PER_PAGE) {
    current.timerObservations = current.timerObservations.slice(-MAX_RECORDS_PER_PAGE);
  }

  current.visitCount++;
  current.lastSeenAt = now;
  history[key] = current;

  await saveObservationHistory(history);

  return {
    resetDetected,
    observationCount: current.timerObservations.length,
    previousObservations: prevTimers
  };
}

/**
 * Records a scarcity claim and returns previous occurrences across visits
 */
export async function recordScarcityObservation(
  origin: string,
  pageUrl: string,
  claimText: string
): Promise<{ repeatedOccurrences: number; observationTimestamps: number[] }> {
  const history = await loadObservationHistory();
  const key = getPageKey(origin, pageUrl);
  const now = Date.now();

  const current: PageObservationHistory = history[key] || {
    origin,
    pageUrl,
    timerObservations: [],
    scarcityObservations: [],
    priceObservations: [],
    visitCount: 0,
    firstSeenAt: now,
    lastSeenAt: now
  };

  const normalizedClaim = claimText.toLowerCase().replace(/\s+/g, ' ').trim();
  const matchingPast = current.scarcityObservations.filter(
    s => s.claimText.toLowerCase().replace(/\s+/g, ' ').trim() === normalizedClaim
  );

  current.scarcityObservations.push({
    claimText,
    observedAt: now,
    pageUrl,
    origin
  });

  if (current.scarcityObservations.length > MAX_RECORDS_PER_PAGE) {
    current.scarcityObservations = current.scarcityObservations.slice(-MAX_RECORDS_PER_PAGE);
  }

  current.visitCount++;
  current.lastSeenAt = now;
  history[key] = current;

  await saveObservationHistory(history);

  return {
    repeatedOccurrences: matchingPast.length + 1,
    observationTimestamps: matchingPast.map(p => p.observedAt).concat(now)
  };
}

/**
 * Records a price observation for a product
 */
export async function recordPriceObservation(
  origin: string,
  pageUrl: string,
  salePrice: number,
  currency: string,
  originalPrice?: number,
  productId?: string
): Promise<{ previousPrices: PriceObservationRecord[] }> {
  const history = await loadObservationHistory();
  const key = getPageKey(origin, pageUrl);
  const now = Date.now();

  const current: PageObservationHistory = history[key] || {
    origin,
    pageUrl,
    timerObservations: [],
    scarcityObservations: [],
    priceObservations: [],
    visitCount: 0,
    firstSeenAt: now,
    lastSeenAt: now
  };

  const prev = [...current.priceObservations];

  current.priceObservations.push({
    productId,
    originalPrice,
    salePrice,
    currency,
    observedAt: now,
    pageUrl,
    origin
  });

  if (current.priceObservations.length > MAX_RECORDS_PER_PAGE) {
    current.priceObservations = current.priceObservations.slice(-MAX_RECORDS_PER_PAGE);
  }

  current.lastSeenAt = now;
  history[key] = current;

  await saveObservationHistory(history);

  return { previousPrices: prev };
}

/**
 * Clears all observation history
 */
export async function clearObservationHistory(): Promise<void> {
  memoryHistoryCache = {};
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise(resolve => {
      chrome.storage.local.remove([OBSERVATIONS_STORAGE_KEY], () => resolve());
    });
  }
  try {
    localStorage.removeItem(OBSERVATIONS_STORAGE_KEY);
  } catch {
    // ignore
  }
}
