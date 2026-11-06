import React, { useState } from 'react';
import { BankAccount } from '../types/expense';
import { X, Plus, Trash2, Building2, Check, AlertCircle } from 'lucide-react';

interface ManageAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: BankAccount[];
  onAddAccount: (name: string, startingBalance: number, color: string) => void;
  onDeleteAccount: (accountId: string) => void;
  onUpdateAccount: (accountId: string, name: string, balance: number, color: string) => void;
  currency?: string;
}

const PALETTE = [
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#8b5cf6', // Violet/Purple
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#f97316', // Orange
  '#64748b', // Slate
];

export const ManageAccountsModal: React.FC<ManageAccountsModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onAddAccount,
  onDeleteAccount,
  onUpdateAccount,
  currency = '$',
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [newColor, setNewColor] = useState(PALETTE[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editBalance, setEditBalance] = useState('');
  const [editColor, setEditColor] = useState(PALETTE[0]);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const balance = parseFloat(newBalance) || 0;
    onAddAccount(newName.trim(), balance, newColor);
    setNewName('');
    setNewBalance('');
    setIsAdding(false);
    setErrorMessage(null);
  };

  const handleStartEdit = (acc: BankAccount) => {
    setEditingId(acc.id);
    setEditName(acc.name);
    setEditBalance(acc.currentBalance.toString());
    setEditColor(acc.color);
    setPendingDeleteId(null);
    setErrorMessage(null);
  };

  const handleSaveEdit = (accId: string) => {
    if (!editName.trim()) return;
    const balance = parseFloat(editBalance) || 0;
    onUpdateAccount(accId, editName.trim(), balance, editColor);
    setEditingId(null);
  };

  const handleRequestDelete = (accId: string) => {
    if (accounts.length <= 1) {
      setErrorMessage('You must have at least one bank account to track expenses.');
      return;
    }
    setPendingDeleteId(accId);
    setErrorMessage(null);
  };

  const handleConfirmDelete = (accId: string) => {
    onDeleteAccount(accId);
    setPendingDeleteId(null);
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-100 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Manage Bank Accounts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-2">
          Add, rename, or delete bank accounts (e.g. ENT, USAA, PenFed, Navy Federal). Each obligation and paycheck can be assigned to an account.
        </p>

        {/* Inline Error Warning */}
        {errorMessage && (
          <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs text-amber-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Existing Accounts List */}
        <div className="space-y-2.5 my-4">
          {accounts.map((acc) => {
            const isEditing = editingId === acc.id;
            const isPendingDelete = pendingDeleteId === acc.id;

            return (
              <div
                key={acc.id}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs transition"
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Account Name"
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-semibold text-xs focus:outline-none focus:border-emerald-500"
                      />
                      <div className="w-32 relative">
                        <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs">{currency}</span>
                        <input
                          type="number"
                          step="0.01"
                          value={editBalance}
                          onChange={(e) => setEditBalance(e.target.value)}
                          placeholder="Balance"
                          className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400">Color:</span>
                        {PALETTE.map((col) => (
                          <button
                            key={col}
                            type="button"
                            onClick={() => setEditColor(col)}
                            className={`w-4 h-4 rounded-full transition ${
                              editColor === col ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: col }}
                          />
                        ))}
                      </div>

                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-[11px]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(acc.id)}
                          className="px-3 py-1 rounded bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 text-[11px]"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                ) : isPendingDelete ? (
                  /* Inline Delete Confirmation */
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/40">
                    <div>
                      <span className="font-bold text-rose-300 block">Delete {acc.name}?</span>
                      <span className="text-[10px] text-rose-300/80">
                        Assigned bills will be transferred to your remaining account.
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(null)}
                        className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmDelete(acc.id)}
                        className="px-3 py-1 rounded bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-sm flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: acc.color }}
                      />
                      <div>
                        <span className="font-bold text-slate-100 text-sm block">{acc.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Current Balance: <strong className="text-white">{currency}{acc.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleStartEdit(acc)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRequestDelete(acc.id)}
                        title="Delete Bank Account"
                        className="px-2.5 py-1 rounded-lg text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-semibold flex items-center gap-1 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add New Account Form / Trigger */}
        {isAdding ? (
          <form onSubmit={handleCreate} className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/40 space-y-3 text-xs mb-4">
            <h4 className="font-bold text-white text-xs">Add New Bank Account</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Account Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Navy Federal, Chase, High-Yield"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Starting Balance ({currency})</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-[11px] mb-1.5">Account Color</label>
              <div className="flex items-center gap-2">
                {PALETTE.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setNewColor(col)}
                    className={`w-5 h-5 rounded-full transition ${
                      newColor === col ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold transition shadow"
              >
                Add Account
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => {
              setIsAdding(true);
              setErrorMessage(null);
            }}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-900/40 text-emerald-400 hover:text-emerald-300 text-xs font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Bank Account</span>
          </button>
        )}

        <div className="flex items-center justify-end pt-4 mt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
