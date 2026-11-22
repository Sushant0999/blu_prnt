import React, { useState } from 'react';
import {
  Users,
  Share2,
  MessageSquare,
  History,
  Undo2,
  Redo2,
  Shield,
  Wifi,
  WifiOff,
  Radio,
  Edit2,
} from 'lucide-react';
import { PeerPresence, CollabRole } from '../../core/collab/useCollabSession';

interface CollabHeaderProps {
  roomId: string;
  status: 'connected' | 'connecting' | 'offline';
  role: CollabRole;
  peers: PeerPresence[];
  commentCount: number;
  userName?: string;
  userColor?: string;
  onUpdateUserName?: (name: string) => void;
  onOpenShare: () => void;
  onToggleChat: () => void;
  onOpenHistory: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

export const CollabHeader: React.FC<CollabHeaderProps> = ({
  roomId,
  status,
  role,
  peers,
  commentCount,
  userName = 'Architect',
  userColor = '#3b82f6',
  onUpdateUserName,
  onOpenShare,
  onToggleChat,
  onOpenHistory,
  onUndo,
  onRedo,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userName);

  const handleSaveName = () => {
    if (tempName.trim() && onUpdateUserName) {
      onUpdateUserName(tempName.trim());
    }
    setIsEditingName(false);
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
      {/* Current User Badge & Name Editor */}
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs shrink-0">
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0"
          style={{ backgroundColor: userColor }}
          title={`You: ${userName}`}
        >
          {userName.charAt(0).toUpperCase()}
        </div>
        {isEditingName ? (
          <input
            type="text"
            value={tempName}
            autoFocus
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveName();
              if (e.key === 'Escape') setIsEditingName(false);
            }}
            className="w-20 sm:w-24 px-1 py-0.2 bg-slate-950 border border-cyan-500 rounded text-[11px] font-semibold text-white focus:outline-none"
            placeholder="Your name"
          />
        ) : (
          <button
            onClick={() => {
              setTempName(userName);
              setIsEditingName(true);
            }}
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-200 hover:text-cyan-300 transition"
            title="Click to edit your display name"
          >
            <span className="max-w-[70px] sm:max-w-[90px] truncate">{userName}</span>
            <Edit2 className="w-2.5 h-2.5 text-slate-400 hover:text-cyan-300" />
          </button>
        )}
      </div>

      {/* Status Pill */}
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border shrink-0 ${
          status === 'connected'
            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
            : status === 'connecting'
            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 animate-pulse'
            : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 shadow-sm'
        }`}
        title={status === 'connected' ? 'Connected to live room' : status === 'connecting' ? 'Connecting to live collaboration session...' : 'Offline mode'}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            status === 'connected'
              ? 'bg-emerald-500 animate-ping'
              : status === 'connecting'
              ? 'bg-amber-500'
              : 'bg-slate-400'
          }`}
        />
        <span>{status}</span>
      </div>

      {/* Role Badge */}
      <span
        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md shrink-0 ${
          role === 'owner'
            ? 'bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300'
            : role === 'editor'
            ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
        }`}
      >
        {role}
      </span>

      {/* Peer Avatars Stack */}
      <div className="flex items-center -space-x-1.5 overflow-hidden pl-1 shrink-0">
        {peers.slice(0, 4).map((p) => (
          <div
            key={p.clientId}
            title={`${p.user.name} (${p.user.role})`}
            className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0"
            style={{ backgroundColor: p.user.color }}
          >
            {p.user.name.charAt(0).toUpperCase()}
          </div>
        ))}
        {peers.length > 4 && (
          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[9px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
            +{peers.length - 4}
          </div>
        )}
      </div>

      {/* Scoped Undo / Redo */}
      <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 shrink-0">
        <button
          onClick={onUndo}
          disabled={role === 'viewer'}
          className="p-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-30 rounded"
          title="Undo my changes"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onRedo}
          disabled={role === 'viewer'}
          className="p-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-30 rounded"
          title="Redo my changes"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Chat & Comments Toggle */}
      <button
        onClick={onToggleChat}
        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 relative shrink-0"
        title="Open Room Chat & Comments"
      >
        <MessageSquare className="w-4 h-4" />
        {commentCount > 0 && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-brand-600 text-white text-[8px] font-bold flex items-center justify-center">
            {commentCount}
          </span>
        )}
      </button>

      {/* Version History */}
      <button
        onClick={onOpenHistory}
        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0"
        title="Version Snapshots"
      >
        <History className="w-4 h-4" />
      </button>

      {/* Share / Invite */}
      <button
        onClick={onOpenShare}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-sm transition-all shrink-0"
      >
        <Share2 className="w-3.5 h-3.5" />
        Share
      </button>
    </div>
  );
};
