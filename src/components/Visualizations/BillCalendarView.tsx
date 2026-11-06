import React, { useState, useMemo } from 'react';
import { ExpenseItem } from '../../types/expense';
import { Calendar as CalendarIcon, Check, Clock, AlertCircle } from 'lucide-react';

interface BillCalendarViewProps {
  expenses: ExpenseItem[];
  currency?: string;
  onToggleStatus: (id: string) => void;
}

export const BillCalendarView: React.FC<BillCalendarViewProps> = ({
  expenses,
  currency = '$',
  onToggleStatus,
}) => {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Group bills by due day
  const dayMap = useMemo(() => {
    const map = new Map<number, ExpenseItem[]>();
    for (let day = 1; day <= 31; day++) {
      map.set(day, []);
    }
    expenses.forEach((item) => {
      const list = map.get(item.dueDate) || [];
      list.push(item);
      map.set(item.dueDate, list);
    });
    return map;
  }, [expenses]);

  const selectedBills = selectedDay ? dayMap.get(selectedDay) || [] : [];

  // Summary stats
  const totalBillsCount = expenses.length;
  const paidCount = expenses.filter((e) => e.status === 'paid').length;
  const dueCount = expenses.filter((e) => e.status === 'due').length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-800 gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
            <CalendarIcon className="w-4 h-4 text-emerald-400" />
            <span>Monthly Due Dates & Schedule</span>
          </h3>
          <p className="text-xs text-slate-400">Tap any day to inspect bills and auto-pay tags</p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{paidCount} Paid</span>
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>{dueCount} Due</span>
          </span>
        </div>
      </div>

      {/* Calendar Grid: 31 Days (7 columns) */}
      <div className="grid grid-cols-7 gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-slate-800/80">
        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
          const billsOnDay = dayMap.get(day) || [];
          const hasBills = billsOnDay.length > 0;
          const isSelected = selectedDay === day;
          const allPaid = hasBills && billsOnDay.every((b) => b.status === 'paid');
          const dayTotal = billsOnDay.reduce((sum, b) => sum + b.amount, 0);

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={`relative flex flex-col items-center justify-between p-1.5 min-h-[52px] rounded-lg border text-left transition-all ${
                isSelected
                  ? 'border-emerald-400 bg-emerald-950/40 shadow-md ring-1 ring-emerald-400/50'
                  : hasBills
                  ? allPaid
                    ? 'border-emerald-500/30 bg-emerald-950/20 hover:border-emerald-400/50 text-slate-200'
                    : 'border-amber-500/40 bg-amber-950/20 hover:border-amber-400 text-slate-100'
                  : 'border-slate-800/50 bg-slate-900/20 hover:bg-slate-800/40 text-slate-500'
              }`}
            >
              <div className="w-full flex items-center justify-between text-[11px] font-mono leading-none">
                <span className={`font-semibold ${isSelected ? 'text-emerald-300' : hasBills ? 'text-slate-300' : 'text-slate-600'}`}>
                  {day}
                </span>
                {hasBills && (
                  <span className={`w-1.5 h-1.5 rounded-full ${allPaid ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                )}
              </div>

              {hasBills ? (
                <div className="w-full text-center mt-0.5">
                  <span className={`block text-[10px] font-mono font-bold truncate leading-tight ${allPaid ? 'text-emerald-400/90' : 'text-amber-300'}`}>
                    {currency}{dayTotal.toLocaleString()}
                  </span>
                  <span className="block text-[9px] text-slate-400 leading-none">
                    {billsOnDay.length} {billsOnDay.length === 1 ? 'bill' : 'bills'}
                  </span>
                </div>
              ) : (
                <div className="h-4" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Bills Drawer */}
      {selectedDay && (
        <div className="mt-3 p-3 rounded-xl bg-slate-900/90 border border-slate-700/80">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-200">
              Bills Due on the {selectedDay}th ({selectedBills.length})
            </span>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-[11px] text-slate-400 hover:text-slate-200"
            >
              Close
            </button>
          </div>

          {selectedBills.length === 0 ? (
            <p className="text-xs text-slate-500 py-1">No bills scheduled for this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedBills.map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 border border-slate-700/40 text-xs"
                >
                  <div className="flex-1 truncate mr-2">
                    <span className="font-semibold text-slate-100 block truncate">{bill.title}</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {bill.paymentMethod || 'Manual'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono font-bold text-slate-100 tabular-nums">
                      {currency}{bill.amount.toLocaleString()}
                    </span>
                    <button
                      onClick={() => onToggleStatus(bill.id)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition ${
                        bill.status === 'paid'
                          ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                      }`}
                    >
                      {bill.status === 'paid' ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Paid</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" />
                          <span>Mark Paid</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
