import React, { useState } from 'react';
import { BudgetState, BudgetMonth } from '../types/expense';
import { exportToJSON, importFromJSON, exportToCSV, resetToDefault } from '../utils/storage';
import { 
  GitHubConfig, 
  validateGitHubToken, 
  saveDataToGitHub, 
  loadDataFromGitHub 
} from '../utils/githubSync';
import {
  CloudflareConfig,
  saveDataToCloudflare,
  loadDataFromCloudflare,
  generateCloudflareSyncShareLink,
  generateCloudflareSyncToken,
  parseCloudflareSyncToken
} from '../utils/cloudflareSync';
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
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Eye,
  EyeOff,
  Server
} from 'lucide-react';

interface DataExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: BudgetState;
  onUpdateState: (newState: BudgetState) => void;
  currentMonth: BudgetMonth;
  gitHubConfig: GitHubConfig;
  onUpdateGitHubConfig: (config: GitHubConfig) => void;
  cloudflareConfig: CloudflareConfig;
  onUpdateCloudflareConfig: (config: CloudflareConfig) => void;
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
  cloudflareConfig,
  onUpdateCloudflareConfig,
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

  // GitHub verification & sync UI state
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

  // Cloudflare local form state
  const [cfEnabled, setCfEnabled] = useState(cloudflareConfig.enabled);
  const [cfMode, setCfMode] = useState<'kv' | 'worker_endpoint'>(cloudflareConfig.mode || 'kv');
  const [cfAccountId, setCfAccountId] = useState(cloudflareConfig.accountId || '');
  const [cfKvNamespaceId, setCfKvNamespaceId] = useState(cloudflareConfig.kvNamespaceId || '');
  const [cfApiToken, setCfApiToken] = useState(cloudflareConfig.apiToken || '');
  const [cfWorkerEndpoint, setCfWorkerEndpoint] = useState(cloudflareConfig.workerEndpoint || '');
  const [cfSyncKey, setCfSyncKey] = useState(cloudflareConfig.syncKey || 'flowledger_budget_data');
  const [cfAutoSave, setCfAutoSave] = useState(cloudflareConfig.autoSave ?? true);
  const [showCfToken, setShowCfToken] = useState(false);

  // Cloudflare multi-device sync link & token state
  const [copiedCFLink, setCopiedCFLink] = useState(false);
  const [copiedCFToken, setCopiedCFToken] = useState(false);
  const [cfImportTokenStr, setCfImportTokenStr] = useState('');
  const [cfTokenImportMsg, setCfTokenImportMsg] = useState<string | null>(null);

  const [isSavingToCF, setIsSavingToCF] = useState(false);
  const [saveCFSuccess, setSaveCFSuccess] = useState<string | null>(null);
  const [saveCFError, setSaveCFError] = useState<string | null>(null);

  const [isLoadingFromCF, setIsLoadingFromCF] = useState(false);
  const [loadCFSuccess, setLoadCFSuccess] = useState<string | null>(null);
  const [loadCFError, setLoadCFError] = useState<string | null>(null);

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sync state when modal opens or initialTab changes
  React.useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      if (cloudflareConfig) {
        setCfEnabled(Boolean(cloudflareConfig.enabled));
        setCfMode(cloudflareConfig.mode || 'kv');
        setCfAccountId(cloudflareConfig.accountId || '');
        setCfKvNamespaceId(cloudflareConfig.kvNamespaceId || '');
        setCfApiToken(cloudflareConfig.apiToken || '');
        setCfWorkerEndpoint(cloudflareConfig.workerEndpoint || '');
        setCfSyncKey(cloudflareConfig.syncKey || 'flowledger_budget_data');
        setCfAutoSave(cloudflareConfig.autoSave ?? true);
      }
      if (gitHubConfig) {
        setGhToken(gitHubConfig.token || '');
        setGhOwner(gitHubConfig.owner || '');
        setGhRepo(gitHubConfig.repo || 'pwa-budgv2');
        setGhBranch(gitHubConfig.branch || 'main');
        setGhFilePath(gitHubConfig.filePath || 'data/flowledger-data.json');
        setGhAutoSave(gitHubConfig.autoSave ?? true);
        setGhSkipCi(gitHubConfig.skipCi ?? true);
      }
    }
  }, [isOpen, initialTab, cloudflareConfig, gitHubConfig]);

  if (!isOpen) return null;

  const handleTestGitHubConnection = async () => {
    const tok = (ghToken || '').trim();
    if (!tok) {
      setVerifyError('Please enter a GitHub Personal Access Token.');
      return;
    }
    setIsVerifying(true);
    setVerifyError(null);
    setVerifiedUser(null);
    const res = await validateGitHubToken(tok);
    setIsVerifying(false);
    if (res.valid && res.username) {
      setVerifiedUser(res.username);
      setVerifiedAvatar(res.avatarUrl || null);
      const own = (ghOwner || '').trim() || res.username;
      if (!ghOwner) {
        setGhOwner(res.username);
      }
      const updated: GitHubConfig = {
        ...gitHubConfig,
        enabled: true,
        token: tok,
        owner: own,
        repo: (ghRepo || '').trim(),
        branch: (ghBranch || '').trim() || 'main',
        filePath: (ghFilePath || '').trim() || 'data/flowledger-data.json',
        autoSave: ghAutoSave,
        skipCi: ghSkipCi,
      };
      onUpdateGitHubConfig(updated);
    } else {
      setVerifyError(res.error || 'Invalid token');
    }
  };

  const handleSaveConfig = () => {
    const tok = (ghToken || '').trim();
    const own = ((ghOwner || '').trim() || verifiedUser || '').trim();
    const rep = (ghRepo || '').trim();
    const br = (ghBranch || '').trim();
    const fp = (ghFilePath || '').trim();

    const updated: GitHubConfig = {
      ...gitHubConfig,
      enabled: Boolean(tok && own && rep),
      token: tok,
      owner: own,
      repo: rep,
      branch: br || 'main',
      filePath: fp || 'data/flowledger-data.json',
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

  // Save Cloudflare configuration helper
  const handleSaveCloudflareConfig = () => {
    const accId = (cfAccountId || '').trim();
    const kvId = (cfKvNamespaceId || '').trim();
    const token = (cfApiToken || '').trim();
    const endpoint = (cfWorkerEndpoint || '').trim();
    const key = (cfSyncKey || '').trim();

    const isConfigValid = cfMode === 'kv' 
      ? Boolean(accId && kvId && token)
      : Boolean(endpoint);

    const updated: CloudflareConfig = {
      ...cloudflareConfig,
      enabled: cfEnabled && isConfigValid,
      mode: cfMode || 'kv',
      accountId: accId,
      kvNamespaceId: kvId,
      apiToken: token,
      workerEndpoint: endpoint,
      syncKey: key || 'flowledger_budget_data',
      autoSave: cfAutoSave,
    };
    onUpdateCloudflareConfig(updated);
    return updated;
  };

  const handleSaveToCloudflareNow = async () => {
    const currentConfig = handleSaveCloudflareConfig();
    setIsSavingToCF(true);
    setSaveCFError(null);
    setSaveCFSuccess(null);

    const res = await saveDataToCloudflare(currentConfig, state);
    setIsSavingToCF(false);

    if (res.success) {
      setSaveCFSuccess(`Saved to Cloudflare! (${new Date(res.syncedAt!).toLocaleTimeString()})`);
      if (onSyncSuccess) onSyncSuccess();
      setTimeout(() => setSaveCFSuccess(null), 4000);
    } else {
      setSaveCFError(res.error || 'Failed to save to Cloudflare');
    }
  };

  const handleLoadFromCloudflareNow = async () => {
    const currentConfig = handleSaveCloudflareConfig();
    setIsLoadingFromCF(true);
    setLoadCFError(null);
    setLoadCFSuccess(null);

    const res = await loadDataFromCloudflare(currentConfig);
    setIsLoadingFromCF(false);

    if (res.success && res.state) {
      onUpdateState(res.state);
      setLoadCFSuccess('Successfully loaded latest data from Cloudflare!');
      if (onSyncSuccess) onSyncSuccess();
      setTimeout(() => setLoadCFSuccess(null), 4000);
    } else {
      setLoadCFError(res.error || 'Failed to load from Cloudflare');
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
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1.5 mt-4 p-1 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('github')}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
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
            className={`flex-1 py-1.5 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
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
            className={`flex-1 py-1.5 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
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
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-[10px] disabled:opacity-40 transition cursor-pointer"
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
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition border border-slate-700 disabled:opacity-40 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>{isLoadingFromGitHub ? 'Downloading...' : 'Load from GitHub'}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveToGitHubNow}
                disabled={isSavingToGitHub || !ghToken.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold transition shadow-sm active:scale-95 disabled:opacity-40 cursor-pointer"
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
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800 text-slate-200 transition cursor-pointer"
              >
                <FileCode className="w-4 h-4 text-emerald-400" />
                <div className="text-left">
                  <strong className="block font-semibold">Download Full JSON Backup</strong>
                  <span className="text-[11px] text-slate-400">All months, accounts & incomes</span>
                </div>
              </button>

              <button
                onClick={handleDownloadCSV}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800 text-slate-200 transition cursor-pointer"
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
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition flex items-center gap-1 cursor-pointer"
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
                  className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 font-bold text-xs transition cursor-pointer"
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
                      className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-2.5 py-1 rounded-lg bg-rose-500 text-white font-bold text-[11px] cursor-pointer"
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
                    className="text-slate-400 hover:text-rose-400 transition text-[11px] underline cursor-pointer"
                  >
                    Reset all data to empty template
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CLOUDFLARE SYNC & HOSTING GUIDE */}
        {activeTab === 'cloudflare' && (
          <div className="mt-4 space-y-4 text-xs">
            {/* Banner */}
            <div className="p-3.5 rounded-xl bg-orange-950/20 border border-orange-500/30 flex items-start gap-2.5">
              <Globe className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-300">
                  Cloudflare Data Synchronization & Worker Storage
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                  Save and sync your FlowLedger budget state directly to Cloudflare KV or custom Cloudflare Worker endpoints so your data is retained across all devices and browser tabs!
                </p>
              </div>
            </div>

            {/* Cloudflare Sync Configuration Form */}
            <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={cfEnabled}
                    onChange={(e) => {
                      setCfEnabled(e.target.checked);
                      handleSaveCloudflareConfig();
                    }}
                    className="w-4 h-4 rounded text-orange-500 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer"
                  />
                  <span className="font-bold text-slate-200">Enable Cloudflare Sync</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {cfEnabled ? 'Active' : 'Disabled'}
                </span>
              </div>

              {/* Mode Selector */}
              <div>
                <label className="block font-medium text-slate-300 mb-1.5">
                  Cloudflare Integration Method:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCfMode('kv');
                      handleSaveCloudflareConfig();
                    }}
                    className={`p-2 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer ${
                      cfMode === 'kv'
                        ? 'bg-orange-500/15 border-orange-500/40 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Globe className="w-4 h-4 text-orange-400 shrink-0" />
                    <div>
                      <strong className="block text-[11px]">Cloudflare KV (REST API)</strong>
                      <span className="text-[9px] text-slate-400">Direct KV Storage</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCfMode('worker_endpoint');
                      handleSaveCloudflareConfig();
                    }}
                    className={`p-2 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer ${
                      cfMode === 'worker_endpoint'
                        ? 'bg-orange-500/15 border-orange-500/40 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Server className="w-4 h-4 text-orange-400 shrink-0" />
                    <div>
                      <strong className="block text-[11px]">Worker Endpoint</strong>
                      <span className="text-[9px] text-slate-400">Custom Worker Proxy</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Form Mode 1: Cloudflare KV REST API Direct */}
              {cfMode === 'kv' ? (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-300 mb-1">
                        Cloudflare Account ID *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 4a8b...99"
                        value={cfAccountId}
                        onChange={(e) => setCfAccountId(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-slate-300 mb-1">
                        KV Namespace ID *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 81f3...c2"
                        value={cfKvNamespaceId}
                        onChange={(e) => setCfKvNamespaceId(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">
                      Cloudflare API Token *
                    </label>
                    <div className="relative">
                      <input
                        type={showCfToken ? 'text' : 'password'}
                        placeholder="API Token with Workers KV Storage Read/Edit permissions"
                        value={cfApiToken}
                        onChange={(e) => setCfApiToken(e.target.value)}
                        className="w-full pl-3 pr-10 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-orange-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCfToken(!showCfToken)}
                        className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-200"
                      >
                        {showCfToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Form Mode 2: Worker Endpoint */
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">
                      Cloudflare Worker Endpoint URL *
                    </label>
                    <input
                      type="url"
                      placeholder="https://pwa-budgv2.86brancan.workers.dev/sync"
                      value={cfWorkerEndpoint}
                      onChange={(e) => setCfWorkerEndpoint(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">
                      Bearer / API Secret Token (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type={showCfToken ? 'text' : 'password'}
                        placeholder="Optional authentication header token"
                        value={cfApiToken}
                        onChange={(e) => setCfApiToken(e.target.value)}
                        className="w-full pl-3 pr-10 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-orange-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCfToken(!showCfToken)}
                        className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-200"
                      >
                        {showCfToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Shared Storage Key Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    Cloudflare Storage Key
                  </label>
                  <input
                    type="text"
                    placeholder="flowledger_budget_data"
                    value={cfSyncKey}
                    onChange={(e) => setCfSyncKey(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer select-none pb-1.5">
                    <input
                      type="checkbox"
                      checked={cfAutoSave}
                      onChange={(e) => {
                        setCfAutoSave(e.target.checked);
                        handleSaveCloudflareConfig();
                      }}
                      className="w-4 h-4 rounded text-orange-500 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-200">
                      Auto-Save to Cloudflare on update
                    </span>
                  </label>
                </div>
              </div>

              {/* Last synced timestamp */}
              {cloudflareConfig.lastSyncedAt && (
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Last synced: <strong>{new Date(cloudflareConfig.lastSyncedAt).toLocaleString()}</strong></span>
                  <span className="font-mono text-orange-400 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                    key: {cloudflareConfig.syncKey || 'flowledger_budget_data'}
                  </span>
                </div>
              )}
            </div>

            {/* Cloudflare Feedback Messages */}
            {saveCFSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{saveCFSuccess}</span>
              </div>
            )}
            {saveCFError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{saveCFError}</span>
                </div>
                {saveCFError.includes('405') && (
                  <button
                    type="button"
                    onClick={() => {
                      setCfMode('kv');
                      setSaveCFError(null);
                      handleSaveCloudflareConfig();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold text-[11px] transition cursor-pointer"
                  >
                    Switch to Cloudflare KV (REST API) Mode
                  </button>
                )}
              </div>
            )}
            {loadCFSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{loadCFSuccess}</span>
              </div>
            )}
            {loadCFError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{loadCFError}</span>
                </div>
                {loadCFError.includes('405') && (
                  <button
                    type="button"
                    onClick={() => {
                      setCfMode('kv');
                      setLoadCFError(null);
                      handleSaveCloudflareConfig();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold text-[11px] transition cursor-pointer"
                  >
                    Switch to Cloudflare KV (REST API) Mode
                  </button>
                )}
              </div>
            )}

            {/* Cloudflare Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleLoadFromCloudflareNow}
                disabled={isLoadingFromCF}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition border border-slate-700 disabled:opacity-40 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>{isLoadingFromCF ? 'Pulling...' : 'Pull from Cloudflare'}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveToCloudflareNow}
                disabled={isSavingToCF}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold transition shadow-sm active:scale-95 disabled:opacity-40 cursor-pointer"
              >
                {isSavingToCF ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>{isSavingToCF ? 'Syncing...' : 'Push & Save to Cloudflare'}</span>
              </button>
            </div>

            {/* Multi-Device 1-Click Sync Link Card */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-orange-400 text-xs flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Connect Another Device / Phone</span>
                </span>
                <span className="text-[10px] text-slate-400">1-Click Pair</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                To load your Cloudflare budget data onto your iPhone Duo, tablet, or another browser, copy this 1-click link and open it once on the other device:
              </p>

              <div className="flex flex-col sm:flex-row items-stretch gap-2 pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    const currentConfig = handleSaveCloudflareConfig();
                    const link = generateCloudflareSyncShareLink(currentConfig);
                    try {
                      await navigator.clipboard.writeText(link);
                      setCopiedCFLink(true);
                      setTimeout(() => setCopiedCFLink(false), 2500);
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="flex-1 px-3 py-2 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{copiedCFLink ? 'Sync Link Copied!' : 'Copy 1-Click Device Sync Link'}</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const currentConfig = handleSaveCloudflareConfig();
                    const token = generateCloudflareSyncToken(currentConfig);
                    try {
                      await navigator.clipboard.writeText(token);
                      setCopiedCFToken(true);
                      setTimeout(() => setCopiedCFToken(false), 2500);
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <span>{copiedCFToken ? 'Token Copied!' : 'Copy Sync Token'}</span>
                </button>
              </div>

              {/* Paste Sync Token Input */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                <label className="block text-[11px] font-medium text-slate-400">
                  Or paste Sync Code from another device:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="CFSYNC:ey..."
                    value={cfImportTokenStr}
                    onChange={(e) => setCfImportTokenStr(e.target.value)}
                    className="flex-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-[11px] focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!cfImportTokenStr.trim()) return;
                      const parsed = parseCloudflareSyncToken(cfImportTokenStr);
                      if (parsed) {
                        onUpdateCloudflareConfig(parsed);
                        setCfEnabled(parsed.enabled);
                        setCfMode(parsed.mode);
                        setCfAccountId(parsed.accountId);
                        setCfKvNamespaceId(parsed.kvNamespaceId);
                        setCfApiToken(parsed.apiToken);
                        setCfWorkerEndpoint(parsed.workerEndpoint);
                        setCfSyncKey(parsed.syncKey);
                        setCfAutoSave(parsed.autoSave);
                        setCfTokenImportMsg('Cloudflare Sync paired! Loading data...');
                        handleLoadFromCloudflareNow();
                        setTimeout(() => setCfTokenImportMsg(null), 3500);
                      } else {
                        setCfTokenImportMsg('Invalid Sync Token code.');
                      }
                    }}
                    className="px-3 py-1 rounded-lg bg-orange-500 text-slate-950 font-bold text-xs hover:bg-orange-400 transition cursor-pointer"
                  >
                    Connect
                  </button>
                </div>
                {cfTokenImportMsg && (
                  <p className="text-[11px] text-orange-400 font-medium pt-0.5">{cfTokenImportMsg}</p>
                )}
              </div>
            </div>

            {/* Deployment & Wrangler Guide */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800">
                <span className="font-bold text-orange-400 block mb-1">
                  Deploying to Cloudflare Workers / Pages
                </span>
                <p className="text-slate-300 text-[11px] leading-relaxed mb-2">
                  FlowLedger is fully pre-configured for static single-page deployments on Cloudflare Workers & Pages.
                </p>
                <code className="block p-2 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 font-mono text-[11px]">
                  npx wrangler deploy
                </code>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                <span className="font-semibold text-slate-200 block mb-1">
                  Single Page App Routing
                </span>
                <p className="text-slate-400 text-[11px]">
                  Our <code className="text-slate-200">wrangler.jsonc</code> includes <code className="text-emerald-400 font-mono">not_found_handling: "single-page-application"</code> to route all URLs directly to <code className="text-slate-200">index.html</code>.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

