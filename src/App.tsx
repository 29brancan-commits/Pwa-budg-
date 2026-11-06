import React, { useState, useMemo, useEffect, useRef } from 'react';
import { BudgetState, ExpenseItem, IncomeItem, BudgetMonth, ExpenseStatus, BankAccount, PaycheckCycle } from './types/expense';
import { loadBudgetState, saveBudgetState, loadFromIndexedDB } from './utils/storage';
import { 
  GitHubConfig, 
  loadGitHubConfig, 
  saveGitHubConfig, 
  saveDataToGitHub,
  loadDataFromGitHub
} from './utils/githubSync';
import {
  CloudflareConfig,
  loadCloudflareConfig,
  saveCloudflareConfig,
  saveDataToCloudflare,
  loadDataFromCloudflare
} from './utils/cloudflareSync';
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
  
  // GitHub Auto-Save & Sync State
  const [gitHubConfig, setGitHubConfig] = useState<GitHubConfig>(() => loadGitHubConfig());
  const [gitHubSyncStatus, setGitHubSyncStatus] = useState<'idle' | 'saving' | 'synced' | 'error'>('idle');

  // Cloudflare Auto-Save & Sync State
  const [cloudflareConfig, setCloudflareConfig] = useState<CloudflareConfig>(() => loadCloudflareConfig());
  const [cloudflareSyncStatus, setCloudflareSyncStatus] = useState<'idle' | 'saving' | 'synced' | 'error'>('idle');

  const [dataModalTab, setDataModalTab] = useState<'github' | 'backup' | 'cloudflare'>('github');

  // Duo Dual-Screen Mode State (Opened = 2 panes side-by-side; Closed = single column stacked)
  const [isDualPaneMode, setIsDualPaneMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const isSpanned = window.matchMedia?.('(horizontal-viewport-segments: 2), (screen-spanning: single-fold-vertical)')?.matches;
      return Boolean(isSpanned || window.innerWidth >= 850);
    }
    return false;
  });

  const manualDualPaneOverride = useRef<boolean | null>(null);

  useEffect(() => {
    const handleViewportChange = () => {
      if (manualDualPaneOverride.current === null) {
        const isSpanned = window.matchMedia?.('(horizontal-viewport-segments: 2), (screen-spanning: single-fold-vertical)')?.matches;
        const shouldBeDual = Boolean(isSpanned || window.innerWidth >= 850);
        setIsDualPaneMode(shouldBeDual);
      }
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
    };
  }, []);

  // Asynchronous hydration from IndexedDB, localStorage storage events, GitHub sync, and Cloudflare sync
  useEffect(() => {
    // 1. Asynchronously check IndexedDB
    loadFromIndexedDB('budget_state').then((idbState) => {
      if (idbState && idbState.months && idbState.currentMonthId) {
        setBudgetState((prevState) => {
          const prevHasExpenses = Object.values(prevState.months).some((m) => m.expenses && m.expenses.length > 0);
          const idbHasExpenses = Object.values(idbState.months).some((m: any) => m.expenses && m.expenses.length > 0);
          if (!prevHasExpenses || idbHasExpenses) {
            saveBudgetState(idbState);
            return idbState;
          }
          return prevState;
        });
      }
    });

    // 2. Listen to cross-window BroadcastChannel and StorageEvent for instant sync
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('flowledger_budget_state')) {
        const reloaded = loadBudgetState();
        setBudgetState(reloaded);
      }
      if (e.key === 'flowledger_github_config_v1') {
        setGitHubConfig(loadGitHubConfig());
      }
      if (e.key === 'flowledger_cloudflare_config_v1') {
        setCloudflareConfig(loadCloudflareConfig());
      }
    };

    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        channel = new BroadcastChannel('flowledger_pwa_channel');
        channel.onmessage = (evt) => {
          if (evt.data && evt.data.type === 'STATE_UPDATED' && evt.data.state) {
            setBudgetState(evt.data.state);
          }
        };
      } catch (e) {
        // Ignore
      }
    }

    window.addEventListener('storage', handleStorageChange);

    // 3. Auto-load latest state from GitHub if token & repo configured
    if (gitHubConfig.enabled && gitHubConfig.token && gitHubConfig.owner && gitHubConfig.repo) {
      loadDataFromGitHub(gitHubConfig).then((res) => {
        if (res.success && res.state) {
          setBudgetState(res.state);
          saveBudgetState(res.state);
          setGitHubSyncStatus('synced');
        }
      });
    }

    // 4. Auto-load latest state from Cloudflare if enabled
    if (cloudflareConfig.enabled) {
      loadDataFromCloudflare(cloudflareConfig).then((res) => {
        if (res.success && res.state) {
          setBudgetState(res.state);
          saveBudgetState(res.state);
          setCloudflareSyncStatus('synced');
        }
      });
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (channel) channel.close();
    };
  }, []);

  const handleToggleDualPaneMode = () => {
    setIsDualPaneMode((prev) => {
      const next = !prev;
      manualDualPaneOverride.current = next;
      return next;
    });
  };

  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isManageAccountsOpen, setIsManageAccountsOpen] = useState(false);
  const [isPaycheckCyclesOpen, setIsPaycheckCyclesOpen] = useState(false);

  // Custom confirmation dialog state
  const [deleteConfirmState, setDeleteConfirmState] = useState<DeleteConfirmState | null>(null);

  // Sync to local storage on change
  const handleUpdateState = (newState: BudgetState) => {
    setBudgetState(newState);
    saveBudgetState(newState);
  };

  // Continuous Auto-Save to GitHub on every data update
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!gitHubConfig.enabled || !gitHubConfig.token || !gitHubConfig.repo || !gitHubConfig.autoSave) {
      return;
    }

    setGitHubSyncStatus('saving');
    const timer = setTimeout(async () => {
      const res = await saveDataToGitHub(gitHubConfig, budgetState);
      if (res.success) {
        setGitHubSyncStatus('synced');
        setGitHubConfig((prev) => ({
          ...prev,
          lastSyncedAt: res.syncedAt,
          lastCommitSha: res.commitSha,
        }));
      } else {
        setGitHubSyncStatus('error');
      }
    }, 1800);

    return () => clearTimeout(timer);
  }, [budgetState, gitHubConfig]);

  // Continuous Auto-Save to Cloudflare on every data update
  const isCfInitialMount = useRef(true);
  useEffect(() => {
    if (isCfInitialMount.current) {
      isCfInitialMount.current = false;
      return;
    }

    if (!cloudflareConfig.enabled || !cloudflareConfig.autoSave) {
      return;
    }

    setCloudflareSyncStatus('saving');
    const timer = setTimeout(async () => {
      const res = await saveDataToCloudflare(cloudflareConfig, budgetState);
      if (res.success) {
        setCloudflareSyncStatus('synced');
        setCloudflareConfig((prev) => ({
          ...prev,
          lastSyncedAt: res.syncedAt,
        }));
      } else {
        setCloudflareSyncStatus('error');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [budgetState, cloudflareConfig]);

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
        onOpenDataModal={(tab = 'github') => {
          setDataModalTab(tab);
          setIsDataModalOpen(true);
        }}
        onOpenPaycheckCyclesModal={() => setIsPaycheckCyclesOpen(true)}
        onOpenManageAccountsModal={() => setIsManageAccountsOpen(true)}
        currentMonthLabel={currentMonth.label}
        availableMonths={availableMonths}
        currentMonthId={budgetState.currentMonthId}
        onSelectMonth={handleSelectMonth}
        gitHubSyncStatus={gitHubSyncStatus}
        isGitHubConnected={Boolean(gitHubConfig.enabled && gitHubConfig.token && gitHubConfig.repo)}
        lastSyncedCommit={gitHubConfig.lastCommitSha}
        cloudflareSyncStatus={cloudflareSyncStatus}
        isCloudflareConnected={Boolean(cloudflareConfig.enabled && (cloudflareConfig.apiToken || cloudflareConfig.workerEndpoint))}
        isDualPaneMode={isDualPaneMode}
        onToggleDualPaneMode={handleToggleDualPaneMode}
      />

      {/* Main Container: Full width up to 1920px so unfolded Duo display is completely filled */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-5 pb-24 md:pb-12">
        {/* Duo Opened Dual-Screen Layout (Side-by-Side 2-Screen Panels) */}
        {isDualPaneMode ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 xl:gap-12 items-start w-full">
            {/* Screen 1 (Left Display): Bank Accounts & Leftover Runway Command Center */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                    Screen 1 · Financial Hub
                  </span>
                  <span className="text-xs text-slate-400">Live Balances & Inflows</span>
                </div>
              </div>

              <section aria-label="Bank Accounts & Leftover Runway">
                <BankAccountCards
                  accounts={currentMonth.accounts}
                  expenses={currentMonth.expenses}
                  incomes={currentMonth.incomes}
                  currency={currency}
                  onUpdateAccountBalance={handleUpdateAccountBalance}
                  onOpenManageAccounts={() => setIsManageAccountsOpen(true)}
                  onOpenPaycheckCycles={() => setIsPaycheckCyclesOpen(true)}
                  onDeleteAccount={handleRequestDeleteAccount}
                  selectedAccountFilter={budgetState.selectedAccountFilter || 'all'}
                  onSelectAccountFilter={handleSelectAccountFilter}
                  forceExpanded={true}
                />
              </section>

              {/* Paycheck Cycles Overview for Screen 1 */}
              <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">Bi-Weekly Pay Cycles</span>
                    <span className="text-[10px] text-slate-400 font-mono">({currentMonth.paycheckCycles.length})</span>
                  </div>
                  <button
                    onClick={() => setIsPaycheckCyclesOpen(true)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer active:scale-95 transition"
                  >
                    Edit Dates
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {currentMonth.paycheckCycles.map((cycle, idx) => {
                    const cycleExpenses = currentMonth.expenses.filter((e) => e.payPeriod === cycle.id || e.payPeriod === 'both');
                    const cycleTotal = cycleExpenses.reduce((sum, e) => sum + e.amount, 0);
                    return (
                      <div key={cycle.id || idx} className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/70">
                        <span className="text-[11px] font-semibold text-slate-300 block truncate">{cycle.label}</span>
                        <span className="text-[10px] text-slate-400 block mb-1">Days {cycle.startDay} – {cycle.endDay}</span>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-mono font-bold text-white tabular-nums">
                            {currency}{cycleTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-slate-400">allocated</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Screen 2 (Right Display): Active View (Ledger / Charts / Calendar / Debt) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                    Screen 2 · {activeTab === 'ledger' ? 'Obligations Ledger' : activeTab === 'charts' ? 'Cash Flow & Analytics' : activeTab === 'calendar' ? 'Due Schedule' : 'Debt Snowball'}
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setActiveTab('ledger')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer active:scale-95 ${
                      activeTab === 'ledger' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Ledger
                  </button>
                  <button
                    onClick={() => setActiveTab('charts')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer active:scale-95 ${
                      activeTab === 'charts' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Charts
                  </button>
                  <button
                    onClick={() => setActiveTab('calendar')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer active:scale-95 ${
                      activeTab === 'calendar' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Calendar
                  </button>
                  <button
                    onClick={() => setActiveTab('debt')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer active:scale-95 ${
                      activeTab === 'debt' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Debt
                  </button>
                </div>
              </div>
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
                    onOpenPaycheckCycles={() => setIsPaycheckCyclesOpen(true)}
                  />
                </section>
              )}

              {activeTab === 'charts' && (
                <div className="space-y-6">
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
            </div>
          </div>
        ) : (
          /* Duo Closed / Single Screen Stacked Layout */
          <div className="w-full max-w-4xl mx-auto space-y-4">
            <section aria-label="Bank Accounts & Leftover Runway">
              <BankAccountCards
                accounts={currentMonth.accounts}
                expenses={currentMonth.expenses}
                incomes={currentMonth.incomes}
                currency={currency}
                onUpdateAccountBalance={handleUpdateAccountBalance}
                onOpenManageAccounts={() => setIsManageAccountsOpen(true)}
                onOpenPaycheckCycles={() => setIsPaycheckCyclesOpen(true)}
                onDeleteAccount={handleRequestDeleteAccount}
                selectedAccountFilter={budgetState.selectedAccountFilter || 'all'}
                onSelectAccountFilter={handleSelectAccountFilter}
              />
            </section>

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
                  onOpenPaycheckCycles={() => setIsPaycheckCyclesOpen(true)}
                />
              </section>
            )}

            {activeTab === 'charts' && (
              <div className="space-y-6">
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
          </div>
        )}
      </main>

      {/* Mobile Ergonomic Bottom Tab Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenIncomeModal={() => setIsIncomeModalOpen(true)}
        isHidden={isDualPaneMode}
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
        onOpenPaycheckCycles={() => setIsPaycheckCyclesOpen(true)}
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
        onOpenPaycheckCycles={() => setIsPaycheckCyclesOpen(true)}
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

      {/* Data Management, Export/Import, GitHub Auto-Sync & Cloudflare Modal */}
      <DataExportImportModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        state={budgetState}
        onUpdateState={handleUpdateState}
        currentMonth={currentMonth}
        gitHubConfig={gitHubConfig}
        onUpdateGitHubConfig={(newCfg) => {
          setGitHubConfig(newCfg);
          saveGitHubConfig(newCfg);
        }}
        cloudflareConfig={cloudflareConfig}
        onUpdateCloudflareConfig={(newCfg) => {
          setCloudflareConfig(newCfg);
          saveCloudflareConfig(newCfg);
        }}
        initialTab={dataModalTab}
        onSyncSuccess={() => {
          setGitHubSyncStatus('synced');
          setCloudflareSyncStatus('synced');
        }}
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

