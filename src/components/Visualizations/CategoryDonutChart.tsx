import React, { useState, useMemo } from 'react';
import { ExpenseItem, ExpenseCategory } from '../../types/expense';

interface CategoryDonutChartProps {
  expenses: ExpenseItem[];
  currency?: string;
}

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  'Housing': '#10b981', // Emerald
  'Utilities': '#06b6d4', // Cyan
  'Debt & Credit': '#f59e0b', // Amber
  'Auto & Transport': '#8b5cf6', // Violet
  'Insurance & Health': '#3b82f6', // Blue
  'Subscriptions': '#ec4899', // Pink
  'Family & Child Support': '#14b8a6', // Teal
  'Personal Loans': '#f97316', // Orange
  'Other': '#64748b', // Slate
};

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({
  expenses,
  currency = '$',
}) => {
  const [hoveredCategory, setHoveredCategory] = useState<ExpenseCategory | null>(null);

  const categoryTotals = useMemo(() => {
    const map = new Map<ExpenseCategory, { amount: number; count: number }>();
    expenses.forEach((item) => {
      const current = map.get(item.category) || { amount: 0, count: 0 };
      map.set(item.category, {
        amount: current.amount + item.amount,
        count: current.count + 1,
      });
    });

    const list = Array.from(map.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        color: CATEGORY_COLORS[category] || '#94a3b8',
      }))
      .sort((a, b) => b.amount - a.amount);

    const total = list.reduce((sum, item) => sum + item.amount, 0);

    return { list, total };
  }, [expenses]);

  const { list, total } = categoryTotals;

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

    // Convert angles to radians
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

  const activeItem = hoveredCategory
    ? slices.find((s) => s.category === hoveredCategory)
    : null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Category Breakdown</h3>
          <p className="text-xs text-slate-400">Distribution across active budget items</p>
        </div>
        <span className="text-xs font-mono font-medium text-slate-400 tabular-nums">
          {list.length} categories
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
        {/* Donut SVG */}
        <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
          <svg
            viewBox="0 0 180 180"
            className="w-full h-full transform transition-transform duration-300"
          >
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
                const isHovered = hoveredCategory === slice.category;
                return (
                  <path
                    key={slice.category}
                    d={slice.pathData}
                    fill={slice.color}
                    opacity={hoveredCategory ? (isHovered ? 1 : 0.4) : 0.9}
                    className="cursor-pointer transition-all duration-200 hover:opacity-100"
                    onMouseEnter={() => setHoveredCategory(slice.category)}
                    onMouseLeave={() => setHoveredCategory(null)}
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
                  {activeItem.category}
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
                <span className="text-[11px] font-medium text-slate-400">Total Spent</span>
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
              key={slice.category}
              onMouseEnter={() => setHoveredCategory(slice.category)}
              onMouseLeave={() => setHoveredCategory(null)}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                hoveredCategory === slice.category
                  ? 'bg-slate-800 text-white'
                  : 'hover:bg-slate-800/60 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="truncate">{slice.category}</span>
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
