import React, { useState } from 'react';
import { X, Send, MessageSquare, CheckCircle2, MessageCircle, Tag } from 'lucide-react';
import { ChatMessage, NodeComment } from '../../core/collab/useCollabSession';

interface RoomChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  chatMessages: ChatMessage[];
  comments: NodeComment[];
  onSendMessage: (text: string) => void;
  onResolveComment: (commentId: string) => void;
  onAddComment: (nodeId: string, text: string) => void;
  activeNodeId?: string | null;
}

export const RoomChatDrawer: React.FC<RoomChatDrawerProps> = ({
  isOpen,
  onClose,
  chatMessages,
  comments,
  onSendMessage,
  onResolveComment,
  onAddComment,
  activeNodeId,
}) => {
  const [tab, setTab] = useState<'chat' | 'comments'>('chat');
  const [chatInput, setChatInput] = useState('');
  const [commentInput, setCommentInput] = useState('');

  if (!isOpen) return null;

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput);
    setChatInput('');
  };

  const handleCreateComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    onAddComment(activeNodeId || 'general', commentInput);
    setCommentInput('');
  };

  return (
    <div className="fixed top-14 right-0 bottom-0 w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-40">
      {/* Header with Tabs */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex gap-1">
          <button
            onClick={() => setTab('chat')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              tab === 'chat'
                ? 'bg-brand-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Live Chat ({chatMessages.length})
          </button>
          <button
            onClick={() => setTab('comments')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              tab === 'comments'
                ? 'bg-brand-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Comments ({comments.filter((c) => !c.resolved).length})
          </button>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tab === 'chat' ? (
          chatMessages.length === 0 ? (
            <div className="text-center text-xs text-slate-400 italic py-8">
              No messages yet. Say hello to your collaborators!
            </div>
          ) : (
            chatMessages.map((msg) => (
              <div key={msg.id} className="space-y-0.5 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[11px]" style={{ color: msg.color }}>
                    {msg.author}
                  </span>
                  <span className="text-[9px] text-slate-400">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  {msg.text}
                </div>
              </div>
            ))
          )
        ) : (
          /* Comments Tab */
          <div className="space-y-3">
            {comments.length === 0 ? (
              <div className="text-center text-xs text-slate-400 italic py-8">
                No comments anchored to nodes.
              </div>
            ) : (
              comments.map((comm) => (
                <div
                  key={comm.id}
                  className={`p-3 rounded-xl border text-xs space-y-2 ${
                    comm.resolved
                      ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 opacity-60'
                      : 'border-brand-300 dark:border-brand-800 bg-white dark:bg-slate-900 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{comm.author}</span>
                    <span className="text-[10px] text-slate-400 font-mono">#{comm.nodeId}</span>
                  </div>

                  <p className="text-slate-600 dark:text-slate-300">{comm.text}</p>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => onResolveComment(comm.id)}
                      className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                        comm.resolved
                          ? 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                          : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {comm.resolved ? 'Resolved' : 'Resolve'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        {tab === 'chat' ? (
          <form onSubmit={handleSendChat} className="flex gap-2">
            <input
              type="text"
              placeholder="Type message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              type="submit"
              className="p-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleCreateComment} className="space-y-2">
            <div className="text-[10px] text-slate-400">
              Anchored to: <strong className="font-mono">{activeNodeId || 'Canvas general'}</strong>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add node comment..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                className="flex-1 text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold"
              >
                Post
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
