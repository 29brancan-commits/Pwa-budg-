import React from 'react';
import { ActiveTab } from './Header';
import { ListFilter, BarChart3, CalendarDays, CreditCard, Wallet } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenIncomeModal: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenIncomeModal,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/80 px-2 pb-safe">
      <div className="grid grid-cols-5 items-center h-16 max-w-md mx-auto">
        <button
          onClick={() => onSelectTab('ledger')}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] transition ${
            activeTab === 'ledger' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <ListFilter className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Ledger</span>
        </button>

        <button
          onClick={() => onSelectTab('charts')}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] transition ${
            activeTab === 'charts' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Analytics</span>
        </button>

        <button
          onClick={() => onSelectTab('calendar')}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] transition ${
            activeTab === 'calendar' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <CalendarDays className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Calendar</span>
        </button>

        <button
          onClick={() => onSelectTab('debt')}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] transition ${
            activeTab === 'debt' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <CreditCard className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Debt</span>
        </button>

        <button
          onClick={onOpenIncomeModal}
          className="flex flex-col items-center justify-center min-h-[44px] min-w-[44px] text-emerald-400 hover:text-emerald-300 transition"
        >
          <Wallet className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Paychecks</span>
        </button>
      </div>
    </nav>
  );
};
