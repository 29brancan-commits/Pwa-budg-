import React, { useState } from 'react';
import { BudgetState, BudgetMonth } from '../types/expense';
import { exportToJSON, importFromJSON, exportToCSV, resetToDefault } from '../utils/storage';
import { X, Download, Upload, RefreshCw, Globe, Check, FileSpreadsheet, FileCode } from 'lucide-react';

interface DataExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: BudgetState;
  onUpdateState: (newState: BudgetState) => void;
  currentMonth: BudgetMonth;
}

export const DataExportImportModal: React.FC<DataExportImportModalProps> = ({
  isOpen,
  onClose,
  state,
  onUpdateState,
  currentMonth,
}) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'cloudflare'>('backup');
  const [copiedJSON, setCopiedJSON] = useState(false);
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

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
            <h2 className="text-base font-bold text-white tracking-tight">
              Data Management & Cloudflare Hosting
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 mt-4 p-1 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('backup')}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition ${
              activeTab === 'backup'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Backup & Export
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
            <span>Cloudflare Hosting Guide</span>
          </button>
        </div>

        {activeTab === 'backup' ? (
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
                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/40 text-xs">
                  <span className="text-rose-300 font-semibold text-[11px]">Confirm reset?</span>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-2 py-0.5 rounded bg-rose-500 text-white font-bold text-[11px] hover:bg-rose-600"
                  >
                    Yes, Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 text-xs transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset to Original Spreadsheet Template</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-medium text-xs"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Cloudflare Hosting Guide Tab */
          <div className="mt-4 space-y-3.5 text-xs text-slate-300 leading-relaxed">
            <div className="p-3 rounded-xl bg-orange-950/20 border border-orange-500/30">
              <h4 className="font-bold text-orange-300 mb-1 flex items-center gap-1.5">
                <Globe className="w-4 h-4" />
                <span>Ready for Cloudflare Pages</span>
              </h4>
              <p className="text-[11px] text-slate-300">
                This PWA is an offline-capable single-page application built with Vite. It compiles to static files in <code className="bg-slate-800 px-1 py-0.5 rounded text-orange-200 font-mono">dist/</code> and includes <code className="bg-slate-800 px-1 py-0.5 rounded text-orange-200 font-mono">_redirects</code> for seamless SPA routing.
              </p>
            </div>

            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <strong className="block text-white font-semibold mb-0.5">
                  Method 1: Connect via Git (Recommended)
                </strong>
                <ol className="list-decimal list-inside space-y-1 text-slate-400">
                  <li>Push your repository to GitHub or GitLab.</li>
                  <li>In Cloudflare Dashboard, go to <strong>Workers & Pages</strong> &gt; <strong>Create application</strong> &gt; <strong>Pages</strong>.</li>
                  <li>Select <strong>Connect to Git</strong> and select your repo.</li>
                  <li>Set <strong>Framework preset</strong> to <strong className="text-slate-200">Vite</strong>.</li>
                  <li>Build command: <code className="text-emerald-300 font-mono">npm run build</code></li>
                  <li>Build output directory: <code className="text-emerald-300 font-mono">dist</code></li>
                  <li>Click <strong>Save and Deploy</strong>. Cloudflare will automatically build and serve with SSL and Edge caching!</li>
                </ol>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <strong className="block text-white font-semibold mb-0.5">
                  Method 2: Direct Upload (or Wrangler CLI)
                </strong>
                <p className="text-slate-400 mb-1.5">
                  Run locally or in CI:
                </p>
                <div className="p-2 rounded bg-slate-950 font-mono text-[11px] text-emerald-400 border border-slate-800 select-all">
                  npx wrangler pages deploy dist --project-name=flowledger-pwa
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-800">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-medium"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
