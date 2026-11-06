import React, { useMemo, useState } from 'react';
import { ExpenseItem } from '../../types/expense';
import { CreditCard, TrendingDown, ShieldCheck, ArrowRight } from 'lucide-react';

interface DebtPayoffChartProps {
  expenses: ExpenseItem[];
  currency?: string;
}

export const DebtPayoffChart: React.FC<DebtPayoffChartProps> = ({
  expenses,
  currency = '$',
}) => {
  const [strategy, setStrategy] = useState<'balance_desc' | 'balance_asc'>('balance_desc');

  const debtItems = useMemo(() => {
    return expenses
      .filter((e) => e.category === 'Debt & Credit' || e.category === 'Personal Loans')
      .sort((a, b) => (strategy === 'balance_desc' ? b.amount - a.amount : a.amount - b.amount));
  }, [expenses, strategy]);

  const totalDebtBalance = debtItems.reduce((sum, item) => sum + item.amount, 0);
  const paidDebtTotal = debtItems
    .filter((item) => item.status === 'paid')
    .reduce((sum, item) => sum + item.amount, 0);
  const progressPercent = totalDebtBalance > 0 ? ((paidDebtTotal / totalDebtBalance) * 100).toFixed(1) : '0';

  const maxAmount = Math.max(...debtItems.map((d) => d.amount), 1);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-800 gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-amber-400" />
            <span>Debt & Credit Card Balances</span>
          </h3>
          <p className="text-xs text-slate-400">Total revolving balances and payoff priorities</p>
        </div>

        {/* Sort strategy selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400">Sort:</span>
          <div className="flex items-center gap-1 p-0.5 bg-slate-900 border border-slate-800 rounded-md">
            <button
              onClick={() => setStrategy('balance_desc')}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition ${
                strategy === 'balance_desc' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Highest (Avalanche)
            </button>
            <button
              onClick={() => setStrategy('balance_asc')}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition ${
                strategy === 'balance_asc' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Lowest (Snowball)
            </button>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
          <span className="block text-[10px] text-slate-400">Total Revolving</span>
          <span className="block text-sm font-bold text-amber-300 font-mono tabular-nums">
            {currency}{totalDebtBalance.toLocaleString()}
          </span>
          <span className="block text-[10px] text-slate-500">{debtItems.length} accounts</span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
          <span className="block text-[10px] text-slate-400">Paid this Month</span>
          <span className="block text-sm font-bold text-emerald-400 font-mono tabular-nums">
            {currency}{paidDebtTotal.toLocaleString()}
          </span>
          <span className="block text-[10px] text-slate-500">{progressPercent}% resolved</span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
          <span className="block text-[10px] text-slate-400">Remaining Due</span>
          <span className="block text-sm font-bold text-rose-400 font-mono tabular-nums">
            {currency}{(totalDebtBalance - paidDebtTotal).toLocaleString()}
          </span>
          <span className="block text-[10px] text-slate-500">Unsettled</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800/80 rounded-full h-2 mb-4 overflow-hidden">
        <div
          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Debt Item Bar List */}
      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {debtItems.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            No credit card or loan balances found. Add an obligation with category &apos;Debt &amp; Credit&apos; or &apos;Personal Loans&apos; to track payoff priorities here.
          </p>
        ) : (
          debtItems.map((item) => {
          const barWidthPercent = Math.max(5, (item.amount / maxAmount) * 100);
          const isPaid = item.status === 'paid';

          return (
            <div
              key={item.id}
              className="p-2 rounded-lg bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2 truncate">
                  <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span className="font-semibold text-slate-200 truncate">{item.title}</span>
                  <span className="text-[10px] text-slate-400 font-mono">Due: {item.dueDate}th</span>
                </div>
                <div className="flex items-center gap-2 font-mono tabular-nums">
                  <span className="text-slate-100 font-bold">
                    {currency}{item.amount.toLocaleString()}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    isPaid ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {isPaid ? 'Paid' : 'Due'}
                  </span>
                </div>
              </div>

              {/* Relative balance bar */}
              <div className="w-full bg-slate-800/60 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isPaid ? 'bg-emerald-500/70' : 'bg-amber-500/80'
                  }`}
                  style={{ width: `${barWidthPercent}%` }}
                />
              </div>
            </div>
          );
        }))}
      </div>
    </div>
  );
};
