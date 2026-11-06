import { BudgetState, BudgetMonth } from '../types/expense';
import { INITIAL_BUDGET_STATE, DEFAULT_BANK_ACCOUNTS, DEFAULT_PAYCHECK_CYCLES } from './seedData';

const STORAGE_KEY = 'flowledger_budget_state_clean_v3';

export function loadBudgetState(): BudgetState {
  if (typeof window === 'undefined') return INITIAL_BUDGET_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveBudgetState(INITIAL_BUDGET_STATE);
      return INITIAL_BUDGET_STATE;
    }
    const parsed: BudgetState = JSON.parse(raw);
    if (parsed && parsed.months && parsed.currentMonthId) {
      // Ensure each month has accounts and paycheckCycles
      Object.keys(parsed.months).forEach((mId) => {
        const m = parsed.months[mId];
        if (!m.accounts || m.accounts.length === 0) {
          m.accounts = DEFAULT_BANK_ACCOUNTS;
        } else {
          m.accounts = m.accounts.map((a) => (a.id === 'usaa' && a.name.includes('PenFed') ? { ...a, name: 'USAA' } : a));
          if (!m.accounts.some((a) => a.id === 'penfed')) {
            m.accounts.push({ id: 'penfed', name: 'PenFed', currentBalance: 0, color: '#8b5cf6' });
          }
        }
        if (!m.paycheckCycles || m.paycheckCycles.length === 0) {
          m.paycheckCycles = DEFAULT_PAYCHECK_CYCLES;
        }
        m.expenses = (m.expenses || []).map((e) => ({
          ...e,
          accountId: e.accountId || 'usaa',
        }));
        m.incomes = (m.incomes || []).map((i) => ({
          ...i,
          accountId: i.accountId || 'usaa',
        }));
      });

      if (!parsed.selectedAccountFilter) {
        parsed.selectedAccountFilter = 'all';
      }

      saveBudgetState(parsed);
      return parsed;
    }
    return INITIAL_BUDGET_STATE;
  } catch (err) {
    console.error('Failed to load budget state from storage:', err);
    return INITIAL_BUDGET_STATE;
  }
}

export function saveBudgetState(state: BudgetState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
