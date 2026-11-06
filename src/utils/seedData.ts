import { BudgetState, BankAccount, PaycheckCycle } from '../types/expense';

export const DEFAULT_BANK_ACCOUNTS: BankAccount[] = [
  { id: 'ent', name: 'ENT Bank', currentBalance: 0, color: '#10b981' },
  { id: 'usaa', name: 'USAA', currentBalance: 0, color: '#3b82f6' },
  { id: 'penfed', name: 'PenFed', currentBalance: 0, color: '#8b5cf6' },
];

export const DEFAULT_PAYCHECK_CYCLES: PaycheckCycle[] = [
  { id: 'cycle-1', label: '1st Half (5th – 18th)', startDay: 5, endDay: 18 },
  { id: 'cycle-2', label: '2nd Half (19th – 4th)', startDay: 19, endDay: 4 },
];

// Current month
const now = new Date();
const currentMonthId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const currentMonthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

export const INITIAL_BUDGET_STATE: BudgetState = {
  currentMonthId,
  selectedPayPeriodFilter: 'all',
  selectedAccountFilter: 'all',
  currency: '$',
  months: {
    [currentMonthId]: {
      id: currentMonthId,
      label: currentMonthLabel,
      accounts: DEFAULT_BANK_ACCOUNTS,
      paycheckCycles: DEFAULT_PAYCHECK_CYCLES,
      expenses: [],
      incomes: [],
    },
  },
};
