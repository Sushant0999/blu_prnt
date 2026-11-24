import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Layers, ArrowRight, CheckCircle2, Search } from 'lucide-react';
import { ContentRepository } from '../repository/ContentRepository';
import { db } from '../db/database';
import type { LldPattern } from '../core/types/lld';

export const LldPatternsPage: React.FC = () => {
  const [patterns, setPatterns] = useState<LldPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const list = await ContentRepository.getLldPatterns();
        setPatterns(list);
      } catch (err) {
        console.error('Failed to load patterns:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const categories = [
    { key: 'creational', label: 'Creational Patterns', desc: 'Object creation mechanisms, increasing flexibility and reuse of existing code.' },
    { key: 'structural', label: 'Structural Patterns', desc: 'How classes and objects are assembled into larger structures.' },
    { key: 'behavioral', label: 'Behavioral Patterns', desc: 'Algorithms and assignment of responsibilities between objects.' },
  ];

  const filtered = patterns.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.intent.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
            Object-Oriented Design
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            Design Patterns Library
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Explore battle-tested design patterns with interactive architectural diagrams, Java code examples, live demos, and practice quizzes.
          </p>
        </div>

        <Link
          to="/lld"
          className="self-start md:self-auto text-xs font-semibold px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        >
          ← Back to LLD Home
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patterns or intents..."
          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 shadow-sm"
        />
      </div>

      {/* Grouped by Category */}
      {loading ? (
        <div className="text-center py-16 text-sm text-slate-500">Loading patterns...</div>
      ) : (
        <div className="space-y-10">
          {categories.map((cat) => {
            const catPatterns = filtered.filter((p) => p.category === cat.key);
            if (catPatterns.length === 0) return null;

            return (
              <div key={cat.key} className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {cat.label}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">{cat.desc}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {catPatterns.map((pat) => (
                    <Link
                      key={pat.id}
                      to={`/lld/patterns/${pat.id}`}
                      className="group flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 hover:shadow-lg dark:hover:shadow-cyan-950/20 transition-all duration-200"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60">
                            {pat.category}
                          </span>
                          {pat.demoId && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              Interactive Demo
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                          {pat.name}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                          {pat.intent}
                        </p>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          {pat.quiz.length} Quiz Questions • {pat.flashcards.length} Cards
                        </span>
                        <div className="text-cyan-600 dark:text-cyan-400 font-semibold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          <span>Study</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
