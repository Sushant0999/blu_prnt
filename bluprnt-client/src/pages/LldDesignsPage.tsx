import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, ArrowRight, Trash2, Clock, CheckCircle2, FileCode } from 'lucide-react';
import { db } from '../db/database';
import { diagramToMermaid } from '../core/lld/diagramSerialization';
import type { LldDesignRecord } from '../core/types/lld';

export const LldDesignsPage: React.FC = () => {
  const [designs, setDesigns] = useState<LldDesignRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDesigns = async () => {
    try {
      const records = await db.lldDesigns.reverse().sortBy('updatedAt');
      setDesigns(records);
    } catch (e) {
      console.error('Failed to load designs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDesigns();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this saved design?')) return;
    await db.lldDesigns.delete(id);
    await loadDesigns();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
            Workspaces & Submissions
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            My Saved LLD Designs
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Browse and resume all your class diagrams and problem submissions.
          </p>
        </div>

        <Link
          to="/lld"
          className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        >
          ← Back to LLD Home
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-16 text-sm text-slate-500">Loading your designs...</div>
      ) : designs.length === 0 ? (
        <div className="text-center py-16 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30">
          <FolderKanban className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No saved designs yet
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
            Start solving problems in the LLD Problem Bank; your class diagrams autosave here automatically.
          </p>
          <Link
            to="/lld/problems"
            className="px-4 py-2 rounded-xl bg-cyan-600 text-white font-bold text-xs hover:bg-cyan-500 transition"
          >
            Go to Problem Bank
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {designs.map((d) => {
            const nodeCount = Object.keys(d.diagram?.nodes || {}).length;
            const edgeCount = Object.keys(d.diagram?.edges || {}).length;
            const link = d.problemId ? `/lld/problems/${d.problemId}` : '#';

            return (
              <Link
                key={d.id}
                to={link}
                className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 hover:shadow-lg transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        d.status === 'submitted'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {d.status}
                    </span>

                    <button
                      onClick={(e) => handleDelete(d.id, e)}
                      className="p-1 rounded text-slate-400 hover:text-rose-500 transition"
                      title="Delete design"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    {d.title}
                  </h3>
                  <div className="text-xs text-slate-500 mt-1">
                    {nodeCount} classes • {edgeCount} relationships
                  </div>
                  {d.notes && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2 italic">
                      "{d.notes}"
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">
                    Updated {new Date(d.updatedAt).toLocaleDateString()}
                  </span>
                  <div className="font-semibold text-cyan-600 dark:text-cyan-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Open Editor</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
