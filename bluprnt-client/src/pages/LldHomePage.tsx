import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  BookOpen,
  FolderKanban,
  CheckCircle2,
  Clock,
  ArrowRight,
  Flame,
  Sparkles,
} from 'lucide-react';
import { ContentRepository } from '../repository/ContentRepository';
import { db } from '../db/database';
import type { LldProblem, LldPattern } from '../core/types/lld';

export const LldHomePage: React.FC = () => {
  const [problems, setProblems] = useState<LldProblem[]>([]);
  const [patterns, setPatterns] = useState<LldPattern[]>([]);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [inProgressCount, setInProgressCount] = useState<number>(0);
  const [savedDesignsCount, setSavedDesignsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [probs, pats, progressList, designs] = await Promise.all([
          ContentRepository.getLldProblems(),
          ContentRepository.getLldPatterns(),
          db.lldProgress.toArray(),
          db.lldDesigns.count(),
        ]);

        setProblems(probs);
        setPatterns(pats);
        setSavedDesignsCount(designs);

        let completed = 0;
        let inProgress = 0;
        for (const p of progressList) {
          if (p.status === 'completed') completed++;
          if (p.status === 'in-progress') inProgress++;
        }
        setCompletedCount(completed);
        setInProgressCount(inProgress);
      } catch (err) {
        console.error('Failed to load LLD home metrics:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalProblems = problems.length || 6;
  const progressPercent = Math.round((completedCount / totalProblems) * 100);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Hero Section */}
      <div className="relative rounded-3xl bg-gradient-to-br from-cyan-900/40 via-indigo-900/30 to-slate-900 border border-cyan-500/20 p-8 sm:p-10 overflow-hidden shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Low-Level Design (LLD) Studio</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Master Object-Oriented Design & Clean Architecture
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Practice real tech interview problems with an interactive UML class diagram editor, comprehensive GoF design patterns, and instant reference comparisons.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              to="/lld/foundations"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-xs shadow-md shadow-cyan-500/25 hover:from-cyan-400 hover:to-indigo-500 transition"
            >
              OOP & SOLID Foundations →
            </Link>
            <Link
              to="/lld/problems"
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/20 transition"
            >
              Problem Bank (18)
            </Link>
            <Link
              to="/lld/patterns"
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/20 transition"
            >
              Explore Patterns
            </Link>
          </div>
        </div>
      </div>

      {/* Progress Metric Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 w-full md:w-auto">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            LLD Practice Readiness
          </h3>
          <p className="text-xs text-slate-500">
            {completedCount} of {totalProblems} interview problems completed ({progressPercent}%)
          </p>
          <div className="w-full md:w-80 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-indigo-600 transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-6 w-full md:w-auto justify-around md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 dark:border-slate-800">
          <div className="text-center">
            <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400">{completedCount}</div>
            <div className="text-[11px] font-semibold text-slate-500">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-amber-500">{inProgressCount}</div>
            <div className="text-[11px] font-semibold text-slate-500">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-indigo-500">{patterns.length}</div>
            <div className="text-[11px] font-semibold text-slate-500">Patterns Available</div>
          </div>
        </div>
      </div>

      {/* 4 Main Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Foundations */}
        <Link
          to="/lld/foundations"
          className="group p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 hover:shadow-xl dark:hover:shadow-cyan-950/20 transition-all duration-200 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-5 group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
              OOP & SOLID Guide
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              Master the 6 UML relationships on an interactive canvas, and study clean architecture refactorings for all 5 SOLID principles.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-cyan-600 dark:text-cyan-400">
            <span>Explore Foundations</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 2: Problem Bank */}
        <Link
          to="/lld/problems"
          className="group p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 hover:shadow-xl dark:hover:shadow-cyan-950/20 transition-all duration-200 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-5 group-hover:scale-105 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              LLD Problem Bank
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              Tackle 18 classic interview challenges with guided requirements, UML canvas modelling, and complete Java reference solutions.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
            <span>Browse {totalProblems} problems</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 3: Patterns Library */}
        <Link
          to="/lld/patterns"
          className="group p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 hover:shadow-xl dark:hover:shadow-indigo-950/20 transition-all duration-200 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-5 group-hover:scale-105 transition-transform">
              <Layers className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              Design Patterns Library
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              Study Creational, Structural, and Behavioral patterns with interactive UML diagrams, runnable Java examples, and hands-on demos.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
            <span>View {patterns.length || 8} patterns</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 3: My Saved Designs */}
        <Link
          to="/lld/designs"
          className="group p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 hover:shadow-xl dark:hover:shadow-emerald-950/20 transition-all duration-200 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-5 group-hover:scale-105 transition-transform">
              <FolderKanban className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              My Saved Designs
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              Resume your work in progress, review submitted solutions, and export diagrams as Mermaid or JSON.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <span>{savedDesignsCount} saved designs</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </div>
  );
};
