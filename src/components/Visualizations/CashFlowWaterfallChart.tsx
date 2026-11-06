import React, { useState, useMemo } from 'react';
import { ExpenseItem, IncomeItem, BankAccount, PaycheckCycle } from '../../types/expense';
import { Building2, Calendar } from 'lucide-react';

interface CashFlowWaterfallChartProps {
  expenses: ExpenseItem[];
  incomes: IncomeItem[];
  accounts?: BankAccount[];
  paycheckCycles?: PaycheckCycle[];
  currency?: string;
}

export const CashFlowWaterfallChart: React.FC<CashFlowWaterfallChartProps> = ({
  expenses,
  incomes,
  accounts = [],
  paycheckCycles = [
    { id: 'cycle-1', label: '1st Half (5th – 18th)', startDay: 5, endDay: 18 },
    { id: 'cycle-2', label: '2nd Half (19th – 4th)', startDay: 19, endDay: 4 },
  ],
  currency = '$',
}) => {
  const [viewMode, setViewMode] = useState<'accounts' | 'periods'>('accounts');

  // Bank Accounts calculation
  const bankAccountCalcs = useMemo(() => {
    return accounts.map((acc) => {
      const accIncomes = incomes.filter((i) => i.accountId === acc.id);
      const totalIncome = accIncomes.reduce((sum, i) => sum + i.amount, 0);

      const accExpenses = expenses.filter((e) => e.accountId === acc.id);
      const totalExpense = accExpenses.reduce((sum, e) => sum + e.amount, 0);
      const paidExpense = accExpenses.filter((e) => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0);

      const leftover = acc.currentBalance + totalIncome - totalExpense;

      return {
        account: acc,
        balance: acc.currentBalance,
        income: totalIncome,
        expense: totalExpense,
        paid: paidExpense,
        leftover,
      };
    });
  }, [accounts, expenses, incomes]);

  // Pay Periods calculation dynamically mapped across paycheckCycles
  const dynamicCycleCalcs = useMemo(() => {
    return paycheckCycles.map((cycle) => {
      const cycleIncomes = incomes.filter(
        (i) => i.payPeriod === cycle.id || (cycle.id === 'cycle-1' && i.payPeriod === 'period_1') || (cycle.id === 'cycle-2' && i.payPeriod === 'period_2')
      );
      const incomeTotal = cycleIncomes.reduce((sum, i) => sum + i.amount, 0);

      const cycleExpenses = expenses.filter(
        (e) => e.payPeriod === cycle.id || (cycle.id === 'cycle-1' && e.payPeriod === 'period_1') || (cycle.id === 'cycle-2' && e.payPeriod === 'period_2') || e.payPeriod === 'both'
      );
      const expenseTotal = cycleExpenses.reduce((sum, e) => sum + e.amount, 0);
      const remaining = incomeTotal - expenseTotal;

      return {
        cycle,
        income: incomeTotal,
        expense: expenseTotal,
        remaining,
      };
    });
  }, [paycheckCycles, expenses, incomes]);

  const maxVal = Math.max(
    ...bankAccountCalcs.map((b) => Math.max(b.balance + b.income, b.expense)),
    ...dynamicCycleCalcs.map((c) => Math.max(c.income, c.expense)),
    1000
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-800 gap-2">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">
            {viewMode === 'accounts' ? 'Bank Account Runway' : 'Paycheck Cycle Coverage'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {viewMode === 'accounts'
              ? 'Real-time breakdown of funds assigned across your bank accounts'
              : 'Configured paycheck cycle inflows vs scheduled obligations'}
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg shrink-0">
          <button
            onClick={() => setViewMode('accounts')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition whitespace-nowrap ${
              viewMode === 'accounts'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Bank Accounts ({accounts.length})</span>
          </button>
          <button
            onClick={() => setViewMode('periods')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition whitespace-nowrap ${
              viewMode === 'periods'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Pay Cycles ({paycheckCycles.length})</span>
          </button>
        </div>
      </div>

      {viewMode === 'accounts' ? (
        /* Bank Accounts Visual View (ENT, USAA, PenFed, etc.) */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-2">
          {bankAccountCalcs.map((item) => {
            const isSurplus = item.leftover >= 0;
            const totalAvailable = item.balance + item.income;
            const expensePercent = totalAvailable > 0 ? Math.min(100, (item.expense / totalAvailable) * 100) : 0;

            return (
              <div
                key={item.account.id}
                className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/40"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.account.color }} />
                    <span className="text-xs font-bold text-white">{item.account.name}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-mono font-bold tabular-nums ${
                      isSurplus ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {isSurplus ? '+' : ''}{currency}{item.leftover.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="block text-[10px] text-slate-500">Leftover</span>
                  </div>
                </div>

                <div className="space-y-2 mt-3 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Starting Bank Balance</span>
                    <span className="font-mono text-slate-200">{currency}{item.balance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>+ Assigned Incomes</span>
                    <span className="font-mono text-emerald-400">+{currency}{item.income.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>- Assigned Bills</span>
                    <span className="font-mono text-rose-400">-{currency}{item.expense.toLocaleString()}</span>
                  </div>

                  {/* Visual allocation bar */}
                  <div className="pt-1">
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-rose-500/80 transition-all duration-500"
                        style={{ width: `${expensePercent}%` }}
                        title={`Obligations: ${expensePercent.toFixed(0)}% of total funds`}
                      />
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${Math.max(0, 100 - expensePercent)}%` }}
                        title={`Remaining: ${(100 - expensePercent).toFixed(0)}%`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Pay Periods Visual View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          {dynamicCycleCalcs.map(({ cycle, income, expense, remaining }) => (
            <div key={cycle.id} className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/40">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-xs font-bold text-slate-200">{cycle.label}</span>
                  <span className="block text-[11px] text-slate-400">Days {cycle.startDay} through {cycle.endDay}</span>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-mono font-bold tabular-nums ${
                    remaining >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {remaining >= 0 ? '+' : ''}{currency}{remaining.toLocaleString()}
                  </span>
                  <span className="block text-[10px] text-slate-500">Cycle Leftover</span>
                </div>
              </div>

              <div className="space-y-2 mt-3">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Inflow</span>
                    <span className="font-mono text-slate-200">{currency}{income.toLocaleString()}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${maxVal > 0 ? Math.min(100, (income / maxVal) * 100) : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Bills</span>
                    <span className="font-mono text-slate-200">{currency}{expense.toLocaleString()}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500/80 rounded-full"
                      style={{ width: `${maxVal > 0 ? Math.min(100, (expense / maxVal) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
