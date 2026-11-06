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
  Globe,
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
  cloudflareSyncStatus?: 'idle' | 'saving' | 'synced' | 'error';
  isCloudflareConnected?: boolean;
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
  cloudflareSyncStatus = 'idle',
  isCloudflareConnected = false,
  isDualPaneMode = false,
  onToggleDualPaneMode,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 pt-safe-top pb-2 select-none w-full max-w-full overflow-hidden">
      {/* Row 1: Brand & Month & Primary CTA */}
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-6 flex items-center justify-between gap-3 pb-2 border-b border-slate-900/80">
        {/* Left: Brand + Version + Month */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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

          {/* Small Version Badge */}
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

        {/* Right: Primary Action CTA */}
        <div className="flex items-center gap-1.5 shrink-0 pr-1 sm:pr-2">
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition shadow-md shadow-emerald-500/20 active:scale-95 whitespace-nowrap cursor-pointer touch-manipulation"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">Add Bill</span>
          </button>
        </div>
      </div>

      {/* Row 2: Horizontally Scrollable Tab & Utility Bar (100% scrollable, zero screen extension) */}
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-6 pt-1.5">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap py-0.5 max-w-full">
          {/* Main Navigation Tabs */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-900/90 border border-slate-800/90 rounded-xl shrink-0">
            <button
              onClick={() => onSelectTab('ledger')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer touch-manipulation active:scale-95 whitespace-nowrap ${
                activeTab === 'ledger'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Obligations Ledger</span>
            </button>

            <button
              onClick={() => onSelectTab('charts')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer touch-manipulation active:scale-95 whitespace-nowrap ${
                activeTab === 'charts'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Cash Flow & Analytics</span>
            </button>

            <button
              onClick={() => onSelectTab('calendar')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer touch-manipulation active:scale-95 whitespace-nowrap ${
                activeTab === 'calendar'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Due Schedule</span>
            </button>

            <button
              onClick={() => onSelectTab('debt')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer touch-manipulation active:scale-95 whitespace-nowrap ${
                activeTab === 'debt'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Debt Snowball</span>
            </button>
          </div>

          <div className="w-px h-4 bg-slate-800 shrink-0 mx-0.5" />

          {/* Action Utilities in the same scrollable row */}
          {onToggleDualPaneMode && (
            <button
              onClick={onToggleDualPaneMode}
              title={
                isDualPaneMode
                  ? 'Dual-Screen Mode Active (Opened Duo) - Click to switch to Single-Screen (Closed Duo)'
                  : 'Switch to Dual-Screen 2-Pane View (for Opened Duo / Wide screen)'
              }
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition whitespace-nowrap active:scale-95 cursor-pointer touch-manipulation shrink-0 ${
                isDualPaneMode
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>{isDualPaneMode ? 'Duo: Opened' : 'Duo: Closed'}</span>
            </button>
          )}

          {onOpenPaycheckCyclesModal && (
            <button
              onClick={onOpenPaycheckCyclesModal}
              title="Configure Paycheck Periods & Bi-Weekly Dates"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition whitespace-nowrap active:scale-95 cursor-pointer touch-manipulation shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Pay Periods</span>
            </button>
          )}

          {onOpenManageAccountsModal && (
            <button
              onClick={onOpenManageAccountsModal}
              title="Add or Delete Bank Accounts"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition whitespace-nowrap cursor-pointer touch-manipulation active:scale-95 shrink-0"
            >
              <Building2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Manage Banks</span>
            </button>
          )}

          <button
            onClick={onOpenIncomeModal}
            title="Manage Incomes / Paychecks"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition cursor-pointer touch-manipulation active:scale-95 shrink-0"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Paychecks</span>
          </button>

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
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition whitespace-nowrap cursor-pointer touch-manipulation active:scale-95 shrink-0 ${
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
            <span>
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

          <button
            onClick={() => onOpenDataModal('cloudflare')}
            title={
              isCloudflareConnected
                ? cloudflareSyncStatus === 'saving'
                  ? 'Saving changes to Cloudflare...'
                  : cloudflareSyncStatus === 'error'
                  ? 'Cloudflare sync error - click to fix'
                  : 'Cloudflare Sync Active'
                : 'Configure Cloudflare Sync'
            }
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition whitespace-nowrap cursor-pointer touch-manipulation active:scale-95 shrink-0 ${
              isCloudflareConnected
                ? cloudflareSyncStatus === 'error'
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                  : cloudflareSyncStatus === 'saving'
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'bg-orange-500/15 border-orange-500/30 text-orange-400'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-orange-400" />
            <span>
              {isCloudflareConnected
                ? cloudflareSyncStatus === 'saving'
                  ? 'CF Syncing...'
                  : cloudflareSyncStatus === 'error'
                  ? 'CF Error'
                  : 'Cloudflare'
                : 'Cloudflare'}
            </span>
            {isCloudflareConnected && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  cloudflareSyncStatus === 'saving'
                    ? 'bg-amber-400 animate-pulse'
                    : cloudflareSyncStatus === 'error'
                    ? 'bg-rose-400'
                    : 'bg-orange-400'
                }`}
              />
            )}
          </button>

          <button
            onClick={() => onOpenDataModal('backup')}
            title="Backup & File Export"
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs transition cursor-pointer touch-manipulation active:scale-95 shrink-0"
          >
            <Database className="w-3.5 h-3.5" />
          </button>

          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};

