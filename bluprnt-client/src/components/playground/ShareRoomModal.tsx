import React, { useState } from 'react';
import { X, Copy, Check, RefreshCw, UserMinus, Shield, ShieldCheck, Eye } from 'lucide-react';
import { CollabRole } from '../../core/collab/useCollabSession';

interface ShareRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  inviteToken: string;
  userRole: CollabRole;
  members: Record<string, { userId: string; name: string; role: CollabRole }>;
  onUpdateRole: (userId: string, newRole: CollabRole) => void;
  onRegenerateToken: () => void;
  serializedSnapshot?: string;
}

export const ShareRoomModal: React.FC<ShareRoomModalProps> = ({
  isOpen,
  onClose,
  roomId,
  inviteToken,
  userRole,
  members,
  onUpdateRole,
  onRegenerateToken,
  serializedSnapshot,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const snapshotHash = serializedSnapshot ? `#d=${serializedSnapshot}` : (typeof window !== 'undefined' && window.location.hash ? window.location.hash : '');
  const inviteUrl = `${window.location.origin}/playground?room=${roomId}&token=${inviteToken}${snapshotHash}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isOwner = userRole === 'owner';
  const isVercel = typeof window !== 'undefined' && window.location.hostname.endsWith('vercel.app');
  const hasExternalWs = !!(import.meta as any).env?.VITE_COLLAB_WS_URL;
  const isOfflineMode = roomId.endsWith('-local') || roomId.endsWith('-studio') || (isVercel && !hasExternalWs);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
              Share System Architecture
            </h3>
            <p className="text-xs text-slate-500">
              Share and export your system design topology.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Studio Room Advisory */}
        {isOfflineMode && (
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-[11px] text-cyan-800 dark:text-cyan-300 space-y-1">
            <span className="font-bold flex items-center gap-1.5">
              <span>💡</span> Studio Room
            </span>
            <p className="opacity-90 leading-relaxed">
              Your canvas and designs are auto-saved in your browser's IndexedDB. To share complete architectures across devices, you can also use the <strong>Download (Export JSON)</strong> and <strong>Upload (Import JSON)</strong> tools on the top navigation bar.
            </p>
          </div>
        )}

        {/* Invite Link Row */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Invite Link</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-700 dark:text-slate-300"
            />
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Link'}
            </button>
          </div>
          {isOwner && (
            <button
              onClick={onRegenerateToken}
              className="text-[11px] text-slate-500 hover:text-brand-600 flex items-center gap-1 font-semibold pt-1"
            >
              <RefreshCw className="w-3 h-3" /> Revoke and generate new link
            </button>
          )}
        </div>

        {/* Participants & Permissions Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>Participants ({Object.keys(members).length})</span>
            <span className="text-[10px] text-slate-400">Owner controls permissions</span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {Object.values(members).map((m) => {
              return (
                <div
                  key={m.userId}
                  className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{m.name}</span>
                    <span className="block text-[10px] text-slate-400 truncate max-w-[200px]">
                      {m.userId}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isOwner && m.role !== 'owner' ? (
                      <select
                        value={m.role}
                        onChange={(e) => onUpdateRole(m.userId, e.target.value as CollabRole)}
                        className="text-[11px] px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                      >
                        <option value="editor">Editor (Can edit)</option>
                        <option value="viewer">Viewer (Read-only)</option>
                      </select>
                    ) : (
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {m.role}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
          <strong>Viewer Role Security:</strong> Viewers are strictly restricted on the server via cryptographic
          CRDT validation. Any write updates from viewers are rejected.
        </div>
      </div>
    </div>
  );
};
