import React, { useState, useMemo } from 'react';
import { ExpenseItem, ExpenseCategory, ExpenseStatus, BankAccount, PaycheckCycle } from '../types/expense';
import { 
  Search, 
  Check, 
  Clock, 
  AlertCircle, 
  Edit3, 
  Trash2, 
  Zap, 
  ArrowUpDown, 
  Plus,
  Building2,
  SlidersHorizontal
} from 'lucide-react';

interface ExpenseListProps {
  expenses: ExpenseItem[];
  accounts: BankAccount[];
  paycheckCycles?: PaycheckCycle[];
  selectedAccountFilter: string;
  onSelectAccountFilter: (accountId: string) => void;
  currency?: string;
  onToggleStatus: (id: string) => void;
  onEditExpense: (expense: ExpenseItem) => void;
  onDeleteExpense: (id: string) => void;
  onAddNew: () => void;
  onOpenPaycheckCycles?: () => void;
  onToggleAccount?: (expenseId: string) => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  accounts,
  paycheckCycles = [],
  selectedAccountFilter,
  onSelectAccountFilter,
  currency = '$',
  onToggleStatus,
  onEditExpense,
  onDeleteExpense,
  onAddNew,
  onOpenPaycheckCycles,
  onToggleAccount,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'dueDate' | 'amount' | 'title' | 'status'>('dueDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filter & Sort
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((item) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = item.title.toLowerCase().includes(q);
          const matchesCat = item.category.toLowerCase().includes(q);
          const matchesMethod = (item.paymentMethod || '').toLowerCase().includes(q);
          const matchesNotes = (item.notes || '').toLowerCase().includes(q);
          if (!matchesTitle && !matchesCat && !matchesMethod && !matchesNotes) {
            return false;
          }
        }

        // Bank Account Filter
        if (selectedAccountFilter !== 'all' && item.accountId !== selectedAccountFilter) {
          return false;
        }

        // Category
        if (categoryFilter !== 'all' && item.category !== categoryFilter) {
          return false;
        }

        // Status
        if (statusFilter !== 'all' && item.status !== statusFilter) {
          return false;
        }

        // Period
        if (periodFilter !== 'all') {
          if (item.payPeriod === 'both') {
            // matches any period
          } else if (item.payPeriod !== periodFilter) {
            const isMatch =
              (periodFilter === 'period_1' && item.payPeriod === 'cycle-1') ||
              (periodFilter === 'cycle-1' && item.payPeriod === 'period_1') ||
              (periodFilter === 'period_2' && item.payPeriod === 'cycle-2') ||
              (periodFilter === 'cycle-2' && item.payPeriod === 'period_2');
            if (!isMatch) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'dueDate') {
          diff = a.dueDate - b.dueDate;
        } else if (sortField === 'amount') {
          diff = a.amount - b.amount;
        } else if (sortField === 'title') {
          diff = a.title.localeCompare(b.title);
        } else if (sortField === 'status') {
          diff = a.status.localeCompare(b.status);
        }
        return sortDirection === 'asc' ? diff : -diff;
      });
  }, [expenses, searchQuery, selectedAccountFilter, categoryFilter, statusFilter, periodFilter, sortField, sortDirection]);

  const toggleSort = (field: 'dueDate' | 'amount' | 'title' | 'status') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => set.add(e.category));
    return Array.from(set).sort();
  }, [expenses]);

  const getAccount = (accountId: string) => {
    return accounts.find((a) => a.id === accountId) || { name: accountId, color: '#94a3b8' };
  };

  const getCycleLabel = (payPeriod: string) => {
    if (payPeriod === 'both') return 'All Month';
    const found = paycheckCycles.find((c) => c.id === payPeriod);
    if (found) return `${found.label} (${found.startDay}–${found.endDay})`;
    if (payPeriod === 'period_1' || payPeriod === 'cycle-1') return '1st Half (5–18)';
    if (payPeriod === 'period_2' || payPeriod === 'cycle-2') return '2nd Half (19–4)';
    return payPeriod;
  };

  // Aggregate stats of filtered list
  const totalFilteredAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const paidFilteredAmount = filteredExpenses
    .filter((e) => e.status === 'paid')
    .reduce((sum, e) => sum + e.amount, 0);
  const dueFilteredAmount = totalFilteredAmount - paidFilteredAmount;

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Search and Filters Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search bills, accounts, payment tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        {/* Filters Group with safe right clearance */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 text-xs shrink-0 pr-12 sm:pr-0">
          {/* Bank Account Selector Filter */}
          <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-lg shrink-0">
            <button
              onClick={() => onSelectAccountFilter('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition whitespace-nowrap ${
                selectedAccountFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Banks
            </button>
            {accounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => onSelectAccountFilter(acc.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition whitespace-nowrap ${
                  selectedAccountFilter === acc.id
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: acc.color }} />
                <span>{acc.name}</span>
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-lg shrink-0">
            {['all', 'due', 'paid'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition capitalize whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Pay Period Filter */}
          <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-lg shrink-0">
            <button
              onClick={() => setPeriodFilter('all')}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition whitespace-nowrap ${
                periodFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Periods
            </button>
            {paycheckCycles && paycheckCycles.length > 0 ? (
              paycheckCycles.map((cycle) => (
                <button
                  key={cycle.id}
                  onClick={() => setPeriodFilter(cycle.id)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition whitespace-nowrap ${
                    periodFilter === cycle.id
                      ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cycle.label}
                </button>
              ))
            ) : (
              <>
                <button
                  onClick={() => setPeriodFilter('period_1')}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition whitespace-nowrap ${
                    periodFilter === 'period_1'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  1st Half (5–18)
                </button>
                <button
                  onClick={() => setPeriodFilter('period_2')}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition whitespace-nowrap ${
                    periodFilter === 'period_2'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  2nd Half (19–4)
                </button>
              </>
            )}

            {onOpenPaycheckCycles && (
              <button
                onClick={onOpenPaycheckCycles}
                title="Configure Pay Periods & Bi-Weekly Dates"
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 transition whitespace-nowrap border-l border-slate-800 pl-2"
              >
                <SlidersHorizontal className="w-3 h-3 text-emerald-400" />
                <span>Edit Periods</span>
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-[11px] focus:outline-none focus:border-emerald-500 shrink-0"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Add New Button */}
          <button
            onClick={onAddNew}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition shadow-md shadow-emerald-500/20 shrink-0 active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Bill</span>
          </button>
        </div>
      </div>

      {/* Filter Stats Header */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-400 font-mono">
        <div>
          <span>Showing </span>
          <strong className="text-slate-200">{filteredExpenses.length}</strong>
          <span> of </span>
          <strong className="text-slate-200">{expenses.length}</strong>
          <span> obligations</span>
          {selectedAccountFilter !== 'all' && (
            <span className="text-emerald-400 ml-1">
              (Filtered to {getAccount(selectedAccountFilter).name})
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span>Due: <strong className="text-amber-400">{currency}{dueFilteredAmount.toLocaleString()}</strong></span>
          <span>Paid: <strong className="text-emerald-400">{currency}{paidFilteredAmount.toLocaleString()}</strong></span>
          <span>Total: <strong className="text-slate-200">{currency}{totalFilteredAmount.toLocaleString()}</strong></span>
        </div>
      </div>

      {/* Desktop Data Grid */}
      <div className="hidden md:block rounded-xl border border-slate-800/80 bg-slate-900/40 overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold select-none">
              <th className="py-2.5 px-3 w-16 text-center cursor-pointer hover:text-white" onClick={() => toggleSort('dueDate')}>
                <div className="flex items-center justify-center gap-1">
                  <span>Due</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-2.5 px-3 cursor-pointer hover:text-white" onClick={() => toggleSort('title')}>
                <div className="flex items-center gap-1">
                  <span>Obligation / Account</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-2.5 px-3">Bank Account</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3">Pay Period</th>
              <th className="py-2.5 px-3">Payment Method</th>
              <th className="py-2.5 px-3 text-right cursor-pointer hover:text-white" onClick={() => toggleSort('amount')}>
                <div className="flex items-center justify-end gap-1">
                  <span>Amount</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-2.5 px-3 text-center cursor-pointer hover:text-white" onClick={() => toggleSort('status')}>
                <div className="flex items-center justify-center gap-1">
                  <span>Status</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-2.5 px-3 text-right w-20">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  <p className="text-sm font-semibold text-slate-300">
                    {expenses.length === 0 ? 'No expenses recorded yet' : 'No expenses match your search or filter'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 mb-3">
                    {expenses.length === 0 ? 'Add your first recurring bill or transaction to start tracking.' : 'Try adjusting your filters or search query.'}
                  </p>
                  {expenses.length === 0 && (
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <button
                        onClick={onAddNew}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add First Bill</span>
                      </button>
                      {onOpenPaycheckCycles && (
                        <button
                          onClick={onOpenPaycheckCycles}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs border border-slate-700 transition"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          <span>Configure Pay Periods</span>
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              filteredExpenses.map((item) => {
                const isPaid = item.status === 'paid';
                const acc = getAccount(item.accountId);

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-800/40 transition group"
                  >
                    {/* Due Date */}
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-300">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-[11px]">
                        {item.dueDate}th
                      </span>
                    </td>

                    {/* Title & Notes */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-slate-100 ${isPaid ? 'line-through text-slate-400' : ''}`}>
                          {item.title}
                        </span>
                        {item.autoPay && (
                          <span
                            title="Automatic payment enabled"
                            className="text-cyan-400 text-[10px] font-mono flex items-center gap-0.5"
                          >
                            <Zap className="w-3 h-3" />
                            <span>Auto</span>
                          </span>
                        )}
                      </div>
                      {item.notes && (
                        <span className="text-[11px] text-slate-500 block truncate max-w-xs">
                          {item.notes}
                        </span>
                      )}
                    </td>

                    {/* Bank Account */}
                    <td className="py-2 px-3">
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold font-mono border"
                        style={{
                          backgroundColor: `${acc.color}15`,
                          borderColor: `${acc.color}40`,
                          color: acc.color,
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: acc.color }} />
                        <span>{acc.name}</span>
                      </span>
                    </td>

                    {/* Category */}
                    <td className="py-2 px-3 text-slate-400">
                      {item.category}
                    </td>

                    {/* Pay Period */}
                    <td className="py-2 px-3">
                      <span className="text-[11px] font-mono text-slate-400">
                        {getCycleLabel(item.payPeriod)}
                      </span>
                    </td>

                    {/* Payment Method */}
                    <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">
                      {item.paymentMethod || 'Manual'}
                    </td>

                    {/* Amount */}
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-100 tabular-nums">
                      {currency}{item.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </td>

                    {/* Status Toggle Button */}
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => onToggleStatus(item.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition active:scale-95 ${
                          isPaid
                            ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30'
                        }`}
                      >
                        {isPaid ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>PAID</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>DUE</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition">
                        <button
                          onClick={() => onEditExpense(item)}
                          title="Edit Obligation"
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteExpense(item.id)}
                          title="Delete"
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Touch Cards View */}
      <div className="md:hidden space-y-2">
        {filteredExpenses.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/30 rounded-xl border border-slate-800">
            <p className="text-sm font-semibold text-slate-300">
              {expenses.length === 0 ? 'No expenses recorded yet' : 'No expenses found'}
            </p>
            <p className="text-xs text-slate-500 mt-1 mb-3">
              {expenses.length === 0 ? 'Add your first recurring bill to track your bank accounts.' : 'Try adjusting your filters.'}
            </p>
            {expenses.length === 0 && (
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  onClick={onAddNew}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Bill</span>
                </button>
                {onOpenPaycheckCycles && (
                  <button
                    onClick={onOpenPaycheckCycles}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs border border-slate-700 transition"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Configure Pay Periods</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          filteredExpenses.map((item) => {
            const isPaid = item.status === 'paid';
            const acc = getAccount(item.accountId);

            return (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                        Due {item.dueDate}th
                      </span>
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded border"
                        style={{
                          backgroundColor: `${acc.color}15`,
                          borderColor: `${acc.color}40`,
                          color: acc.color,
                        }}
                      >
                        {acc.name}
                      </span>
                      <span className="font-bold text-slate-100 text-sm">{item.title}</span>
                      {item.autoPay && (
                        <span className="text-cyan-400 flex items-center text-[10px] font-mono">
                          <Zap className="w-3 h-3" /> Auto
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      {item.category} · {getCycleLabel(item.payPeriod)} · {item.paymentMethod || 'Manual'}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-base text-white tabular-nums block">
                      {currency}{item.amount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-2">
                  {/* Status Toggle Button */}
                  <button
                    onClick={() => onToggleStatus(item.id)}
                    className={`flex items-center justify-center gap-1.5 px-3 min-h-[44px] rounded-lg text-xs font-bold transition flex-1 active:scale-95 ${
                      isPaid
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {isPaid ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>MARK AS DUE</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>MARK AS PAID</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onEditExpense(item)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-slate-800/80 text-slate-300 hover:text-white"
                      aria-label="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteExpense(item.id)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-slate-800/80 text-slate-400 hover:text-rose-400"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
