import React, { useState } from 'react';
import { X, History, Save, RotateCcw, Clock, Sparkles } from 'lucide-react';

export interface RoomVersionSnapshot {
  id: string;
  name: string;
  author: string;
  timestamp: number;
}

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: RoomVersionSnapshot[];
  onSaveSnapshot: (name: string) => void;
  onRestoreSnapshot: (snapshotId: string) => void;
  isOwner: boolean;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  snapshots,
  onSaveSnapshot,
  onRestoreSnapshot,
  isOwner,
}) => {
  const [snapshotName, setSnapshotName] = useState('');

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!snapshotName.trim()) return;
    onSaveSnapshot(snapshotName.trim());
    setSnapshotName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                Design Version History
              </h3>
              <p className="text-xs text-slate-500">
                Point-in-time CRDT snapshots with one-click restore.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Save Version Input */}
        <form onSubmit={handleSave} className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. Pre-Black-Friday Cluster Topology"
            value={snapshotName}
            onChange={(e) => setSnapshotName(e.target.value)}
            className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-all shrink-0"
          >
            <Save className="w-3.5 h-3.5" /> Save Snapshot
          </button>
        </form>

        {/* Snapshots List */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {snapshots.length === 0 ? (
            <div className="text-center text-xs text-slate-400 italic py-6">
              No version snapshots saved yet. Save a snapshot above.
            </div>
          ) : (
            snapshots.map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs"
              >
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">{s.name}</h4>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {new Date(s.timestamp).toLocaleString()} • by {s.author}
                  </span>
                </div>

                {isOwner && (
                  <button
                    onClick={() => {
                      if (confirm(`Restore version "${s.name}"? Current canvas will be replaced.`)) {
                        onRestoreSnapshot(s.id);
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold"
                  >
                    <RotateCcw className="w-3 h-3" /> Restore
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
