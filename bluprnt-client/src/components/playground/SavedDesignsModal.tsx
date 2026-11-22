import React, { useState, useEffect } from 'react';
import { db } from '../../db/database';
import { SavedTopologyDesign } from '../../types/storage';
import { FolderOpen, Trash2, Edit2, Check, X, Clock, Layers } from 'lucide-react';

interface SavedDesignsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadDesign: (design: SavedTopologyDesign) => void;
}

export const SavedDesignsModal: React.FC<SavedDesignsModalProps> = ({
  isOpen,
  onClose,
  onLoadDesign,
}) => {
  const [designs, setDesigns] = useState<SavedTopologyDesign[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const loadAllDesigns = async () => {
    try {
      const all = await db.designs.orderBy('updatedAt').reverse().toArray();
      setDesigns(all);
    } catch (e) {
      console.error('Failed to load designs from Dexie', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAllDesigns();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this saved design?')) {
      await db.designs.delete(id);
      loadAllDesigns();
    }
  };

  const handleStartRename = (design: SavedTopologyDesign, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(design.id);
    setEditingName(design.name);
  };

  const handleSaveRename = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingName.trim()) {
      await db.designs.update(id, { name: editingName.trim(), updatedAt: Date.now() });
      setEditingId(null);
      loadAllDesigns();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-800/80 text-cyan-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Saved Architecture Designs</h3>
              <p className="text-xs text-slate-400">Locally saved to browser IndexedDB (Dexie)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Designs List */}
        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
          {designs.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No saved designs yet. Click "Save Design" in the playground toolbar to store your current layout.
            </div>
          ) : (
            designs.map((d) => (
              <div
                key={d.id}
                onClick={() => {
                  onLoadDesign(d);
                  onClose();
                }}
                className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/60 hover:border-cyan-500/50 cursor-pointer transition flex items-center justify-between group"
              >
                <div className="min-w-0 pr-3">
                  {editingId === d.id ? (
                    <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="px-2 py-1 text-xs bg-slate-900 border border-cyan-500 rounded text-white focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={(e) => handleSaveRename(d.id, e)}
                        className="p-1 rounded bg-cyan-600 text-white hover:bg-cyan-500"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(null);
                        }}
                        className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                      {d.name}
                    </h4>
                  )}
                  <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-1 font-mono">
                    <span className="flex items-center space-x-1">
                      <Layers className="w-3 h-3 text-cyan-400" />
                      <span>{d.nodes?.length || 0} nodes</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{new Date(d.updatedAt).toLocaleDateString()}</span>
                    </span>
                    <span>•</span>
                    <span>{(d.targetRps || 30000).toLocaleString()} RPS</span>
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={(e) => handleStartRename(d, e)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition"
                    title="Rename Design"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(d.id, e)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                    title="Delete Design"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
