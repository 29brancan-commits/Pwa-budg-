import React, { useState, useMemo } from 'react';
import { BudgetState, ExpenseItem, IncomeItem, BudgetMonth, ExpenseStatus, BankAccount, PaycheckCycle } from './types/expense';
import { loadBudgetState, saveBudgetState } from './utils/storage';
import { Header, ActiveTab } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { BankAccountCards } from './components/BankAccountCards';
import { ExpenseList } from './components/ExpenseList';
import { CategoryDonutChart } from './components/Visualizations/CategoryDonutChart';
import { CashFlowWaterfallChart } from './components/Visualizations/CashFlowWaterfallChart';
import { BillCalendarView } from './components/Visualizations/BillCalendarView';
import { DebtPayoffChart } from './components/Visualizations/DebtPayoffChart';
import { SpendingTrendChart } from './components/Visualizations/SpendingTrendChart';
import { ExpenseModal } from './components/ExpenseModal';
import { IncomeManagerModal } from './components/IncomeManagerModal';
import { DataExportImportModal } from './components/DataExportImportModal';
import { ManageAccountsModal } from './components/ManageAccountsModal';
import { PaycheckCyclesModal } from './components/PaycheckCyclesModal';
import { ConfirmModal } from './components/ConfirmModal';

interface DeleteConfirmState {
  isOpen: boolean;
  id: string;
  title: string;
  amount?: number;
  type: 'expense' | 'account';
}

export default function App() {
  const [budgetState, setBudgetState] = useState<BudgetState>(() => loadBudgetState());
  const [activeTab, setActiveTab] = useState<ActiveTab>('ledger');
  
  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isManageAccountsOpen, setIsManageAccountsOpen] = useState(false);
  const [isPaycheckCyclesOpen, setIsPaycheckCyclesOpen] = useState(false);

  // Custom confirmation dialog state
  const [deleteConfirmState, setDeleteConfirmState] = useState<DeleteConfirmState | null>(null);

  // Sync to storage on change
  const handleUpdateState = (newState: BudgetState) => {
    setBudgetState(newState);
    saveBudgetState(newState);
  };

  const currentMonth: BudgetMonth = useMemo(() => {
    const month = budgetState.months[budgetState.currentMonthId] || Object.values(budgetState.months)[0];
    
    // Safety check for accounts
    let accounts = month.accounts;
    if (!accounts || accounts.length === 0) {
      accounts = [
        { id: 'ent', name: 'ENT Bank', currentBalance: 0, color: '#10b981' },
        { id: 'usaa', name: 'USAA', currentBalance: 0, color: '#3b82f6' },
        { id: 'penfed', name: 'PenFed', currentBalance: 0, color: '#8b5cf6' },
      ];
    } else if (!accounts.some((a) => a.id === 'penfed')) {
      accounts = [
        ...accounts.map((a) => (a.id === 'usaa' && a.name.includes('PenFed') ? { ...a, name: 'USAA' } : a)),
        { id: 'penfed', name: 'PenFed', currentBalance: 0, color: '#8b5cf6' },
      ];
    }

    // Safety check for paycheck cycles
    let cycles = month.paycheckCycles;
    if (!cycles || cycles.length === 0) {
      cycles = [
        { id: 'cycle-1', label: '1st Half (5th – 18th)', startDay: 5, endDay: 18 },
        { id: 'cycle-2', label: '2nd Half (19th – 4th)', startDay: 19, endDay: 4 },
      ];
    }

    return {
      ...month,
      accounts,
      paycheckCycles: cycles,
    };
  }, [budgetState]);

  const currency = budgetState.currency || '$';

  // Available months list for dropdown
  const availableMonths = useMemo(() => {
    return Object.values(budgetState.months).map((m) => ({
      id: m.id,
      label: m.label,
    }));
  }, [budgetState.months]);

  const handleSelectMonth = (monthId: string) => {
    handleUpdateState({
      ...budgetState,
      currentMonthId: monthId,
    });
  };

  // Update starting/current bank balance
  const handleUpdateAccountBalance = (accountId: string, newBalance: number) => {
    const updatedAccounts = currentMonth.accounts.map((acc) =>
      acc.id === accountId ? { ...acc, currentBalance: newBalance } : acc
    );

    const updatedMonth: BudgetMonth = {
      ...currentMonth,
      accounts: updatedAccounts,
    };

    handleUpdateState({
      ...budgetState,
      months: {
        ...budgetState.months,
        [currentMonth.id]: updatedMonth,
      },
    });
  };

  // Add Bank Account
  const handleAddAccount = (name: string, startingBalance: number, color: string) => {
    const newAccount: BankAccount = {
      id: `acc-${Date.now()}`,
      name,
      currentBalance: startingBalance,
      color,
    };

    const updatedMonth: BudgetMonth = {
      ...currentMonth,
      accounts: [...currentMonth.accounts, newAccount],
    };

    handleUpdateState({
      ...budgetState,
      months: {
        ...budgetState.months,
        [currentMonth.id]: updatedMonth,
      },
    });
  };

  // Update Bank Account Name/Balance/Color
  const handleUpdateAccount = (accountId: string, name: string, balance: number, color: string) => {
    const updatedAccounts = currentMonth.accounts.map((acc) =>
      acc.id === accountId ? { ...acc, name, currentBalance: balance, color } : acc
    );

    const updatedMonth: BudgetMonth = {
      ...currentMonth,
      accounts: updatedAccounts,
    };

    handleUpdateState({
      ...budgetState,
      months: {
        ...budgetState.months,
        [currentMonth.id]: updatedMonth,
      },
    });
  };

  // Direct / confirmed delete account execution
  const executeDeleteAccount = (accountId: string) => {
    if (currentMonth.accounts.length <= 1) return;

    const remainingAccounts = currentMonth.accounts.filter((a) => a.id !== accountId);
    const fallbackAccountId = remainingAccounts[0].id;

    // Safely reassign any expenses or incomes from the deleted bank account
    const reassignedExpenses = currentMonth.expenses.map((e) =>
      e.accountId === accountId ? { ...e, accountId: fallbackAccountId } : e
    );

    const reassignedIncomes = currentMonth.incomes.map((i) =>
      i.accountId === accountId ? { ...i, accountId: fallbackAccountId } : i
    );

    const updatedMonth: BudgetMonth = {
      ...currentMonth,
      accounts: remainingAccounts,
      expenses: reassignedExpenses,
      incomes: reassignedIncomes,
    };

    // Reset filter if user was viewing the deleted bank account
    const nextFilter =
      budgetState.selectedAccountFilter === accountId ? 'all' : budgetState.selectedAccountFilter;

    handleUpdateState({
      ...budgetState,
      selectedAccountFilter: nextFilter,
      months: {
        ...budgetState.months,
        [currentMonth.id]: updatedMonth,
      },
    });
  };

  // Prompt delete account via ConfirmModal
  const handleRequestDeleteAccount = (accountId: string) => {
    if (currentMonth.accounts.length <= 1) {
      return;
    }
    const acc = currentMonth.accounts.find((a) => a.id === accountId);
    setDeleteConfirmState({
      isOpen: true,
      id: accountId,
      title: acc ? `Delete Account "${acc.name}"?` : 'Delete Bank Account?',
      type: 'account',
    });
  };

  // Save Paycheck Cycles
  const handleSavePaycheckCycles = (cycles: PaycheckCycle[]) => {
    const updatedMonth: BudgetMonth = {
      ...currentMonth,
      paycheckCycles: cycles,
    };

    handleUpdateState({
      ...budgetState,
      months: {
        ...budgetState.months,
        [currentMonth.id]: updatedMonth,
      },
    });
  };

  // Filter ledger by bank account
  const handleSelectAccountFilter = (accountId: string) => {
    handleUpdateState({
      ...budgetState,
      selectedAccountFilter: accountId,
    });
  };

  // Toggle Expense Status (Paid <-> Due)
  const handleToggleExpenseStatus = (id: string) => {
    const updatedExpenses = currentMonth.expenses.map((e) => {
      if (e.id === id) {
        const nextStatus: ExpenseStatus = e.status === 'paid' ? 'due' : 'paid';
        return {
          ...e,
          status: nextStatus,
          paidDate: nextStatus === 'paid' ? new Date().toISOString() : undefined,
        };
      }
      return e;
    });

    const updatedMonth: BudgetMonth = {
      ...currentMonth,
      expenses: updatedExpenses,
    };

    handleUpdateState({
      ...budgetState,
      months: {
        ...budgetState.months,
        [currentMonth.id]: updatedMonth,
      },
    });
  };

  // Save (Create or Update) Expense
  const handleSaveExpense = (item: ExpenseItem) => {
    const exists = currentMonth.expenses.some((e) => e.id === item.id);
    let updatedExpenses: ExpenseItem[];
    if (exists) {
      updatedExpenses = currentMonth.expenses.map((e) => (e.id === item.id ? item : e));
    } else {
      updatedExpenses = [item, ...currentMonth.expenses];
    }

    const updatedMonth: BudgetMonth = {
      ...currentMonth,
      expenses: updatedExpenses,
    };

    handleUpdateState({
      ...budgetState,
      months: {
        ...budgetState.months,
        [currentMonth.id]: updatedMonth,
      },
    });
    setEditingExpense(null);
  };

  // Request Delete Expense via ConfirmModal
  const handleRequestDeleteExpense = (id: string) => {
    const item = currentMonth.expenses.find((e) => e.id === id);
    setDeleteConfirmState({
      isOpen: true,
      id,
      title: item ? `Delete "${item.title}"?` : 'Delete Obligation?',
      amount: item?.amount,
      type: 'expense',
    });
  };

  // Execute deletion confirmed by user
  const handleConfirmDelete = () => {
    if (!deleteConfirmState) return;

    if (deleteConfirmState.type === 'expense') {
      const updatedExpenses = currentMonth.expenses.filter((e) => e.id !== deleteConfirmState.id);
      const updatedMonth: BudgetMonth = {
        ...currentMonth,
        expenses: updatedExpenses,
      };

      handleUpdateState({
        ...budgetState,
        months: {
          ...budgetState.months,
          [currentMonth.id]: updatedMonth,
        },
      });
    } else if (deleteConfirmState.type === 'account') {
      executeDeleteAccount(deleteConfirmState.id);
    }

    setDeleteConfirmState(null);
  };

  // Save Incomes
  const handleSaveIncomes = (incomes: IncomeItem[]) => {
    const updatedMonth: BudgetMonth = {
      ...currentMonth,
      incomes,
    };

    handleUpdateState({
      ...budgetState,
      months: {
        ...budgetState.months,
        [currentMonth.id]: updatedMonth,
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenAddModal={() => {
          setEditingExpense(null);
          setIsAddExpenseOpen(true);
        }}
        onOpenIncomeModal={() => setIsIncomeModalOpen(true)}
        onOpenDataModal={() => setIsDataModalOpen(true)}
        onOpenPaycheckCyclesModal={() => setIsPaycheckCyclesOpen(true)}
        onOpenManageAccountsModal={() => setIsManageAccountsOpen(true)}
        currentMonthLabel={currentMonth.label}
        availableMonths={availableMonths}
        currentMonthId={budgetState.currentMonthId}
        onSelectMonth={handleSelectMonth}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-5 pb-24 md:pb-12">
        {/* Bank Accounts Section with Editable Balances & Real-Time Leftover Calculation */}
        <section aria-label="Bank Accounts & Leftover Runway">
          <BankAccountCards
            accounts={currentMonth.accounts}
            expenses={currentMonth.expenses}
            incomes={currentMonth.incomes}
            currency={currency}
            onUpdateAccountBalance={handleUpdateAccountBalance}
            onOpenManageAccounts={() => setIsManageAccountsOpen(true)}
            onDeleteAccount={handleRequestDeleteAccount}
            selectedAccountFilter={budgetState.selectedAccountFilter || 'all'}
            onSelectAccountFilter={handleSelectAccountFilter}
          />
        </section>

        {/* Dynamic Views According to Active Tab */}
        {activeTab === 'ledger' && (
          <section className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-4 lg:p-6 shadow-sm">
            <ExpenseList
              expenses={currentMonth.expenses}
              accounts={currentMonth.accounts}
              paycheckCycles={currentMonth.paycheckCycles}
              selectedAccountFilter={budgetState.selectedAccountFilter || 'all'}
              onSelectAccountFilter={handleSelectAccountFilter}
              currency={currency}
              onToggleStatus={handleToggleExpenseStatus}
              onEditExpense={(item) => {
                setEditingExpense(item);
                setIsAddExpenseOpen(true);
              }}
              onDeleteExpense={handleRequestDeleteExpense}
              onAddNew={() => {
                setEditingExpense(null);
                setIsAddExpenseOpen(true);
              }}
            />
          </section>
        )}

        {activeTab === 'charts' && (
          <div className="space-y-6">
            {/* Top row: Cash Flow Waterfall & Category Donut */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-4 lg:p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 shadow-sm">
                <CashFlowWaterfallChart
                  expenses={currentMonth.expenses}
                  incomes={currentMonth.incomes}
                  accounts={currentMonth.accounts}
                  paycheckCycles={currentMonth.paycheckCycles}
                  currency={currency}
                />
              </div>

              <div className="p-4 lg:p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 shadow-sm">
                <CategoryDonutChart
                  expenses={currentMonth.expenses}
                  currency={currency}
                />
              </div>
            </div>

            {/* Bottom row: Multi-month trends */}
            <div className="p-4 lg:p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 shadow-sm">
              <SpendingTrendChart state={budgetState} />
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="p-4 lg:p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 shadow-sm">
            <BillCalendarView
              expenses={currentMonth.expenses}
              currency={currency}
              onToggleStatus={handleToggleExpenseStatus}
            />
          </div>
        )}

        {activeTab === 'debt' && (
          <div className="p-4 lg:p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 shadow-sm">
            <DebtPayoffChart
              expenses={currentMonth.expenses}
              currency={currency}
            />
          </div>
        )}
      </main>

      {/* Mobile Ergonomic Bottom Tab Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenIncomeModal={() => setIsIncomeModalOpen(true)}
      />

      {/* Offline Connectivity Status Pill */}
      <OfflineIndicator />

      {/* Add / Edit Expense Modal */}
      <ExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => {
          setIsAddExpenseOpen(false);
          setEditingExpense(null);
        }}
        onSave={handleSaveExpense}
        onDelete={handleRequestDeleteExpense}
        initialExpense={editingExpense}
        accounts={currentMonth.accounts}
        paycheckCycles={currentMonth.paycheckCycles}
        currency={currency}
      />

      {/* Income / Paycheck Manager Modal */}
      <IncomeManagerModal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        incomes={currentMonth.incomes}
        accounts={currentMonth.accounts}
        paycheckCycles={currentMonth.paycheckCycles}
        onSaveIncomes={handleSaveIncomes}
        currency={currency}
      />

      {/* Bank Accounts Manager Modal (Add, Edit, Delete) */}
      <ManageAccountsModal
        isOpen={isManageAccountsOpen}
        onClose={() => setIsManageAccountsOpen(false)}
        accounts={currentMonth.accounts}
        onAddAccount={handleAddAccount}
        onDeleteAccount={executeDeleteAccount}
        onUpdateAccount={handleUpdateAccount}
        currency={currency}
      />

      {/* Paycheck Cycles Configuration Modal */}
      <PaycheckCyclesModal
        isOpen={isPaycheckCyclesOpen}
        onClose={() => setIsPaycheckCyclesOpen(false)}
        cycles={currentMonth.paycheckCycles}
        onSaveCycles={handleSavePaycheckCycles}
      />

      {/* Data Management, Export/Import & Cloudflare Hosting Modal */}
      <DataExportImportModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        state={budgetState}
        onUpdateState={handleUpdateState}
        currentMonth={currentMonth}
      />

      {/* Safe In-App Confirmation Modal (Replaces browser window.confirm) */}
      <ConfirmModal
        isOpen={!!deleteConfirmState?.isOpen}
        onClose={() => setDeleteConfirmState(null)}
        onConfirm={handleConfirmDelete}
        title={deleteConfirmState?.title || 'Confirm Deletion'}
        message={
          deleteConfirmState?.type === 'expense' ? (
            <span>
              Are you sure you want to remove this obligation from your budget
              {deleteConfirmState.amount !== undefined ? (
                <>
                  {' '}for{' '}
                  <strong className="text-white font-mono">
                    {currency}{deleteConfirmState.amount.toLocaleString()}
                  </strong>
                </>
              ) : null}
              ? This will immediately recalculate your remaining bank balance and runway.
            </span>
          ) : (
            <span>
              Are you sure you want to delete this bank account? Any expenses or paychecks currently assigned to it will be safely reassigned to your remaining account.
            </span>
          )
        }
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        icon="trash"
      />
    </div>
  );
}
