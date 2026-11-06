import { BudgetState, BudgetMonth } from '../types/expense';
import { INITIAL_BUDGET_STATE, DEFAULT_BANK_ACCOUNTS, DEFAULT_PAYCHECK_CYCLES } from './seedData';

const PRIMARY_STORAGE_KEY = 'flowledger_budget_state_clean_v3';
const BACKUP_STORAGE_KEYS = [
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
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
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

function sanitizeBudgetState(rawState: any): BudgetState | null {
  if (!rawState || !rawState.months || !rawState.currentMonthId) return null;
  try {
    const parsed = typeof rawState === 'string' ? JSON.parse(rawState) : rawState;
    if (parsed && parsed.months && parsed.currentMonthId) {
      Object.keys(parsed.months).forEach((mId) => {
        const m = parsed.months[mId];
        if (!m.accounts || m.accounts.length === 0) {
          m.accounts = DEFAULT_BANK_ACCOUNTS;
        } else {
          m.accounts = m.accounts.map((a: any) => (a.id === 'usaa' && a.name.includes('PenFed') ? { ...a, name: 'USAA' } : a));
          if (!m.accounts.some((a: any) => a.id === 'penfed')) {
            m.accounts.push({ id: 'penfed', name: 'PenFed', currentBalance: 0, color: '#8b5cf6' });
          }
        }
        if (!m.paycheckCycles || m.paycheckCycles.length === 0) {
          m.paycheckCycles = DEFAULT_PAYCHECK_CYCLES;
        }
        m.expenses = (m.expenses || []).map((e: any) => ({
          ...e,
          accountId: e.accountId || 'usaa',
        }));
        m.incomes = (m.incomes || []).map((i: any) => ({
          ...i,
          accountId: i.accountId || 'usaa',
        }));
      });

      if (!parsed.selectedAccountFilter) {
        parsed.selectedAccountFilter = 'all';
      }

      return parsed as BudgetState;
    }
  } catch (err) {
    console.error('Failed to sanitize budget state:', err);
  }
  return null;
}

export function loadBudgetState(): BudgetState {
  if (typeof window === 'undefined') return INITIAL_BUDGET_STATE;
  try {
    // Check primary key first, then fall back to backup keys to ensure browser state is retained
    for (const key of BACKUP_STORAGE_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const sanitized = sanitizeBudgetState(raw);
        if (sanitized) {
          // Re-persist to primary & backup keys
          saveBudgetState(sanitized);
          return sanitized;
        }
      }
    }

    saveBudgetState(INITIAL_BUDGET_STATE);
    return INITIAL_BUDGET_STATE;
  } catch (err) {
    console.error('Failed to load budget state from storage:', err);
    return INITIAL_BUDGET_STATE;
  }
}

export function saveBudgetState(state: BudgetState): void {
  if (typeof window === 'undefined') return;
  try {
    const jsonString = JSON.stringify(state);
    localStorage.setItem(PRIMARY_STORAGE_KEY, jsonString);
    localStorage.setItem('flowledger_budget_state_pwa_backup', jsonString);
    localStorage.setItem('flowledger_budget_state_last_ts', Date.now().toString());

    // Asynchronously persist to IndexedDB and post BroadcastChannel update
    saveToIndexedDB('budget_state', state);
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
    const parsed = JSON.parse(jsonString);
    if (parsed && parsed.months && typeof parsed.currentMonthId === 'string') {
      saveBudgetState(parsed);
      return parsed;
    }
  } catch (err) {
    console.error('Invalid JSON import:', err);
  }
  return null;
}

export function exportToCSV(month: BudgetMonth): string {
  const headers = ['Title', 'Amount', 'Bank Account', 'Due Day', 'Category', 'Pay Period', 'Status', 'AutoPay', 'Payment Method', 'Notes'];
  
  const rows = month.expenses.map((e) => {
    const accountName = month.accounts.find((a) => a.id === e.accountId)?.name || e.accountId;
    return [
      `"${e.title.replace(/"/g, '""')}"`,
      e.amount,
      `"${accountName}"`,
      e.dueDate,
      `"${e.category}"`,
      e.payPeriod === 'period_1' ? '1st Half (5th-18th)' : e.payPeriod === 'period_2' ? '2nd Half (19th-2nd)' : 'Both',
      e.status.toUpperCase(),
      e.autoPay ? 'YES' : 'NO',
      `"${(e.paymentMethod || '').replace(/"/g, '""')}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
