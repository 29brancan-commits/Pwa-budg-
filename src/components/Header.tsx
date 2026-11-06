import React from 'react';
import { PWAInstallButton } from './PWAInstallButton';
import { 
  Plus, 
  Wallet, 
  Database, 
  BarChart3, 
  CalendarDays, 
  ListFilter,
  Building2,
  SlidersHorizontal,
  Github,
  Columns2
} from 'lucide-react';
import { APP_VERSION } from '../utils/version';

export type ActiveTab = 'ledger' | 'charts' | 'calendar' | 'debt';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenAddModal: () => void;
  onOpenIncomeModal: () => void;
  onOpenDataModal: (initialTab?: 'github' | 'backup' | 'cloudflare') => void;
  onOpenPaycheckCyclesModal?: () => void;
  onOpenManageAccountsModal?: () => void;
  currentMonthLabel: string;
  availableMonths: { id: string; label: string }[];
  currentMonthId: string;
  onSelectMonth: (monthId: string) => void;
  gitHubSyncStatus?: 'idle' | 'saving' | 'synced' | 'error';
  isGitHubConnected?: boolean;
  lastSyncedCommit?: string;
  isDualPaneMode?: boolean;
  onToggleDualPaneMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenAddModal,
  onOpenIncomeModal,
  onOpenDataModal,
  onOpenPaycheckCyclesModal,
  onOpenManageAccountsModal,
  availableMonths,
  currentMonthId,
  onSelectMonth,
  gitHubSyncStatus = 'idle',
  isGitHubConnected = false,
  lastSyncedCommit,
  isDualPaneMode = false,
  onToggleDualPaneMode,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-6 lg:px-8 pt-safe-top pb-2.5 select-none">
      <div className="w-full max-w-[1920px] mx-auto flex items-center justify-between gap-2.5 sm:gap-4 md:gap-6">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <a
            href="/"
            className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2 whitespace-nowrap shrink-0 hover:text-emerald-400 transition cursor-pointer touch-manipulation"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <span className="font-bold text-white text-sm sm:text-base tracking-tight">FlowLedger</span>
          </a>

          {/* Small Version Badge for build verification */}
          <span
            title={`FlowLedger Build Version ${APP_VERSION}`}
            className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-400 select-none tracking-wide"
          >
            {APP_VERSION}
          </span>

          {/* Month Cycle Selector */}
          <select
            value={currentMonthId}
            onChange={(e) => onSelectMonth(e.target.value)}
            className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 focus:outline-none focus:border-emerald-500 shrink-0 cursor-pointer touch-manipulation"
          >
            {availableMonths.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Zone 2: Navigation Links (Single-line, text links with clean active states) */}
        <nav className="hidden lg:flex items-center gap-4 xl:gap-5 text-xs font-medium text-slate-400">
          <button
            onClick={() => onSelectTab('ledger')}
            className={`flex items-center gap-1.5 transition whitespace-nowrap shrink-0 pb-0.5 border-b-2 cursor-pointer touch-manipulation active:scale-95 ${
              activeTab === 'ledger'
                ? 'text-white border-emerald-500 font-semibold'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Obligations Ledger</span>
          </button>

          <button
            onClick={() => onSelectTab('charts')}
            className={`flex items-center gap-1.5 transition whitespace-nowrap shrink-0 pb-0.5 border-b-2 cursor-pointer touch-manipulation active:scale-95 ${
              activeTab === 'charts'
                ? 'text-white border-emerald-500 font-semibold'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Cash Flow & Analytics</span>
          </button>

          <button
            onClick={() => onSelectTab('calendar')}
            className={`flex items-center gap-1.5 transition whitespace-nowrap shrink-0 pb-0.5 border-b-2 cursor-pointer touch-manipulation active:scale-95 ${
              activeTab === 'calendar'
                ? 'text-white border-emerald-500 font-semibold'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Due Schedule</span>
          </button>

          <button
            onClick={() => onSelectTab('debt')}
            className={`flex items-center gap-1.5 transition whitespace-nowrap shrink-0 pb-0.5 border-b-2 cursor-pointer touch-manipulation active:scale-95 ${
              activeTab === 'debt'
                ? 'text-white border-emerald-500 font-semibold'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            <span>Debt Snowball</span>
          </button>
        </nav>

        {/* Zone 3: Primary Action & Utilities */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 pr-1 sm:pr-3 lg:pr-6">
          {/* Duo Dual-Screen Mode Toggle */}
          {onToggleDualPaneMode && (
            <button
              onClick={onToggleDualPaneMode}
              title={
                isDualPaneMode
                  ? 'Dual-Screen Mode Active (Opened Duo) - Click to switch to Single-Screen (Closed Duo)'
                  : 'Switch to Dual-Screen 2-Pane View (for Opened Duo / Wide screen)'
              }
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition whitespace-nowrap active:scale-95 cursor-pointer touch-manipulation ${
                isDualPaneMode
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isDualPaneMode ? 'Opened' : 'Closed'}</span>
            </button>
          )}

          {/* Pay Periods / Bi-Weekly Cycles button */}
          {onOpenPaycheckCyclesModal && (
            <button
              onClick={onOpenPaycheckCyclesModal}
              title="Configure Paycheck Periods & Bi-Weekly Dates"
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition whitespace-nowrap active:scale-95 cursor-pointer touch-manipulation"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Periods</span>
            </button>
          )}

          {/* Manage Banks button */}
          {onOpenManageAccountsModal && (
            <button
              onClick={onOpenManageAccountsModal}
              title="Add or Delete Bank Accounts"
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition whitespace-nowrap cursor-pointer touch-manipulation active:scale-95"
            >
              <Building2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Banks</span>
            </button>
          )}

          {/* Incomes button */}
          <button
            onClick={onOpenIncomeModal}
            title="Manage Incomes / Paychecks"
            className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition cursor-pointer touch-manipulation active:scale-95"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Paychecks</span>
          </button>

          {/* GitHub Auto-Sync Button & Indicator */}
          <button
            onClick={() => onOpenDataModal('github')}
            title={
              isGitHubConnected
                ? gitHubSyncStatus === 'saving'
                  ? 'Saving changes to GitHub...'
                  : gitHubSyncStatus === 'error'
                  ? 'GitHub sync error - click to fix'
                  : `GitHub Auto-Save Active ${lastSyncedCommit ? '(commit ' + lastSyncedCommit + ')' : '(synced)'}`
                : 'Connect GitHub to auto-save data on every update'
            }
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition whitespace-nowrap cursor-pointer touch-manipulation active:scale-95 ${
              isGitHubConnected
                ? gitHubSyncStatus === 'error'
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                  : gitHubSyncStatus === 'saving'
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">
              {isGitHubConnected
                ? gitHubSyncStatus === 'saving'
                  ? 'Syncing...'
                  : gitHubSyncStatus === 'error'
                  ? 'GitHub Error'
                  : 'GitHub Synced'
                : 'GitHub'}
            </span>
            {isGitHubConnected && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  gitHubSyncStatus === 'saving'
                    ? 'bg-amber-400 animate-pulse'
                    : gitHubSyncStatus === 'error'
                    ? 'bg-rose-400'
                    : 'bg-emerald-400'
                }`}
              />
            )}
          </button>

          {/* Backup / Cloudflare button */}
          <button
            onClick={() => onOpenDataModal('backup')}
            title="Backup, Export & Cloudflare Hosting"
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs transition cursor-pointer touch-manipulation active:scale-95"
          >
            <Database className="w-3.5 h-3.5" />
          </button>

          {/* In-App PWA Install Button */}
          <PWAInstallButton />

          {/* Primary CTA */}
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition shadow-md shadow-emerald-500/20 active:scale-95 whitespace-nowrap cursor-pointer touch-manipulation"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Bill</span>
          </button>
        </div>
      </div>
    </header>
  );
};
