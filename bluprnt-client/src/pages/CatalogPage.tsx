import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Database,
  Layers,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Globe,
  Server,
  Cpu,
  Zap,
} from 'lucide-react';
import { ContentRepository } from '../repository/ContentRepository';
import type { CatalogContent, CourseItem } from '../types/content';
import { useProgressStore } from '../stores/useProgressStore';

export const CatalogPage: React.FC = () => {
  const [catalog, setCatalog] = useState<CatalogContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { progressMap, loadProgress } = useProgressStore();

  useEffect(() => {
    loadProgress();
    ContentRepository.getCatalog()
      .then((data) => {
        setCatalog(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [loadProgress]);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Database':
        return Database;
      case 'ShieldCheck':
        return ShieldCheck;
      case 'Globe':
        return Globe;
      case 'Server':
        return Server;
      case 'Cpu':
        return Cpu;
      case 'Zap':
        return Zap;
      case 'Layers':
      default:
        return Layers;
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-500">Loading curriculum...</span>
        </div>
      </div>
    );
  }

  if (error || !catalog) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center">
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200">
          <p className="font-semibold text-sm">Error loading courses</p>
          <p className="text-xs mt-1 text-rose-600 dark:text-rose-400">{error}</p>
        </div>
      </div>
    );
  }

  const allTopics = catalog.courses.flatMap((c) => c.topics);
  const completedTopicsCount = allTopics.filter((t) => progressMap[t.lesson]?.completed).length;
  const overallPercentage = allTopics.length > 0 ? Math.round((completedTopicsCount / allTopics.length) * 100) : 0;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-indigo-600 to-slate-900 p-6 md:p-10 text-white shadow-xl shadow-brand-500/10">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-xs font-semibold uppercase tracking-wider text-brand-200 border border-white/15">
            <Sparkles className="w-3.5 h-3.5" />
            Curriculum Matrix
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">
            Learn System Design by Building & Simulating.
          </h1>
          <p className="text-sm md:text-base text-brand-100/90 leading-relaxed">
            Master the physical realities of distributed computing — network partitions, compaction write amplification, consistent rings, and tail latency bottlenecks.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <Link
              to="/playground"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-white text-slate-900 hover:bg-brand-50 transition-all shadow-md shadow-black/10"
            >
              <Layers className="w-4 h-4 text-brand-600" />
              Launch Topology Canvas
              <ArrowRight className="w-4 h-4" />
            </Link>

            <div className="flex items-center gap-2 text-xs font-medium text-brand-200 bg-black/20 px-3.5 py-2 rounded-xl backdrop-blur">
              <BookOpen className="w-4 h-4" />
              <span>
                {completedTopicsCount} of {allTopics.length} lessons completed ({overallPercentage}%)
              </span>
            </div>
          </div>
        </div>

        {/* Decorative Grid SVG in background */}
        <div className="absolute -right-12 -bottom-12 w-96 h-96 opacity-10 pointer-events-none">
          <svg viewBox="0 0 100 100" fill="currentColor">
            <circle cx="50" cy="50" r="40" stroke="white" strokeWidth="2" fill="none" />
            <circle cx="50" cy="50" r="25" stroke="white" strokeWidth="2" fill="none" />
            <circle cx="50" cy="50" r="10" stroke="white" strokeWidth="2" fill="none" />
          </svg>
        </div>
      </div>

      {/* Courses List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Available Courses
          </h2>
          <span className="text-xs text-slate-500 font-medium">{catalog.courses.length} structured domains</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {catalog.courses.map((course: CourseItem) => {
            const Icon = getIcon(course.icon);
            const courseCompletedCount = course.topics.filter((t) => progressMap[t.lesson]?.completed).length;
            const coursePercentage = Math.round((courseCompletedCount / course.topics.length) * 100);

            return (
              <div
                key={course.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-md transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {courseCompletedCount}/{course.topics.length} Done
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
                    {course.title}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">
                    {course.subtitle}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-4 leading-relaxed">
                    {course.description}
                  </p>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mb-6 overflow-hidden">
                    <div
                      className="bg-brand-600 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${coursePercentage}%` }}
                    />
                  </div>

                  {/* Topic items */}
                  <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-4">
                    {course.topics.map((topic) => {
                      const isComplete = progressMap[topic.lesson]?.completed;
                      return (
                        <Link
                          key={topic.id}
                          to={`/lessons/${topic.lesson}`}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-xs font-medium group/topic"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isComplete ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 shrink-0" />
                            )}
                            <span className="truncate text-slate-700 dark:text-slate-300 group-hover/topic:text-brand-600 dark:group-hover/topic:text-brand-400">
                              {topic.title}
                            </span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 group-hover/topic:translate-x-0.5 transition-transform" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
