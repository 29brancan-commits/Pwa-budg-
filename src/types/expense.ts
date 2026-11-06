export type ExpenseStatus = 'due' | 'paid' | 'pending';

export type ExpenseCategory = 
  | 'Housing' 
  | 'Utilities' 
  | 'Debt & Credit' 
  | 'Auto & Transport' 
  | 'Insurance & Health' 
  | 'Subscriptions' 
  | 'Family & Child Support' 
  | 'Personal Loans' 
  | 'Other';

export interface PaycheckCycle {
  id: string; // e.g. "cycle-1", "cycle-2"
  label: string; // e.g. "1st Half (5th–18th)"
  startDay: number; // e.g. 5
  endDay: number; // e.g. 18
}

export interface BankAccount {
  id: string; // "ent", "usaa", "penfed", or custom
  name: string; // "ENT Bank", "USAA", "PenFed"
  currentBalance: number; // Editable starting balance in bank account
  color: string; // Accent color hex
}

export interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  dueDate: number; // Day of the month (1-31)
  category: ExpenseCategory;
  payPeriod: string; // Configurable cycle id or 'both'
  status: ExpenseStatus;
  autoPay: boolean;
  paymentMethod: string; // e.g. "A-citi cc", "A-USAA 1425", "Manual"
  accountId: string; // Bank account id
  paidDate?: string;
  notes?: string;
}

export interface IncomeItem {
  id: string;
  source: string; // e.g. "Army Paycheck", "ENT Allowance"
  amount: number;
  payPeriod: string; // Configurable cycle id
  expectedDay: number; // e.g. 5 or 19
  received: boolean;
  accountId: string; // Bank account id
}

export interface BudgetMonth {
  id: string; // "2026-11"
  label: string; // "November 2026"
  accounts: BankAccount[];
  paycheckCycles: PaycheckCycle[];
  expenses: ExpenseItem[];
  incomes: IncomeItem[];
}

export interface BudgetState {
  currentMonthId: string;
  months: Record<string, BudgetMonth>;
  selectedPayPeriodFilter: string; // 'all' | cycle id
  selectedAccountFilter: string; // 'all' | account id
  currency: string;
}
