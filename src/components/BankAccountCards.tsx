import React, { useState } from 'react';
import { BankAccount, ExpenseItem, IncomeItem } from '../types/expense';
import { 
  Building2, 
  ArrowUpRight, 
  ArrowDownRight, 
  Edit2, 
  Check, 
  Scale, 
  ChevronDown, 
  ChevronUp,
  Plus,
  Trash2,
  Settings2,
  SlidersHorizontal
} from 'lucide-react';

interface BankAccountCardsProps {
  accounts: BankAccount[];
  expenses: ExpenseItem[];
  incomes: IncomeItem[];
  currency?: string;
  onUpdateAccountBalance: (accountId: string, newBalance: number) => void;
  onOpenManageAccounts: () => void;
  onOpenPaycheckCycles?: () => void;
  onDeleteAccount: (accountId: string) => void;
  selectedAccountFilter: string;
  onSelectAccountFilter: (accountId: string) => void;
  forceExpanded?: boolean;
}

export const BankAccountCards: React.FC<BankAccountCardsProps> = ({
  accounts,
  expenses,
  incomes,
  currency = '$',
  onUpdateAccountBalance,
  onOpenManageAccounts,
  onOpenPaycheckCycles,
  onDeleteAccount,
  selectedAccountFilter,
  onSelectAccountFilter,
  forceExpanded = false,
}) => {
  // Collapse by default unless forceExpanded (e.g. Duo Dual-Screen opened mode)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(!forceExpanded);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editBalanceValue, setEditBalanceValue] = useState<string>('');

  React.useEffect(() => {
    if (forceExpanded) {
      setIsCollapsed(false);
    }
  }, [forceExpanded]);

  const handleStartEdit = (account: BankAccount) => {
    setEditingAccountId(account.id);
    setEditBalanceValue(account.currentBalance.toString());
  };

  const handleSaveEdit = (accountId: string) => {
    const parsed = parseFloat(editBalanceValue);
    if (!isNaN(parsed)) {
      onUpdateAccountBalance(accountId, parsed);
    }
    setEditingAccountId(null);
  };

  // Compute metrics for each account
  const accountStats = accounts.map((acc) => {
    const accIncomes = incomes.filter((i) => i.accountId === acc.id);
    const totalIncome = accIncomes.reduce((sum, i) => sum + i.amount, 0);
    const receivedIncome = accIncomes.filter((i) => i.received).reduce((sum, i) => sum + i.amount, 0);

    const accExpenses = expenses.filter((e) => e.accountId === acc.id);
    const totalExpense = accExpenses.reduce((sum, e) => sum + e.amount, 0);
    const paidExpense = accExpenses.filter((e) => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0);
    const dueExpense = totalExpense - paidExpense;

    // Projected leftover after ALL transactions and incomes are settled
    const projectedLeftover = acc.currentBalance + totalIncome - totalExpense;

    // Settled current balance (starting balance + deposited income - paid expenses)
    const settledCurrentBalance = acc.currentBalance + receivedIncome - paidExpense;

    return {
      account: acc,
      totalIncome,
      receivedIncome,
      totalExpense,
      paidExpense,
      dueExpense,
      projectedLeftover,
      settledCurrentBalance,
      txCount: accExpenses.length,
    };
  });

  // Combined totals across all accounts
  const combinedStarting = accounts.reduce((sum, a) => sum + a.currentBalance, 0);
  const combinedTotalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const combinedTotalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const combinedProjectedLeftover = combinedStarting + combinedTotalIncome - combinedTotalExpense;

  return (
    <div className="mb-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 p-3.5 transition-all">
      {/* Header Bar with Toggle & Fast Account Selector */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-2 hover:opacity-80 transition text-left cursor-pointer select-none"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-emerald-400 shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-sm">Bank Accounts</span>
                <span className="text-[10px] font-mono font-medium text-slate-400 px-1.5 py-0.2 rounded bg-slate-800">
                  {accounts.length} {accounts.length === 1 ? 'Account' : 'Accounts'}
                </span>
                {isCollapsed ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {isCollapsed ? 'Click to expand balances & runway' : 'Live balances, inflows & runway'}
              </p>
            </div>
          </button>

          {/* Action buttons on the right of title */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onOpenManageAccounts}
              title="Add or delete bank accounts"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Banks</span>
            </button>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition active:scale-95 cursor-pointer"
            >
              <span>{isCollapsed ? 'Expand' : 'Collapse'}</span>
              {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Filter Pills row - flex wrap so nothing is ever clipped */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
          <div className="flex flex-wrap items-center gap-1 p-0.5 bg-slate-900 border border-slate-800 rounded-lg">
            <button
              onClick={() => onSelectAccountFilter('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition whitespace-nowrap cursor-pointer ${
                selectedAccountFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            {accounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => onSelectAccountFilter(acc.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition whitespace-nowrap cursor-pointer ${
                  selectedAccountFilter === acc.id
                    ? 'bg-slate-800 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: acc.color }} />
                <span>{acc.name}</span>
              </button>
            ))}
          </div>

          {onOpenPaycheckCycles && (
            <button
              onClick={onOpenPaycheckCycles}
              title="Configure Paycheck Periods & Bi-Weekly Dates"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition cursor-pointer active:scale-95"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pay Periods</span>
            </button>
          )}
        </div>
      </div>

      {/* Collapsed Compact Glance Row */}
      {isCollapsed && (
        <div className="mt-3 pt-3 border-t border-slate-800/60 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          {accountStats.map((stat) => {
            const acc = stat.account;
            const isSurplus = stat.projectedLeftover >= 0;

            return (
              <div
                key={acc.id}
                onClick={() => onSelectAccountFilter(selectedAccountFilter === acc.id ? 'all' : acc.id)}
                className={`p-2.5 rounded-xl border cursor-pointer transition select-none ${
                  selectedAccountFilter === acc.id
                    ? 'bg-slate-800/80 border-emerald-500/50'
                    : 'bg-slate-950/40 border-slate-800/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: acc.color }} />
                    <span className="font-semibold text-slate-200 truncate">{acc.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">({stat.txCount})</span>
                </div>
                <div className="flex items-baseline justify-between text-[11px] font-mono">
                  <span className="text-slate-300 font-bold tabular-nums">{currency}{acc.currentBalance.toLocaleString()}</span>
                  <span className={`font-semibold tabular-nums ${isSurplus ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isSurplus ? '+' : ''}{currency}{stat.projectedLeftover.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Combined Liquidity Tile - Spans full width when 2 accounts */}
          <div className="col-span-2 md:col-span-2 p-2.5 rounded-xl border bg-slate-950/60 border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Scale className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-semibold text-slate-200 text-xs block">Combined Leftover</span>
                <span className="text-[10px] text-slate-400 font-mono">Starting: {currency}{combinedStarting.toLocaleString()}</span>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-sm font-bold font-mono tabular-nums block ${combinedProjectedLeftover >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {combinedProjectedLeftover >= 0 ? '+' : ''}{currency}{combinedProjectedLeftover.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[9px] uppercase font-bold text-slate-500">Projected Runway</span>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Detailed Account Cards */}
      {!isCollapsed && (
        <div className="mt-4 pt-4 border-t border-slate-800/80">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {accountStats.map((stat) => {
              const acc = stat.account;
              const isSelected = selectedAccountFilter === acc.id;
              const isEditing = editingAccountId === acc.id;
              const isSurplus = stat.projectedLeftover >= 0;

              return (
                <div
                  key={acc.id}
                  className={`relative rounded-2xl p-3.5 transition-all border ${
                    isSelected
                      ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500/40 shadow-lg'
                      : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Account Card Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
                    <div className="flex items-center gap-2 truncate mr-1">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: acc.color }}
                      />
                      <span className="font-bold text-white text-xs truncate">{acc.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        ({stat.txCount})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pr-12 sm:pr-2">
                      {accounts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteAccount(acc.id)}
                          title={`Delete ${acc.name}`}
                          className="px-2 py-0.5 rounded text-[11px] font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 flex items-center gap-1 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectAccountFilter(isSelected ? 'all' : acc.id)}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded transition ${
                          isSelected
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'text-slate-400 hover:text-slate-200 bg-slate-800/50'
                        }`}
                      >
                        {isSelected ? 'Filtered' : 'Filter'}
                      </button>
                    </div>
                  </div>

                  {/* Bank Balance Input / Display */}
                  <div className="mb-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                      <span className="font-medium flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>Starting Bank Balance</span>
                      </span>
                      {!isEditing && (
                        <button
                          onClick={() => handleStartEdit(acc)}
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="relative flex-1">
                          <span className="absolute left-2 top-1 text-slate-400 text-xs font-mono">{currency}</span>
                          <input
                            type="number"
                            step="0.01"
                            autoFocus
                            value={editBalanceValue}
                            onChange={(e) => setEditBalanceValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(acc.id);
                              if (e.key === 'Escape') setEditingAccountId(null);
                            }}
                            className="w-full pl-5 pr-1 py-0.5 rounded bg-slate-800 border border-emerald-500 text-white font-mono font-bold text-sm focus:outline-none"
                          />
                        </div>
                        <button
                          onClick={() => handleSaveEdit(acc.id)}
                          className="p-1 rounded bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition"
                          title="Save"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-baseline justify-between">
                        <span className="text-lg font-bold text-white font-mono tabular-nums">
                          {currency}{acc.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-500">In bank today</span>
                      </div>
                    )}
                  </div>

                  {/* Inflows & Outflows for this bank */}
                  <div className="grid grid-cols-2 gap-1.5 text-xs mb-2.5">
                    <div className="p-1.5 rounded-lg bg-slate-950/40 border border-slate-800/60">
                      <span className="text-[9px] text-slate-400 block mb-0.5">Inflow</span>
                      <span className="font-mono font-bold text-emerald-400 text-[11px] block tabular-nums truncate">
                        +{currency}{stat.totalIncome.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-1.5 rounded-lg bg-slate-950/40 border border-slate-800/60">
                      <span className="text-[9px] text-slate-400 block mb-0.5">Bills Outflow</span>
                      <span className="font-mono font-bold text-rose-400 text-[11px] block tabular-nums truncate">
                        -{currency}{stat.totalExpense.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Highlight: Leftover After All Transactions */}
                  <div className={`p-2.5 rounded-xl border ${
                    isSurplus
                      ? 'bg-emerald-950/30 border-emerald-500/40'
                      : 'bg-rose-950/30 border-rose-500/40'
                  }`}>
                    <span className="text-[10px] font-semibold text-slate-300 block mb-0.5">
                      Leftover After All Bills
                    </span>

                    <div className="flex items-baseline justify-between">
                      <span className={`text-base font-bold font-mono tabular-nums ${
                        isSurplus ? 'text-emerald-300' : 'text-rose-400'
                      }`}>
                        {isSurplus ? '+' : ''}{currency}{stat.projectedLeftover.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className={`text-[9px] font-medium px-1 py-0.2 rounded ${
                        isSurplus ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {isSurplus ? 'Surplus' : 'Shortfall'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 mt-1 border-t border-slate-800/60 text-[9px] text-slate-400">
                      <span>Settled today (Paid):</span>
                      <span className="font-mono text-slate-300">
                        {currency}{stat.settledCurrentBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>

                  {/* Dedicated Action Footer (Unblockable on mobile / Duo) */}
                  <div className="flex items-center gap-2 pt-2.5 mt-2.5 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => onSelectAccountFilter(isSelected ? 'all' : acc.id)}
                      className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                        isSelected
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                      }`}
                    >
                      <span>{isSelected ? 'Viewing in Ledger' : 'Filter Ledger'}</span>
                    </button>
                    {accounts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteAccount(acc.id)}
                        className="py-1.5 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shrink-0"
                        title={`Delete ${acc.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Delete Account</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add Bank Account Tile */}
            <button
              onClick={onOpenManageAccounts}
              className="rounded-2xl p-4 border border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-900/30 hover:bg-slate-900/60 flex flex-col items-center justify-center text-center text-slate-400 hover:text-emerald-300 transition group min-h-[160px]"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-800 group-hover:bg-emerald-500/20 border border-slate-700 group-hover:border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-2 transition">
                <Plus className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs text-white block">Add Bank Account</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Track another checking or savings account</span>
            </button>

            {/* Combined Liquidity Card */}
            <div className="rounded-2xl p-3.5 bg-slate-900/50 border border-slate-800/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-bold text-white text-xs">Combined Total</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{accounts.length} Accounts</span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-800/40 text-[11px]">
                    <span className="text-slate-400">Total in Banks:</span>
                    <span className="font-mono font-bold text-white">
                      {currency}{combinedStarting.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-0.5 border-b border-slate-800/40 text-[11px]">
                    <span className="text-slate-400">Total Incomes:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      +{currency}{combinedTotalIncome.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-0.5 border-b border-slate-800/40 text-[11px]">
                    <span className="text-slate-400">Total Bills:</span>
                    <span className="font-mono font-bold text-rose-400">
                      -{currency}{combinedTotalExpense.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grand Combined Leftover */}
              <div className="p-2.5 mt-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="block text-[9px] text-slate-400 font-medium mb-0.5">
                  Combined Net Leftover
                </span>
                <div className="flex items-baseline justify-between">
                  <span className={`text-base font-bold font-mono tabular-nums ${
                    combinedProjectedLeftover >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {combinedProjectedLeftover >= 0 ? '+' : ''}{currency}{combinedProjectedLeftover.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9px] text-slate-500">All banks</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
