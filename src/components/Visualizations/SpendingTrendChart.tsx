import React from 'react';
import { BudgetState } from '../../types/expense';
import { TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface SpendingTrendChartProps {
  state: BudgetState;
}

export const SpendingTrendChart: React.FC<SpendingTrendChartProps> = ({ state }) => {
  const currency = state.currency || '$';
  const monthIds = Object.keys(state.months);

  const monthSummaries = monthIds.map((id) => {
    const month = state.months[id];
    const totalExpenses = month.expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = month.incomes.reduce((sum, i) => sum + i.amount, 0);
    const net = totalIncome - totalExpenses;
    return {
      id,
      label: month.label,
      totalExpenses,
      totalIncome,
      net,
      itemCount: month.expenses.length,
    };
  });

  const maxExpense = Math.max(...monthSummaries.map((m) => m.totalExpenses), 1000);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Monthly Spending Trends</span>
          </h3>
          <p className="text-xs text-slate-400">Comparing active months and cash allocations</p>
        </div>
        <span className="text-xs font-mono text-slate-400">{monthSummaries.length} cycles recorded</span>
      </div>

      <div className="space-y-4 py-2">
        {monthSummaries.map((summary) => {
          const expenseBarWidth = Math.min(100, (summary.totalExpenses / maxExpense) * 100);
          const incomeBarWidth = Math.min(100, (summary.totalIncome / maxExpense) * 100);

          return (
            <div
              key={summary.id}
              className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <div>
                  <span className="font-bold text-slate-200">{summary.label}</span>
                  <span className="block text-[11px] text-slate-400">{summary.itemCount} bills tracked</span>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end font-mono font-bold tabular-nums">
                    {summary.net >= 0 ? (
                      <span className="text-emerald-400 flex items-center">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        +{currency}{summary.net.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-rose-400 flex items-center">
                        <ArrowDownRight className="w-3.5 h-3.5" />
                        -{currency}{Math.abs(summary.net).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500">Net Surplus</span>
                </div>
              </div>

              {/* Inflow vs Outflow Bars */}
              <div className="space-y-1.5">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                    <span>Income</span>
                    <span className="font-mono text-slate-300">{currency}{summary.totalIncome.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${incomeBarWidth}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                    <span>Expenses</span>
                    <span className="font-mono text-slate-300">{currency}{summary.totalExpenses.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${expenseBarWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
