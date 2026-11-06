import React, { useState } from 'react';
import { BudgetState, BudgetMonth } from '../types/expense';
import { exportToJSON, importFromJSON, exportToCSV, resetToDefault } from '../utils/storage';
import { 
  GitHubConfig, 
  validateGitHubToken, 
  saveDataToGitHub, 
  loadDataFromGitHub 
} from '../utils/githubSync';
import { APP_VERSION } from '../utils/version';
import { 
  X, 
  Download, 
  Upload, 
  RefreshCw, 
  Globe, 
  Check, 
  FileSpreadsheet, 
  FileCode,
  Github,
  Cloud,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react';

interface DataExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: BudgetState;
  onUpdateState: (newState: BudgetState) => void;
  currentMonth: BudgetMonth;
  gitHubConfig: GitHubConfig;
  onUpdateGitHubConfig: (config: GitHubConfig) => void;
  initialTab?: 'github' | 'backup' | 'cloudflare';
  onSyncSuccess?: () => void;
}

export const DataExportImportModal: React.FC<DataExportImportModalProps> = ({
  isOpen,
  onClose,
  state,
  onUpdateState,
  currentMonth,
  gitHubConfig,
  onUpdateGitHubConfig,
  initialTab = 'github',
  onSyncSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'github' | 'backup' | 'cloudflare'>(initialTab);
  const [copiedJSON, setCopiedJSON] = useState(false);
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // GitHub local form state
  const [ghToken, setGhToken] = useState(gitHubConfig.token);
  const [ghOwner, setGhOwner] = useState(gitHubConfig.owner);
  const [ghRepo, setGhRepo] = useState(gitHubConfig.repo || 'pwa-budgv2');
  const [ghBranch, setGhBranch] = useState(gitHubConfig.branch || 'main');
  const [ghFilePath, setGhFilePath] = useState(gitHubConfig.filePath || 'data/flowledger-data.json');
  const [ghAutoSave, setGhAutoSave] = useState(gitHubConfig.autoSave ?? true);
  const [ghSkipCi, setGhSkipCi] = useState(gitHubConfig.skipCi ?? true);
  const [showToken, setShowToken] = useState(false);

  // Verification & sync UI state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState<string | null>(null);
  const [verifiedAvatar, setVerifiedAvatar] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [isSavingToGitHub, setIsSavingToGitHub] = useState(false);
  const [saveGHSuccess, setSaveGHSuccess] = useState<string | null>(null);
  const [saveGHError, setSaveGHError] = useState<string | null>(null);

  const [isLoadingFromGitHub, setIsLoadingFromGitHub] = useState(false);
  const [loadGHSuccess, setLoadGHSuccess] = useState<string | null>(null);
  const [loadGHError, setLoadGHError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestGitHubConnection = async () => {
    if (!ghToken.trim()) {
      setVerifyError('Please enter a GitHub Personal Access Token.');
      return;
    }
    setIsVerifying(true);
    setVerifyError(null);
    setVerifiedUser(null);
    const res = await validateGitHubToken(ghToken);
    setIsVerifying(false);
    if (res.valid && res.username) {
      setVerifiedUser(res.username);
      setVerifiedAvatar(res.avatarUrl || null);
      if (!ghOwner) {
        setGhOwner(res.username);
      }
      // Auto-save configuration with updated owner
      const updated: GitHubConfig = {
        ...gitHubConfig,
        enabled: true,
        token: ghToken.trim(),
        owner: ghOwner || res.username,
        repo: ghRepo.trim(),
        branch: ghBranch.trim() || 'main',
        filePath: ghFilePath.trim() || 'data/flowledger-data.json',
        autoSave: ghAutoSave,
        skipCi: ghSkipCi,
      };
      onUpdateGitHubConfig(updated);
    } else {
      setVerifyError(res.error || 'Invalid token');
    }
  };

  const handleSaveConfig = () => {
    const updated: GitHubConfig = {
      ...gitHubConfig,
      enabled: Boolean(ghToken.trim() && (ghOwner.trim() || verifiedUser) && ghRepo.trim()),
      token: ghToken.trim(),
      owner: (ghOwner.trim() || verifiedUser || '').trim(),
      repo: ghRepo.trim(),
      branch: ghBranch.trim() || 'main',
      filePath: ghFilePath.trim() || 'data/flowledger-data.json',
      autoSave: ghAutoSave,
      skipCi: ghSkipCi,
    };
    onUpdateGitHubConfig(updated);
    return updated;
  };

  const handleSaveToGitHubNow = async () => {
    const currentConfig = handleSaveConfig();
    if (!currentConfig.token || !currentConfig.repo) {
      setSaveGHError('Please enter your GitHub token and repository name.');
      return;
    }
    setIsSavingToGitHub(true);
    setSaveGHError(null);
    setSaveGHSuccess(null);

    const res = await saveDataToGitHub(currentConfig, state, `Manual FlowLedger save via UI${currentConfig.skipCi ? ' [skip ci]' : ''}`);
    setIsSavingToGitHub(false);

    if (res.success) {
      setSaveGHSuccess(`Saved to GitHub! Commit: ${res.commitSha || 'latest'}`);
      if (onSyncSuccess) onSyncSuccess();
      setTimeout(() => setSaveGHSuccess(null), 4000);
    } else {
      setSaveGHError(res.error || 'Failed to save to GitHub');
    }
  };

  const handleLoadFromGitHubNow = async () => {
    const currentConfig = handleSaveConfig();
    if (!currentConfig.token || !currentConfig.repo) {
      setLoadGHError('Please enter your GitHub token and repository name.');
      return;
    }
    setIsLoadingFromGitHub(true);
    setLoadGHError(null);
    setLoadGHSuccess(null);

    const res = await loadDataFromGitHub(currentConfig);
    setIsLoadingFromGitHub(false);

    if (res.success && res.state) {
      onUpdateState(res.state);
      setLoadGHSuccess(`Successfully loaded latest data from GitHub (commit: ${res.commitSha || 'latest'})!`);
      if (onSyncSuccess) onSyncSuccess();
      setTimeout(() => setLoadGHSuccess(null), 4000);
    } else {
      setLoadGHError(res.error || 'Failed to load from GitHub');
    }
  };

  const handleDownloadJSON = () => {
    const json = exportToJSON(state);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flowledger-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = () => {
    const csv = exportToCSV(currentMonth);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flowledger-${currentMonth.id}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyJSON = async () => {
    try {
      await navigator.clipboard.writeText(exportToJSON(state));
      setCopiedJSON(true);
      setTimeout(() => setCopiedJSON(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleImportText = () => {
    if (!importText.trim()) return;
    const imported = importFromJSON(importText);
    if (imported) {
      onUpdateState(imported);
      setImportStatus('success');
      setTimeout(() => {
        setImportStatus(null);
        onClose();
      }, 1200);
    } else {
      setImportStatus('error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const imported = importFromJSON(content);
        if (imported) {
          onUpdateState(imported);
          setImportStatus('success');
          setTimeout(() => {
            setImportStatus(null);
            onClose();
          }, 1200);
        } else {
          setImportStatus('error');
        }
      }
    };
    reader.readAsText(file);
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleReset = () => {
    const fresh = resetToDefault();
    onUpdateState(fresh);
    setShowResetConfirm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-100 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Github className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Data Sync, GitHub & Cloudflare
            </h2>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 font-semibold border border-slate-700/60">
              {APP_VERSION}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1.5 mt-4 p-1 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('github')}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'github'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Github className="w-3.5 h-3.5 text-emerald-400" />
            <span>GitHub Auto-Save</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'backup'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-blue-400" />
            <span>File Backup</span>
          </button>

          <button
            onClick={() => setActiveTab('cloudflare')}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'cloudflare'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-orange-400" />
            <span>Cloudflare</span>
          </button>
        </div>

        {/* TAB 1: GITHUB AUTO-SAVE */}
        {activeTab === 'github' && (
          <div className="mt-4 space-y-4 text-xs">
            {/* Banner */}
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-300">
                  Continuous GitHub Synchronization
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                  Every time you enter a transaction, adjust balances, or change pay periods, FlowLedger will automatically commit your updated ledger data directly to your GitHub repository!
                </p>
              </div>
            </div>

            {/* GitHub Personal Access Token Form */}
            <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>GitHub Personal Access Token (PAT) *</span>
                  </label>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=FlowLedger+Budget+AutoSync"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 underline font-medium"
                  >
                    <span>Create token (30s)</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    placeholder="ghp_xxxx or github_pat_xxxx"
                    value={ghToken}
                    onChange={(e) => {
                      setGhToken(e.target.value);
                      setVerifiedUser(null);
                    }}
                    className="w-full pl-3 pr-20 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <div className="absolute right-1 top-1 bottom-1 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="p-1 text-slate-400 hover:text-slate-200"
                      title={showToken ? 'Hide token' : 'Show token'}
                    >
                      {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleTestGitHubConnection}
                      disabled={isVerifying || !ghToken.trim()}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-[10px] disabled:opacity-40 transition"
                    >
                      {isVerifying ? 'Checking...' : 'Verify'}
                    </button>
                  </div>
                </div>
                {verifiedUser && (
                  <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1.5">
                    {verifiedAvatar && (
                      <img src={verifiedAvatar} alt="" className="w-3.5 h-3.5 rounded-full" />
                    )}
                    <span>Connected as <strong>@{verifiedUser}</strong></span>
                  </p>
                )}
                {verifyError && (
                  <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{verifyError}</span>
                  </p>
                )}
              </div>

              {/* Repo & Path Configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    GitHub Username / Owner
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 86brancan"
                    value={ghOwner}
                    onChange={(e) => setGhOwner(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    Repository Name *
                  </label>
                  <input
                    type="text"
                    placeholder="pwa-budgv2"
                    value={ghRepo}
                    onChange={(e) => setGhRepo(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    placeholder="main"
                    value={ghBranch}
                    onChange={(e) => setGhBranch(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    File Path in Repository
                  </label>
                  <input
                    type="text"
                    placeholder="data/flowledger-data.json"
                    value={ghFilePath}
                    onChange={(e) => setGhFilePath(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={ghAutoSave}
                    onChange={(e) => {
                      setGhAutoSave(e.target.checked);
                      handleSaveConfig();
                    }}
                    className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-slate-200">
                      Auto-Save to GitHub on every update
                    </span>
                    <p className="text-[10px] text-slate-400">
                      Whenever you add/edit expenses, accounts, or incomes, changes commit automatically.
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={ghSkipCi}
                    onChange={(e) => {
                      setGhSkipCi(e.target.checked);
                      handleSaveConfig();
                    }}
                    className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-slate-200">
                      Include [skip ci] in commit messages (Recommended)
                    </span>
                    <p className="text-[10px] text-slate-400">
                      Prevents Cloudflare from re-building the web app on every small transaction save.
                    </p>
                  </div>
                </label>
              </div>

              {/* Status & Last Synced */}
              {gitHubConfig.lastSyncedAt && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Last synced: <strong>{new Date(gitHubConfig.lastSyncedAt).toLocaleString()}</strong></span>
                  {gitHubConfig.lastCommitSha && (
                    <span className="font-mono text-emerald-400 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                      commit {gitHubConfig.lastCommitSha}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Feedback messages */}
            {saveGHSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{saveGHSuccess}</span>
              </div>
            )}
            {saveGHError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{saveGHError}</span>
              </div>
            )}
            {loadGHSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{loadGHSuccess}</span>
              </div>
            )}
            {loadGHError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loadGHError}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={handleLoadFromGitHubNow}
                disabled={isLoadingFromGitHub || !ghToken.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition border border-slate-700 disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>{isLoadingFromGitHub ? 'Downloading...' : 'Load from GitHub'}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveToGitHubNow}
                disabled={isSavingToGitHub || !ghToken.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold transition shadow-sm active:scale-95 disabled:opacity-40"
              >
                {isSavingToGitHub ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>{isSavingToGitHub ? 'Committing...' : 'Commit & Save to GitHub'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: MANUAL BACKUP & RESTORE */}
        {activeTab === 'backup' && (
          <div className="mt-4 space-y-4 text-xs">
            {/* Download buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleDownloadJSON}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800 text-slate-200 transition"
              >
                <FileCode className="w-4 h-4 text-emerald-400" />
                <div className="text-left">
                  <strong className="block font-semibold">Download Full JSON Backup</strong>
                  <span className="text-[11px] text-slate-400">All months, accounts & incomes</span>
                </div>
              </button>

              <button
                onClick={handleDownloadCSV}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800 text-slate-200 transition"
              >
                <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                <div className="text-left">
                  <strong className="block font-semibold">Export Month to CSV</strong>
                  <span className="text-[11px] text-slate-400">For Excel or Google Sheets</span>
                </div>
              </button>
            </div>

            {/* Quick Copy JSON */}
            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-200">Clipboard Backup</span>
                <button
                  onClick={handleCopyJSON}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition flex items-center gap-1"
                >
                  {copiedJSON ? <Check className="w-3 h-3 text-emerald-400" /> : <Download className="w-3 h-3" />}
                  <span>{copiedJSON ? 'Copied!' : 'Copy JSON'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Copy raw ledger JSON to paste into another browser or store in notes.
              </p>
            </div>

            {/* Restore from JSON */}
            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
              <span className="font-semibold text-slate-200 block mb-1">Restore from Backup</span>
              <p className="text-[11px] text-slate-400 mb-2">
                Paste JSON backup string or upload a previously exported .json file:
              </p>

              <div className="flex items-center gap-2 mb-2">
                <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer text-slate-300 transition">
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Select JSON File</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <textarea
                rows={2}
                placeholder="Or paste JSON backup here..."
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-white focus:outline-none focus:border-emerald-500 mb-2"
              />

              <div className="flex items-center justify-between">
                {importStatus === 'success' && (
                  <span className="text-emerald-400 font-semibold text-[11px]">
                    Backup restored successfully!
                  </span>
                )}
                {importStatus === 'error' && (
                  <span className="text-rose-400 font-semibold text-[11px]">
                    Invalid JSON format. Check file contents.
                  </span>
                )}
                {!importStatus && <span />}

                <button
                  onClick={handleImportText}
                  disabled={!importText.trim()}
                  className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 font-bold text-xs transition"
                >
                  Apply Backup
                </button>
              </div>
            </div>

            {/* Reset to template */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3 border-t border-slate-800">
              {showResetConfirm ? (
                <div className="flex items-center gap-2 w-full justify-between">
                  <span className="text-rose-400 font-semibold text-[11px]">
                    Clear all entries and start fresh?
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowResetConfirm(false)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-2.5 py-1 rounded-lg bg-rose-500 text-white font-bold text-[11px]"
                    >
                      Confirm Reset
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="text-slate-500 text-[11px]">
                    Want a fresh ledger?
                  </span>
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="text-slate-400 hover:text-rose-400 transition text-[11px] underline"
                  >
                    Reset all data to empty template
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CLOUDFLARE HOSTING GUIDE */}
        {activeTab === 'cloudflare' && (
          <div className="mt-4 space-y-3.5 text-xs">
            <div className="p-3.5 rounded-xl bg-orange-950/20 border border-orange-500/30">
              <span className="font-bold text-orange-400 block mb-1 text-sm">
                Deploying to Cloudflare Workers / Pages
              </span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                FlowLedger is built with static assets configured for Cloudflare Workers & Pages.
              </p>
            </div>

            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                <span className="font-semibold text-slate-200 block mb-1">
                  1. Deploy Command
                </span>
                <p className="text-slate-400 text-[11px] mb-2">
                  In your repository or terminal, deploy with:
                </p>
                <code className="block p-2 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 font-mono text-[11px]">
                  npx wrangler deploy
                </code>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                <span className="font-semibold text-slate-200 block mb-1">
                  2. Single Page App Configuration
                </span>
                <p className="text-slate-400 text-[11px]">
                  Our <code className="text-slate-200">wrangler.jsonc</code> is pre-configured with <code className="text-emerald-400 font-mono">not_found_handling: "single-page-application"</code> to route all URLs directly to <code className="text-slate-200">index.html</code>.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                <span className="font-semibold text-slate-200 block mb-1">
                  3. If Cloudflare says "No URLs enabled"
                </span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Go to your <strong>Cloudflare Dashboard → Workers & Pages → pwa-budgv2 → Settings → Domains & Routes</strong> and enable the <code className="text-emerald-400 font-mono">workers.dev</code> route or attach your custom domain.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
