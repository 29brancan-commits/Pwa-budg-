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
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3 pt-safe">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/"
            className="text-lg font-bold tracking-tight text-white flex items-center gap-2 whitespace-nowrap shrink-0 hover:text-emerald-400 transition"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <span>FlowLedger</span>
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
            className="hidden sm:inline-block px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 focus:outline-none focus:border-emerald-500 shrink-0 cursor-pointer"
          >
            {availableMonths.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Zone 2: Navigation Links (Single-line, text links with clean active states) */}
        <nav className="hidden md:flex items-center gap-5 text-xs font-medium text-slate-400">
          <button
            onClick={() => onSelectTab('ledger')}
            className={`flex items-center gap-1.5 transition whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
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
            className={`flex items-center gap-1.5 transition whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
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
            className={`flex items-center gap-1.5 transition whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
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
            className={`flex items-center gap-1.5 transition whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
              activeTab === 'debt'
                ? 'text-white border-emerald-500 font-semibold'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            <span>Debt Snowball</span>
          </button>
        </nav>

        {/* Zone 3: Primary Action & Utilities (with safe right margin for iPhone Duo status overlay) */}
        <div className="flex items-center gap-2 shrink-0 pr-14 sm:pr-0">
          {/* Duo Dual-Screen Mode Toggle */}
          {onToggleDualPaneMode && (
            <button
              onClick={onToggleDualPaneMode}
              title={
                isDualPaneMode
                  ? 'Dual-Screen Mode Active (Opened Duo) - Click to switch to Single-Screen (Closed Duo)'
                  : 'Switch to Dual-Screen 2-Pane View (for Opened Duo / Wide screen)'
              }
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition whitespace-nowrap active:scale-95 ${
                isDualPaneMode
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>{isDualPaneMode ? 'Duo: Opened' : 'Duo: Closed'}</span>
            </button>
          )}

          {/* Incomes button */}
          <button
            onClick={onOpenIncomeModal}
            title="Manage Incomes / Paychecks"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Paychecks</span>
          </button>

          {/* Pay Periods / Bi-Weekly Cycles button */}
          {onOpenPaycheckCyclesModal && (
            <button
              onClick={onOpenPaycheckCyclesModal}
              title="Configure Paycheck Periods & Bi-Weekly Dates"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition whitespace-nowrap active:scale-95"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Pay Periods</span>
            </button>
          )}

          {/* Manage Banks button */}
          {onOpenManageAccountsModal && (
            <button
              onClick={onOpenManageAccountsModal}
              title="Add or Delete Bank Accounts"
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition whitespace-nowrap"
            >
              <Building2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Banks</span>
            </button>
          )}

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
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition whitespace-nowrap ${
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
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs transition"
          >
            <Database className="w-3.5 h-3.5" />
          </button>

          {/* In-App PWA Install Button */}
          <PWAInstallButton />

          {/* Primary CTA */}
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition shadow-md shadow-emerald-500/20 active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">Add Bill</span>
          </button>
        </div>
      </div>
    </header>
  );
};
