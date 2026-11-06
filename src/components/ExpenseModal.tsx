import React, { useState, useEffect } from 'react';
import { ExpenseItem, ExpenseStatus, BankAccount, PaycheckCycle } from '../types/expense';
import { X, Trash2, Building2, SlidersHorizontal } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: ExpenseItem) => void;
  onDelete?: (id: string) => void;
  initialExpense?: ExpenseItem | null;
  accounts: BankAccount[];
  paycheckCycles: PaycheckCycle[];
  onOpenPaycheckCycles?: () => void;
  currency?: string;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialExpense,
  accounts,
  paycheckCycles,
  onOpenPaycheckCycles,
  currency = '$',
}) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [payPeriod, setPayPeriod] = useState<string>('both');
  const [status, setStatus] = useState<ExpenseStatus>('due');
  const [autoPay, setAutoPay] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || 'usaa');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialExpense) {
      setTitle(initialExpense.title);
      setAmount(initialExpense.amount.toString());
      setDueDate(initialExpense.dueDate.toString());
      setPayPeriod(initialExpense.payPeriod);
      setStatus(initialExpense.status);
      setAutoPay(initialExpense.autoPay);
      setPaymentMethod(initialExpense.paymentMethod || '');
      setAccountId(initialExpense.accountId || accounts[0]?.id || 'usaa');
      setNotes(initialExpense.notes || '');
    } else {
      setTitle('');
      setAmount('');
      setDueDate('');
      setPayPeriod(paycheckCycles[0]?.id || 'cycle-1');
      setStatus('due');
      setAutoPay(false);
      setPaymentMethod('');
      setAccountId(accounts[0]?.id || 'usaa');
      setNotes('');
    }
  }, [initialExpense, isOpen, accounts, paycheckCycles]);

  if (!isOpen) return null;

  // Auto-match paycheck cycle when due day is entered (if not set to 'both')
  const handleDueDayChange = (valStr: string) => {
    setDueDate(valStr);
    if (!valStr) return;
    const day = parseInt(valStr, 10);
    if (isNaN(day)) return;

    const validDay = Math.min(31, Math.max(1, day));

    // Find cycle that covers this day
    const matchingCycle = paycheckCycles.find((c) => {
      if (c.startDay <= c.endDay) {
        return validDay >= c.startDay && validDay <= c.endDay;
      } else {
        // Wraps month boundary (e.g. 19th to 4th)
        return validDay >= c.startDay || validDay <= c.endDay;
      }
    });

    if (matchingCycle && payPeriod !== 'both') {
      setPayPeriod(matchingCycle.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    const parsedDay = parseInt(dueDate, 10);
    if (!title.trim() || isNaN(numAmount) || numAmount < 0 || isNaN(parsedDay)) return;

    const expenseItem: ExpenseItem = {
      id: initialExpense ? initialExpense.id : `exp-${Date.now()}`,
      title: title.trim(),
      amount: numAmount,
      dueDate: Math.min(31, Math.max(1, parsedDay)),
      payPeriod,
      status,
      autoPay,
      paymentMethod: paymentMethod.trim() || (autoPay ? 'Auto-Pay' : 'Manual'),
      accountId,
      notes: notes.trim(),
    };

    onSave(expenseItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h2 className="text-base font-bold text-white tracking-tight">
            {initialExpense ? 'Edit Expense Obligation' : 'Add New Expense Obligation'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Title & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Bill / Expense Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Mortgage, T-Mobile, Citi Costco"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Amount ({currency}) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Assigned Bank Account */}
          <div>
            <label className="block font-medium text-slate-300 mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Assigned Bank Account *</span>
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-emerald-500/50 text-white font-semibold focus:outline-none focus:border-emerald-500"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Due Date & Paycheck Cycle Assignment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Due Day of Month (1 - 31) *</label>
              <input
                type="number"
                min="1"
                max="31"
                required
                placeholder="e.g. 5, 15, 28"
                value={dueDate}
                onChange={(e) => handleDueDayChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-medium text-slate-300 flex items-center gap-1">
                  <SlidersHorizontal className="w-3 h-3 text-emerald-400" />
                  <span>Paycheck Cycle</span>
                </label>
                {onOpenPaycheckCycles && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenPaycheckCycles();
                    }}
                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition"
                  >
                    Edit Cycles
                  </button>
                )}
              </div>
              <select
                value={payPeriod}
                onChange={(e) => setPayPeriod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="both">All Month (Both Cycles)</option>
                {paycheckCycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} (Days {c.startDay}–{c.endDay})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Status</label>
              <div className="flex gap-2">
                {(['due', 'paid', 'pending'] as ExpenseStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatus(st)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold capitalize transition ${
                      status === st
                        ? st === 'paid'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                          : st === 'due'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                        : 'bg-slate-800/50 text-slate-400 border-slate-700/60 hover:text-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Payment Method / Tag</label>
              <input
                type="text"
                placeholder="e.g. A-citi cc, A-USAA 1425, Manual"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* AutoPay toggle */}
          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoPay}
                onChange={(e) => setAutoPay(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 w-4 h-4"
              />
              <span className="text-slate-200 font-medium">Automatic Payment Configured</span>
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-medium text-slate-300 mb-1">Notes / Account # (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Minimum balance, confirmation #"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <div>
              {initialExpense && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    onDelete(initialExpense.id);
                    onClose();
                  }}
                  className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Bill</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold transition shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                {initialExpense ? 'Save Changes' : 'Add Obligation'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
