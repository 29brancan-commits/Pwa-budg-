import React, { useState } from 'react';
import { PaycheckCycle } from '../types/expense';
import { X, Plus, Trash2, Calendar, Check, SlidersHorizontal, Sparkles } from 'lucide-react';

interface PaycheckCyclesModalProps {
  isOpen: boolean;
  onClose: () => void;
  cycles: PaycheckCycle[];
  onSaveCycles: (cycles: PaycheckCycle[]) => void;
}

const PRESETS = [
  {
    name: 'Military Two-Paycheck (5th–18th & 19th–4th)',
    cycles: [
      { id: 'cycle-1', label: '1st Half (5th – 18th)', startDay: 5, endDay: 18 },
      { id: 'cycle-2', label: '2nd Half (19th – 4th)', startDay: 19, endDay: 4 },
    ],
  },
  {
    name: 'Standard 1st & 15th (1st–15th & 16th–End)',
    cycles: [
      { id: 'cycle-1', label: '1st Paycheck (1st – 15th)', startDay: 1, endDay: 15 },
      { id: 'cycle-2', label: '2nd Paycheck (16th – 31st)', startDay: 16, endDay: 31 },
    ],
  },
  {
    name: 'Bi-Weekly (28-day 2 cycles)',
    cycles: [
      { id: 'cycle-1', label: 'Paycheck 1 (Days 1 – 14)', startDay: 1, endDay: 14 },
      { id: 'cycle-2', label: 'Paycheck 2 (Days 15 – 28)', startDay: 15, endDay: 28 },
    ],
  },
  {
    name: 'Monthly Once-a-Month (1st – 31st)',
    cycles: [
      { id: 'cycle-1', label: 'Monthly Cycle (1st – 31st)', startDay: 1, endDay: 31 },
    ],
  },
];

export const PaycheckCyclesModal: React.FC<PaycheckCyclesModalProps> = ({
  isOpen,
  onClose,
  cycles,
  onSaveCycles,
}) => {
  const [items, setItems] = useState<PaycheckCycle[]>(cycles || []);
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newStart, setNewStart] = useState<number>(1);
  const [newEnd, setNewEnd] = useState<number>(15);

  if (!isOpen) return null;

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleApplyPreset = (presetCycles: PaycheckCycle[]) => {
    setItems(presetCycles);
    setErrorMsg(null);
  };

  const handleUpdate = (id: string, field: keyof PaycheckCycle, value: any) => {
    setItems(
      items.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleRemove = (id: string) => {
    if (items.length <= 1) {
      setErrorMsg('You must have at least one active paycheck cycle.');
      return;
    }
    setItems(items.filter((c) => c.id !== id));
    setErrorMsg(null);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    const newCycle: PaycheckCycle = {
      id: `cycle-${Date.now()}`,
      label: newLabel.trim(),
      startDay: Math.min(31, Math.max(1, Number(newStart))),
      endDay: Math.min(31, Math.max(1, Number(newEnd))),
    };

    setItems([...items, newCycle]);
    setNewLabel('');
    setNewStart(1);
    setNewEnd(15);
    setIsAdding(false);
  };

  const handleSaveAll = () => {
    onSaveCycles(items);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-100 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Configure Paycheck Cycles
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-2">
          Customize the paycheck periods for your budget. Each cycle represents when you get paid and which bills belong to that paycheck window.
        </p>

        {errorMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Quick Presets */}
        <div className="my-3.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="block text-[11px] font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Quick Presets</span>
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => handleApplyPreset(p.cycles)}
                className="text-left p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 transition text-[11px]"
              >
                <strong className="text-slate-200 block truncate">{p.name}</strong>
                <span className="text-slate-500 text-[10px]">
                  {p.cycles.length} cycles ({p.cycles.map(c => c.label).join(', ')})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Active Cycles List */}
        <div className="space-y-2.5 my-3">
          <span className="block text-xs font-semibold text-slate-200">
            Active Paycheck Cycles ({items.length})
          </span>

          {items.map((cycle, idx) => (
            <div
              key={cycle.id}
              className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
            >
              <div className="flex-1">
                <input
                  type="text"
                  value={cycle.label}
                  onChange={(e) => handleUpdate(cycle.id, 'label', e.target.value)}
                  placeholder="Cycle Name (e.g. 1st Half)"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-semibold text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400">Day:</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={cycle.startDay}
                    onChange={(e) => handleUpdate(cycle.id, 'startDay', Number(e.target.value))}
                    className="w-12 px-1.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-center font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-slate-500 text-xs">to</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={cycle.endDay}
                    onChange={(e) => handleUpdate(cycle.id, 'endDay', Number(e.target.value))}
                    className="w-12 px-1.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-center font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleRemove(cycle.id)}
                  title="Remove Cycle"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Cycle Form */}
        {isAdding ? (
          <form onSubmit={handleAdd} className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/40 space-y-2 text-xs mb-3">
            <h4 className="font-bold text-white text-xs">Add New Cycle</h4>
            <input
              type="text"
              required
              placeholder="e.g. Mid-Month Paycheck"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
            />
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs">Covers Day</span>
              <input
                type="number"
                min="1"
                max="31"
                value={newStart}
                onChange={(e) => setNewStart(Number(e.target.value))}
                className="w-14 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white font-mono text-xs text-center"
              />
              <span className="text-slate-400 text-xs">through</span>
              <input
                type="number"
                min="1"
                max="31"
                value={newEnd}
                onChange={(e) => setNewEnd(Number(e.target.value))}
                className="w-14 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white font-mono text-xs text-center"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1 rounded bg-emerald-500 text-slate-950 font-bold text-xs"
              >
                Add
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center justify-center gap-1.5 p-2 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-900/40 text-emerald-400 text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom Paycheck Cycle</span>
          </button>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 mt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition shadow-md shadow-emerald-500/20 active:scale-95"
          >
            Save Cycles
          </button>
        </div>
      </div>
    </div>
  );
};
