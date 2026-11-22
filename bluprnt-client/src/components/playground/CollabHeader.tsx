import React, { useState } from 'react';
import {
  Share2,
  MessageSquare,
  History,
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
      {/* Current User Badge & Name Editor with Status Indicator Dot */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs shrink-0">
        <div className="relative shrink-0">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
            style={{ backgroundColor: userColor }}
            title={`You: ${userName} (${role})`}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-slate-900 ${
              status === 'connected'
                ? 'bg-emerald-500'
                : status === 'connecting'
                ? 'bg-amber-500 animate-pulse'
                : 'bg-slate-400'
            }`}
            title={`Status: ${status} • Role: ${role}`}
          />
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
            className="w-16 sm:w-20 px-1 py-0.2 bg-white dark:bg-slate-950 border border-cyan-500 rounded text-[11px] font-semibold text-slate-900 dark:text-white focus:outline-none"
            placeholder="Your name"
          />
        ) : (
          <button
            onClick={() => {
              setTempName(userName);
              setIsEditingName(true);
            }}
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:text-cyan-600 dark:hover:text-cyan-300 transition"
            title="Click to edit display name"
          >
            <span className="max-w-[55px] sm:max-w-[75px] truncate">{userName}</span>
            <Edit2 className="w-2.5 h-2.5 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300" />
          </button>
        )}
      </div>

      {/* Peer Avatars Stack */}
      <div className="flex items-center -space-x-1.5 overflow-hidden pl-0.5 shrink-0">
        {peers.slice(0, 3).map((p) => (
          <div
            key={p.clientId}
            title={`${p.user.name} (${p.user.role})`}
            className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0"
            style={{ backgroundColor: p.user.color }}
          >
            {p.user.name.charAt(0).toUpperCase()}
          </div>
        ))}
        {peers.length > 3 && (
          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[9px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
            +{peers.length - 3}
          </div>
        )}
      </div>

      {/* Chat & Comments Toggle */}
      <button
        onClick={onToggleChat}
        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 relative shrink-0 transition"
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
        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0 transition"
        title="Version Snapshots"
      >
        <History className="w-4 h-4" />
      </button>

      {/* Share / Invite Button */}
      <button
        onClick={onOpenShare}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all shrink-0 hover:scale-105 active:scale-95"
      >
        <Share2 className="w-3.5 h-3.5" />
        <span>Share</span>
      </button>
    </div>
  );
};
