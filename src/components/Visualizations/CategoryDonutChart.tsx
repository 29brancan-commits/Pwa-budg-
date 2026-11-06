import React, { useState, useMemo } from 'react';
import { ExpenseItem, BankAccount } from '../../types/expense';

interface CategoryDonutChartProps {
  expenses: ExpenseItem[];
  accounts?: BankAccount[];
  currency?: string;
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({
  expenses,
  accounts = [],
  currency = '$',
}) => {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const accountTotals = useMemo(() => {
    const map = new Map<string, { name: string; color: string; amount: number; count: number }>();
    
    expenses.forEach((item) => {
      const acc = accounts.find((a) => a.id === item.accountId) || {
        id: item.accountId,
        name: item.accountId,
        color: '#94a3b8',
      };
      const key = acc.id || item.accountId;
      const current = map.get(key) || { name: acc.name, color: acc.color || '#3b82f6', amount: 0, count: 0 };
      map.set(key, {
        ...current,
        amount: current.amount + item.amount,
        count: current.count + 1,
      });
    });

    const list = Array.from(map.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        color: data.color,
        amount: data.amount,
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);

    const total = list.reduce((sum, item) => sum + item.amount, 0);

    return { list, total };
  }, [expenses, accounts]);

  const { list, total } = accountTotals;

  // Compute SVG arcs
  const radius = 70;
  const innerRadius = 48;
  const center = 90;

  let cumulativeAngle = 0;
  const slices = list.map((item) => {
    const fraction = total > 0 ? item.amount / total : 0;
    const startAngle = cumulativeAngle;
    const sweepAngle = fraction * 360;
    const endAngle = startAngle + sweepAngle;
    cumulativeAngle = endAngle;

    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const ix1 = center + innerRadius * Math.cos(endRad);
    const iy1 = center + innerRadius * Math.sin(endRad);
    const ix2 = center + innerRadius * Math.cos(startRad);
    const iy2 = center + innerRadius * Math.sin(startRad);

    const largeArc = sweepAngle > 180 ? 1 : 0;

    const pathData = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2}`,
      'Z',
    ].join(' ');

    return {
      ...item,
      fraction,
      percentage: (fraction * 100).toFixed(1),
      pathData,
    };
  });

  const activeItem = hoveredKey ? slices.find((s) => s.id === hoveredKey) : null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Bank Allocation Breakdown</h3>
          <p className="text-xs text-slate-400">Total obligations allocated per bank account</p>
        </div>
        <span className="text-xs font-mono font-medium text-slate-400 tabular-nums">
          {list.length} accounts
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
        {/* Donut SVG */}
        <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 180 180" className="w-full h-full">
            {slices.length === 0 ? (
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="#1e293b"
                strokeWidth={radius - innerRadius}
              />
            ) : (
              slices.map((slice) => {
                const isHovered = hoveredKey === slice.id;
                return (
                  <path
                    key={slice.id}
                    d={slice.pathData}
                    fill={slice.color}
                    opacity={hoveredKey ? (isHovered ? 1 : 0.4) : 0.9}
                    className="cursor-pointer transition-all duration-200 hover:opacity-100"
                    onMouseEnter={() => setHoveredKey(slice.id)}
                    onMouseLeave={() => setHoveredKey(null)}
                  />
                );
              })
            )}
          </svg>

          {/* Center Callout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            {activeItem ? (
              <>
                <span className="text-[11px] font-medium text-slate-400 truncate max-w-[90px]">
                  {activeItem.name}
                </span>
                <span className="text-base font-bold text-white font-mono tabular-nums leading-tight">
                  {currency}{activeItem.amount.toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {activeItem.percentage}%
                </span>
              </>
            ) : (
              <>
                <span className="text-[11px] font-medium text-slate-400">Total Obligations</span>
                <span className="text-base font-bold text-white font-mono tabular-nums leading-tight">
                  {currency}{total.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500">100%</span>
              </>
            )}
          </div>
        </div>

        {/* Legend List */}
        <div className="w-full flex-1 max-h-48 overflow-y-auto pr-1 space-y-1.5">
          {slices.map((slice) => (
            <div
              key={slice.id}
              onMouseEnter={() => setHoveredKey(slice.id)}
              onMouseLeave={() => setHoveredKey(null)}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                hoveredKey === slice.id
                  ? 'bg-slate-800 text-white'
                  : 'hover:bg-slate-800/60 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="truncate">{slice.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 font-mono tabular-nums text-right">
                <span className="text-slate-200 font-medium">
                  {currency}{slice.amount.toLocaleString()}
                </span>
                <span className="text-slate-500 text-[11px] w-10 text-right">
                  {slice.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
