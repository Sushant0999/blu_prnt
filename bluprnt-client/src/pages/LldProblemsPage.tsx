import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  BookOpen,
  HelpCircle,
  Filter,
} from 'lucide-react';
import { ContentRepository } from '../repository/ContentRepository';
import { db } from '../db/database';
import type { LldProblem, Difficulty } from '../core/types/lld';

export const LldProblemsPage: React.FC = () => {
  const [problems, setProblems] = useState<LldProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [progressMap, setProgressMap] = useState<Record<string, 'not-started' | 'in-progress' | 'completed'>>({});
  const [search, setSearch] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    async function loadData() {
      try {
        const probs = await ContentRepository.getLldProblems();
        setProblems(probs);

        const progressRecords = await db.lldProgress.toArray();
        const map: Record<string, 'not-started' | 'in-progress' | 'completed'> = {};
        for (const r of progressRecords) {
          map[r.problemId] = r.status;
        }
        setProgressMap(map);
      } catch (err) {
        console.error('Failed to load LLD problems:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const allTags = Array.from(new Set(problems.flatMap((p) => p.tags || []))).sort();

  const filtered = problems.filter((p) => {
    if (selectedDifficulty !== 'all' && p.difficulty !== selectedDifficulty) return false;
    if (selectedTag !== 'all' && !p.tags.includes(selectedTag)) return false;
    const status = progressMap[p.id] || 'not-started';
    if (selectedStatus !== 'all' && status !== selectedStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getDifficultyBadge = (diff: Difficulty) => {
    switch (diff) {
      case 'easy':
        return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60';
      case 'medium':
        return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60';
      case 'hard':
        return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
              Low-Level Design Studio
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            LLD Problem Bank
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Classic object-oriented design interview challenges. Model entity relationships, enforce design patterns, review checklist coverage, and inspect reference solutions.
          </p>
        </div>

        <Link
          to="/lld"
          className="self-start md:self-auto text-xs font-semibold px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        >
          ← Back to LLD Home
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search problems, patterns, tags..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {/* Difficulty filter */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 font-medium"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          {/* Tag filter */}
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 font-medium"
          >
            <option value="all">All Tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 font-medium"
          >
            <option value="all">All Status</option>
            <option value="not-started">Not Started</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Problems Grid */}
      {loading ? (
        <div className="text-center py-16 text-sm text-slate-500">Loading problems...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
          <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">No problems match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((prob) => {
            const status = progressMap[prob.id] || 'not-started';

            return (
              <Link
                key={prob.id}
                to={`/lld/problems/${prob.id}`}
                className="group flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 hover:shadow-lg dark:hover:shadow-cyan-950/20 transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${getDifficultyBadge(
                        prob.difficulty
                      )}`}
                    >
                      {prob.difficulty}
                    </span>

                    {status === 'completed' && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Done
                      </span>
                    )}
                    {status === 'in-progress' && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
                        <Clock className="w-3.5 h-3.5" /> Working
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    {prob.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                    {prob.summary}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {prob.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="text-cyan-600 dark:text-cyan-400 font-semibold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Solve</span>
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
