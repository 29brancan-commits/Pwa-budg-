import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { generateAppTransferUrl, loadBudgetState } from '../utils/storage';
import { Download, Share2, PlusSquare, X, CheckCircle2, Copy, Check, ArrowRight } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installedNotice, setInstalledNotice] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyTransferLink = async () => {
    try {
      const currentState = loadBudgetState();
      const transferUrl = generateAppTransferUrl(currentState);
      await navigator.clipboard.writeText(transferUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome) {
        setInstalledNotice(true);
        setTimeout(() => setInstalledNotice(false), 4000);
      }
    } else {
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        title="Install FlowLedger PWA & Transfer Data"
        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold tracking-wide transition-all duration-200 active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Install App</span>
      </button>

      {installedNotice && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl text-xs backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>App installed successfully! Your data was bridged via shared storage.</span>
        </div>
      )}

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-200 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white tracking-tight">
                {isIOS ? 'Install on iPhone / iPad' : 'Install Home Screen App'}
              </h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <Share2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-semibold">1. Open Browser Share Menu</strong>
                  Tap the Safari <strong>Share</strong> button at the bottom of the screen (or Chrome menu ⋮ on Android).
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <PlusSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-semibold">2. Add to Home Screen</strong>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Transfer Browser Data to Installed App</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-normal">
                  Your data automatically syncs via cookies and shared storage. You can also copy a direct transfer link below:
                </p>
                <button
                  onClick={handleCopyTransferLink}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-[11px] transition active:scale-95 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Transfer Link Copied!' : 'Copy Direct Web-to-App Data Link'}</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-4 w-full rounded-xl bg-slate-800 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition active:scale-95 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};

