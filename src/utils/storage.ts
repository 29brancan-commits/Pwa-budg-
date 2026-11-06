import { BudgetState, BudgetMonth } from '../types/expense';
import { INITIAL_BUDGET_STATE, DEFAULT_BANK_ACCOUNTS, DEFAULT_PAYCHECK_CYCLES } from './seedData';

export const PRIMARY_STORAGE_KEY = 'flowledger_budget_state_clean_v3';
export const BACKUP_STORAGE_KEYS = [
  'flowledger_budget_state_clean_v3',
  'flowledger_budget_state_pwa_backup',
  'flowledger_budget_state_v2',
  'flowledger_budget_state_clean_v1',
  'flowledger_budget_state',
];

const DB_NAME = 'flowledger_pwa_db';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';

// IndexedDB Initialization for persistent retention across PWA install / WebClip launch
function initIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject('IndexedDB not available');
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveToIndexedDB(key: string, data: any): Promise<void> {
  try {
    const db = await initIndexedDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(data, key);
  } catch (err) {
    // Non-fatal fallback
  }
}

export async function loadFromIndexedDB(key: string): Promise<any | null> {
  try {
    const db = await initIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        const val = req.result;
        if (!val) {
          resolve(null);
          return;
        }
        // Normalize wrapper { state, timestamp } or direct state object
        if (val.state && val.state.months) {
          resolve(val);
        } else if (val.months && val.currentMonthId) {
          resolve({ state: val, timestamp: 0 });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
}

// Cookie-Based Storage Bridge (Shared on iOS between Mobile Safari Browser & WebClip Standalone PWA)
function saveToCookie(state: BudgetState): void {
  if (typeof document === 'undefined') return;
  try {
    const compact = JSON.stringify(state);
    const encoded = encodeURIComponent(compact);
    // Standard safe per-cookie limit is ~3500 bytes
    if (encoded.length <= 3500) {
      document.cookie = `flowledger_cookie_data=${encoded}; path=/; max-age=31536000; SameSite=Lax`;
    }
  } catch (e) {
    // Non-fatal fallback
  }
}

function loadFromCookie(): BudgetState | null {
  if (typeof document === 'undefined') return null;
  try {
    const cookies = document.cookie.split('; ').reduce((acc: Record<string, string>, cur) => {
      const [k, v] = cur.split('=');
      if (k && v) acc[k.trim()] = v.trim();
      return acc;
    }, {});

    if (cookies['flowledger_cookie_data']) {
      const jsonString = decodeURIComponent(cookies['flowledger_cookie_data']);
      return sanitizeBudgetState(jsonString);
    }
  } catch (e) {
    // Non-fatal fallback
  }
  return null;
}

// BroadcastChannel for instant real-time sync between Browser tab and installed PWA window
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('flowledger_pwa_channel');
  } catch (e) {
    // Channel initialization ignored if disabled
  }
}

export function notifyDataChanged(state: BudgetState) {
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'STATE_UPDATED', state, timestamp: Date.now() });
    } catch (e) {
      // Ignore
    }
  }
}

export function checkUrlHashForImport(): BudgetState | null {
  if (typeof window === 'undefined') return null;
  try {
    const hash = window.location.hash;
    const search = window.location.search;
    let rawData: string | null = null;

    if (hash && (hash.includes('import=') || hash.includes('data='))) {
      const match = hash.match(/(?:import|data)=([^&]+)/);
      if (match && match[1]) rawData = match[1];
    } else if (search && (search.includes('import=') || search.includes('data='))) {
      const match = search.match(/(?:import|data)=([^&]+)/);
      if (match && match[1]) rawData = match[1];
    }

    if (rawData) {
      const jsonString = decodeURIComponent(rawData);
      const sanitized = sanitizeBudgetState(jsonString);
      if (sanitized) {
        saveBudgetState(sanitized);
        window.history.replaceState(null, '', window.location.pathname);
        return sanitized;
      }
    }
  } catch (e) {
    console.error('Failed to parse URL import parameter:', e);
  }
  return null;
}

export function generateAppTransferUrl(state: BudgetState): string {
  if (typeof window === 'undefined') return '';
  try {
    const compactJson = JSON.stringify(state);
    const encoded = encodeURIComponent(compactJson);
    return `${window.location.origin}${window.location.pathname}#import=${encoded}`;
  } catch (e) {
    return window.location.href;
  }
}

export function sanitizeBudgetState(rawState: any): BudgetState | null {
  if (!rawState) return null;
  try {
    let parsed: any = rawState;
    if (typeof rawState === 'string') {
      try {
        parsed = JSON.parse(rawState);
      } catch (e) {
        return null;
      }
    }

    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.months || typeof parsed.months !== 'object' || !parsed.currentMonthId) {
      return null;
    }

    // Ensure current month exists in months dictionary
    const mId = parsed.currentMonthId;
    if (!parsed.months[mId]) {
      const firstAvailable = Object.keys(parsed.months)[0];
      if (firstAvailable) {
        parsed.currentMonthId = firstAvailable;
      } else {
        return null;
      }
    }

    // Validate accounts and paycheck cycles for each month
    Object.keys(parsed.months).forEach((id) => {
      const month = parsed.months[id];
      if (!month || typeof month !== 'object') return;
      if (!Array.isArray(month.accounts) || month.accounts.length === 0) {
        month.accounts = DEFAULT_BANK_ACCOUNTS;
      } else {
        month.accounts = month.accounts.map((a: any) =>
          a.id === 'usaa' && a.name && a.name.includes('PenFed') ? { ...a, name: 'USAA' } : a
        );
        if (!month.accounts.some((a: any) => a.id === 'penfed')) {
          month.accounts.push({ id: 'penfed', name: 'PenFed', currentBalance: 0, color: '#8b5cf6' });
        }
      }
      if (!Array.isArray(month.paycheckCycles) || month.paycheckCycles.length === 0) {
        month.paycheckCycles = DEFAULT_PAYCHECK_CYCLES;
      }
      month.expenses = (month.expenses || []).map((e: any) => ({
        ...e,
        accountId: e.accountId || (month.accounts[0]?.id || 'usaa'),
      }));
      month.incomes = (month.incomes || []).map((i: any) => ({
        ...i,
        accountId: i.accountId || (month.accounts[0]?.id || 'usaa'),
      }));
    });

    if (!parsed.selectedAccountFilter) {
      parsed.selectedAccountFilter = 'all';
    }
    if (!parsed.selectedPayPeriodFilter) {
      parsed.selectedPayPeriodFilter = 'all';
    }
    if (!parsed.currency) {
      parsed.currency = '$';
    }

    return parsed as BudgetState;
  } catch (err) {
    console.error('Failed to sanitize budget state:', err);
    return null;
  }
}

export function loadBudgetState(): BudgetState {
  if (typeof window === 'undefined') return INITIAL_BUDGET_STATE;
  try {
    // Priority 1: Check URL Hash/Search Import parameter (#import=...)
    const hashImport = checkUrlHashForImport();
    if (hashImport) return hashImport;

    // Priority 2: Check LocalStorage primary & backup keys
    for (const key of BACKUP_STORAGE_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const sanitized = sanitizeBudgetState(raw);
        if (sanitized) {
          // If recovered from a secondary key, re-save to primary key
          if (key !== PRIMARY_STORAGE_KEY) {
            try {
              localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(sanitized));
            } catch (e) {
              // Ignore
            }
          }
          return sanitized;
        }
      }
    }

    // Priority 3: Check Shared Cookie Storage (Bridged between Mobile Safari & Installed PWA)
    const cookieState = loadFromCookie();
    if (cookieState) {
      try {
        localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(cookieState));
      } catch (e) {
        // Ignore
      }
      return cookieState;
    }

    // Do NOT write INITIAL_BUDGET_STATE to storage here; return it so async fallbacks can hydrate.
    return INITIAL_BUDGET_STATE;
  } catch (err) {
    console.error('Failed to load budget state from storage:', err);
    return INITIAL_BUDGET_STATE;
  }
}

export function saveBudgetState(state: BudgetState): void {
  if (typeof window === 'undefined') return;
  try {
    const timestamp = Date.now();
    const jsonString = JSON.stringify(state);

    // Save to primary key and backup key in localStorage
    localStorage.setItem(PRIMARY_STORAGE_KEY, jsonString);
    localStorage.setItem('flowledger_budget_state_pwa_backup', jsonString);
    localStorage.setItem('flowledger_budget_state_last_ts', String(timestamp));

    // Save lightweight cookie bridge
    saveToCookie(state);

    // Asynchronously persist to IndexedDB with timestamp and post BroadcastChannel update
    saveToIndexedDB('budget_state', { state, timestamp });
    notifyDataChanged(state);
  } catch (err) {
    console.error('Failed to save budget state to storage:', err);
  }
}

export function resetToDefault(): BudgetState {
  saveBudgetState(INITIAL_BUDGET_STATE);
  return INITIAL_BUDGET_STATE;
}

export function exportToJSON(state: BudgetState): string {
  return JSON.stringify(state, null, 2);
}

export function importFromJSON(jsonString: string): BudgetState | null {
  try {
    const parsed = sanitizeBudgetState(jsonString);
    if (parsed) {
      saveBudgetState(parsed);
      return parsed;
    }
  } catch (err) {
    console.error('Invalid JSON import:', err);
  }
  return null;
}

export function exportToCSV(month: BudgetMonth): string {
  const headers = ['Title', 'Amount', 'Bank Account', 'Due Day', 'Pay Period', 'Status', 'AutoPay', 'Payment Method', 'Notes'];
  
  const rows = month.expenses.map((e) => {
    const accountName = month.accounts.find((a) => a.id === e.accountId)?.name || e.accountId;
    return [
      `"${e.title.replace(/"/g, '""')}"`,
      e.amount,
      `"${accountName}"`,
      e.dueDate,
      e.payPeriod === 'period_1' ? '1st Half (5th-18th)' : e.payPeriod === 'period_2' ? '2nd Half (19th-2nd)' : 'Both',
      e.status.toUpperCase(),
      e.autoPay ? 'YES' : 'NO',
      `"${(e.paymentMethod || '').replace(/"/g, '""')}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
