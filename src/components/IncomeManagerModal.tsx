import React, { useState, useEffect } from 'react';
import { IncomeItem, BankAccount, PaycheckCycle } from '../types/expense';
import { X, Plus, Trash2, Wallet, Building2, SlidersHorizontal } from 'lucide-react';

interface IncomeManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  incomes: IncomeItem[];
  accounts: BankAccount[];
  paycheckCycles: PaycheckCycle[];
  onSaveIncomes: (incomes: IncomeItem[]) => void;
  onOpenPaycheckCycles?: () => void;
  currency?: string;
}

export const IncomeManagerModal: React.FC<IncomeManagerModalProps> = ({
  isOpen,
  onClose,
  incomes,
  accounts,
  paycheckCycles,
  onSaveIncomes,
  onOpenPaycheckCycles,
  currency = '$',
}) => {
  const [items, setItems] = useState<IncomeItem[]>(incomes);

  useEffect(() => {
    setItems(incomes);
  }, [incomes, isOpen]);

  if (!isOpen) return null;

  const defaultCycleId = paycheckCycles[0]?.id || 'cycle-1';

  const handleAddItem = (cycleId: string) => {
    const targetCycle = paycheckCycles.find((c) => c.id === cycleId);
    const newItem: IncomeItem = {
      id: `inc-${Date.now()}`,
      source: `Paycheck (${targetCycle?.label || 'Direct Deposit'})`,
      amount: 1000,
      payPeriod: cycleId,
      expectedDay: targetCycle?.startDay || 1,
      received: false,
      accountId: accounts[0]?.id || 'usaa',
    };
    setItems([...items, newItem]);
  };

  const handleUpdate = (id: string, field: keyof IncomeItem, value: any) => {
    setItems(
      items.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  const handleRemove = (id: string) => {
    setItems(items.filter((it) => it.id !== id));
  };

  const handleSave = () => {
    onSaveIncomes(items);
    onClose();
  };

  const grandTotal = items.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-100 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Paycheck & Income Inflows
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {onOpenPaycheckCycles && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPaycheckCycles();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Edit Pay Periods</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-2">
          Configure paychecks and assign which bank account receives each deposit.
        </p>

        {/* Total Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 my-4">
          {paycheckCycles.map((cycle) => {
            const cycleTotal = items
              .filter((i) => i.payPeriod === cycle.id || (cycle.id === 'cycle-1' && i.payPeriod === 'period_1') || (cycle.id === 'cycle-2' && i.payPeriod === 'period_2'))
              .reduce((sum, i) => sum + i.amount, 0);

            return (
              <div key={cycle.id} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block truncate">{cycle.label}</span>
                <span className="text-sm font-bold text-emerald-400 font-mono tabular-nums">
                  {currency}{cycleTotal.toLocaleString()}
                </span>
              </div>
            );
          })}
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-400 block">Total Monthly Inflow</span>
            <span className="text-sm font-bold text-white font-mono tabular-nums">
              {currency}{grandTotal.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Dynamic Groups by Paycheck Cycle */}
        <div className="space-y-4">
          {paycheckCycles.map((cycle) => {
            const cycleItems = items.filter(
              (it) => it.payPeriod === cycle.id || (cycle.id === 'cycle-1' && it.payPeriod === 'period_1') || (cycle.id === 'cycle-2' && it.payPeriod === 'period_2')
            );

            return (
              <div key={cycle.id} className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs font-bold text-slate-200">
                      {cycle.label} (Days {cycle.startDay}–{cycle.endDay})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddItem(cycle.id)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Source</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {cycleItems.length === 0 ? (
                    <div className="p-3 text-center rounded-lg bg-slate-900/30 border border-dashed border-slate-800 text-[11px] text-slate-500">
                      No income assigned to {cycle.label} yet. Click &quot;Add Source&quot; to add a paycheck.
                    </div>
                  ) : (
                    cycleItems.map((it) => (
                      <div
                        key={it.id}
                        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800"
                      >
                        <input
                          type="text"
                          value={it.source}
                          onChange={(e) => handleUpdate(it.id, 'source', e.target.value)}
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                          placeholder="Source name"
                        />

                        {/* Bank Account Selector */}
                        <select
                          value={it.accountId || accounts[0]?.id}
                          onChange={(e) => handleUpdate(it.id, 'accountId', e.target.value)}
                          className="px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-emerald-300 text-xs font-semibold focus:outline-none"
                        >
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name}
                            </option>
                          ))}
                        </select>

                        <div className="w-28 relative">
                          <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs font-mono">{currency}</span>
                          <input
                            type="number"
                            step="0.01"
                            value={it.amount}
                            onChange={(e) => handleUpdate(it.id, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono text-xs"
                          />
                        </div>

                        <label className="flex items-center gap-1.5 text-[11px] text-slate-300 shrink-0 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={it.received}
                            onChange={(e) => handleUpdate(it.id, 'received', e.target.checked)}
                            className="rounded bg-slate-800 border-slate-700 text-emerald-500 w-3.5 h-3.5"
                          />
                          <span>Deposited</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => handleRemove(it.id)}
                          title="Remove Income"
                          className="p-1 text-slate-500 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            Save Incomes
          </button>
        </div>
      </div>
    </div>
  );
};
