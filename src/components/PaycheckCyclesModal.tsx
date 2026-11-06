import React, { useState } from 'react';
import { PaycheckCycle } from '../types/expense';
import { X, Plus, Trash2, Calendar, Check, SlidersHorizontal, Sparkles, RefreshCw } from 'lucide-react';

interface PaycheckCyclesModalProps {
  isOpen: boolean;
  onClose: () => void;
  cycles: PaycheckCycle[];
  onSaveCycles: (cycles: PaycheckCycle[]) => void;
}

const PRESETS = [
  {
    name: 'Bi-Weekly (Every 14 Days)',
    description: 'Two 14-day pay periods based on your paycheck date',
    cycles: [
      { id: 'cycle-1', label: 'Paycheck 1 (14 Days)', startDay: 1, endDay: 14 },
      { id: 'cycle-2', label: 'Paycheck 2 (14 Days)', startDay: 15, endDay: 28 },
    ],
  },
  {
    name: 'Military Two-Paycheck (5th–18th & 19th–4th)',
    description: 'Split month: 5th through 18th, and 19th through 4th',
    cycles: [
      { id: 'cycle-1', label: '1st Half (5th – 18th)', startDay: 5, endDay: 18 },
      { id: 'cycle-2', label: '2nd Half (19th – 4th)', startDay: 19, endDay: 4 },
    ],
  },
  {
    name: 'Standard 1st & 15th (Semi-Monthly)',
    description: '1st through 15th, and 16th through end of month',
    cycles: [
      { id: 'cycle-1', label: '1st Paycheck (1st – 15th)', startDay: 1, endDay: 15 },
      { id: 'cycle-2', label: '2nd Paycheck (16th – 31st)', startDay: 16, endDay: 31 },
    ],
  },
  {
    name: 'Monthly (Once a Month)',
    description: 'Single monthly cycle spanning entire month',
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
  const [newEnd, setNewEnd] = useState<number>(14);
  const [newStartDate, setNewStartDate] = useState<string>('');

  // Bi-weekly quick anchor tool
  const [biWeeklyAnchorDate, setBiWeeklyAnchorDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyPreset = (presetCycles: PaycheckCycle[]) => {
    setItems(presetCycles);
    setErrorMsg(null);
  };

  // Generate 14-day Bi-Weekly cycles from an exact start date
  const handleGenerateBiWeekly = () => {
    if (!biWeeklyAnchorDate) {
      setErrorMsg('Please select a valid start date for your bi-weekly paycheck.');
      return;
    }

    const [year, month, day] = biWeeklyAnchorDate.split('-').map(Number);
    const date1 = new Date(year, month - 1, day);
    const date2 = new Date(date1);
    date2.setDate(date2.getDate() + 14);

    const end1 = new Date(date1);
    end1.setDate(end1.getDate() + 13);

    const end2 = new Date(date2);
    end2.setDate(end2.getDate() + 13);

    const formatShort = (d: Date) =>
      d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    const newCycles: PaycheckCycle[] = [
      {
        id: `cycle-${Date.now()}-1`,
        label: `Paycheck 1 (${formatShort(date1)} – ${formatShort(end1)})`,
        startDay: date1.getDate(),
        endDay: end1.getDate(),
        startDate: date1.toISOString().split('T')[0],
      },
      {
        id: `cycle-${Date.now()}-2`,
        label: `Paycheck 2 (${formatShort(date2)} – ${formatShort(end2)})`,
        startDay: date2.getDate(),
        endDay: end2.getDate(),
        startDate: date2.toISOString().split('T')[0],
      },
    ];

    setItems(newCycles);
    setErrorMsg(null);
  };

  const handleUpdate = (id: string, field: keyof PaycheckCycle, value: any) => {
    setItems(
      items.map((c) => {
        if (c.id !== id) return c;
        const updated = { ...c, [field]: value };
        return updated;
      })
    );
  };

  // When exact calendar date is picked on an individual cycle
  const handleCycleDateChange = (id: string, dateStr: string) => {
    if (!dateStr) return;
    const [y, m, d] = dateStr.split('-').map(Number);
    const startDateObj = new Date(y, m - 1, d);
    const endDateObj = new Date(startDateObj);
    endDateObj.setDate(endDateObj.getDate() + 13); // 14-day cycle

    const formatShort = (dt: Date) =>
      dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    setItems(
      items.map((c) => {
        if (c.id !== id) return c;
        return {
          ...c,
          startDate: dateStr,
          startDay: startDateObj.getDate(),
          endDay: endDateObj.getDate(),
          label: c.label.includes('Paycheck')
            ? `${c.label.split('(')[0].trim()} (${formatShort(startDateObj)} – ${formatShort(endDateObj)})`
            : c.label,
        };
      })
    );
  };

  // Helper to set duration to 14 days (+13 days)
  const handleSet14Days = (id: string) => {
    setItems(
      items.map((c) => {
        if (c.id !== id) return c;
        // 14 days: startDay + 13
        const calculatedEnd = ((c.startDay + 13 - 1) % 31) + 1;
        return {
          ...c,
          endDay: calculatedEnd,
        };
      })
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
      startDate: newStartDate || undefined,
    };

    setItems([...items, newCycle]);
    setNewLabel('');
    setNewStart(1);
    setNewEnd(14);
    setNewStartDate('');
    setIsAdding(false);
  };

  const handleSaveAll = () => {
    onSaveCycles(items);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
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
          Set when you get paid (bi-weekly, semi-monthly, or custom). You can configure your exact paycheck start date and 14-day intervals below.
        </p>

        {errorMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Bi-Weekly Schedule Setup Tool */}
        <div className="my-3.5 p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Bi-Weekly Paycheck Generator</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              14-Day Cycle
            </span>
          </div>
          <p className="text-[11px] text-slate-300 mb-2.5">
            Choose the start date of your first paycheck. We will automatically generate your 14-day bi-weekly pay periods:
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="date"
                value={biWeeklyAnchorDate}
                onChange={(e) => setBiWeeklyAnchorDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="button"
              onClick={handleGenerateBiWeekly}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition shadow-sm active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Apply 14-Day Bi-Weekly Schedule</span>
            </button>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="my-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="block text-[11px] font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Preset Schedules</span>
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
                <span className="text-slate-500 text-[10px] block truncate">
                  {p.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Active Cycles List with Editable Start Dates & Days */}
        <div className="space-y-2.5 my-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200">
              Active Paycheck Periods ({items.length})
            </span>
            <span className="text-[10px] text-slate-400">
              Edit cycle name or start day/date directly below:
            </span>
          </div>

          {items.map((cycle, idx) => (
            <div
              key={cycle.id}
              className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-2.5"
            >
              {/* Row 1: Label & Delete */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                  #{idx + 1}
                </span>
                <input
                  type="text"
                  value={cycle.label}
                  onChange={(e) => handleUpdate(cycle.id, 'label', e.target.value)}
                  placeholder="Cycle Name (e.g. Paycheck 1)"
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-semibold text-xs focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => handleRemove(cycle.id)}
                  title="Remove Cycle"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Row 2: Start Date Picker, Start Day, End Day & 14-day helper */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                {/* Specific Calendar Start Date (Optional) */}
                <div className="sm:col-span-5">
                  <label className="block text-[10px] text-slate-400 mb-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-400" />
                    <span>Pay Date (Anchor)</span>
                  </label>
                  <input
                    type="date"
                    value={cycle.startDate || ''}
                    onChange={(e) => handleCycleDateChange(cycle.id, e.target.value)}
                    className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Start Day (1-31) */}
                <div className="sm:col-span-3">
                  <label className="block text-[10px] text-slate-400 mb-0.5">Start Day</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={cycle.startDay}
                      onChange={(e) => handleUpdate(cycle.id, 'startDay', Number(e.target.value))}
                      className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white font-mono text-xs text-center focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-500">th</span>
                  </div>
                </div>

                {/* End Day (1-31) */}
                <div className="sm:col-span-4 flex items-end gap-1.5">
                  <div className="flex-1">
                    <label className="block text-[10px] text-slate-400 mb-0.5">End Day</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={cycle.endDay}
                        onChange={(e) => handleUpdate(cycle.id, 'endDay', Number(e.target.value))}
                        className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white font-mono text-xs text-center focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-[10px] text-slate-500">th</span>
                    </div>
                  </div>

                  {/* Quick button to enforce 14 days */}
                  <button
                    type="button"
                    onClick={() => handleSet14Days(cycle.id)}
                    title="Set to 14-day duration"
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[10px] font-mono border border-slate-700 whitespace-nowrap"
                  >
                    +14d
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Cycle Form */}
        {isAdding ? (
          <form onSubmit={handleAdd} className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/40 space-y-2.5 text-xs mb-3">
            <h4 className="font-bold text-white text-xs">Add New Custom Cycle</h4>
            <input
              type="text"
              required
              placeholder="e.g. Mid-Month Paycheck"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 text-[10px] mb-0.5">Start Pay Date (Optional)</label>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => {
                    setNewStartDate(e.target.value);
                    if (e.target.value) {
                      const day = new Date(e.target.value).getDate();
                      setNewStart(day);
                      setNewEnd(((day + 13 - 1) % 31) + 1);
                    }
                  }}
                  className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-xs font-mono"
                />
              </div>
              <div className="flex items-center gap-2 pt-4">
                <span className="text-slate-400 text-xs">Day</span>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={newStart}
                  onChange={(e) => setNewStart(Number(e.target.value))}
                  className="w-14 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white font-mono text-xs text-center"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={newEnd}
                  onChange={(e) => setNewEnd(Number(e.target.value))}
                  className="w-14 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white font-mono text-xs text-center"
                />
              </div>
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
