import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Shuffle,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Tag,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';
import { ContentRepository } from '../repository/ContentRepository';
import { InterviewPrompt } from '../types/content';
import { db } from '../db/database';

export const InterviewPage: React.FC = () => {
  const [prompts, setPrompts] = useState<InterviewPrompt[]>([]);
  const [bookmarkedMap, setBookmarkedMap] = useState<Record<string, boolean>>({});
  const [revealedMap, setRevealedMap] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await ContentRepository.getInterviewPrompts();
        setPrompts(data.prompts || []);

        const records = await db.interviews.toArray();
        const map: Record<string, boolean> = {};
        records.forEach((r) => {
          map[r.promptId] = r.bookmarked;
        });
        setBookmarkedMap(map);
      } catch (e) {
        console.error('Failed to load interview prompts', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const toggleBookmark = async (promptId: string) => {
    const nextVal = !bookmarkedMap[promptId];
    setBookmarkedMap((prev) => ({ ...prev, [promptId]: nextVal }));
    await db.interviews.put({
      promptId,
      bookmarked: nextVal,
      practiced: true,
      updatedAt: Date.now(),
    });
  };

  const toggleReveal = (id: string) => {
    setRevealedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const categories = ['All', 'Observability & Latency', 'API Design & Transactions', 'Consensus & Partitions'];

  const filteredPrompts = prompts.filter(
    (p) => selectedCategory === 'All' || p.category === selectedCategory
  );

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 mb-2">
            <HelpCircle className="w-3.5 h-3.5" />
            Interview Simulation Mode
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            System Design Mock Scenarios
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Real interview questions asked at Google, Meta, and Netflix, complete with senior staff tradeoffs.
          </p>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Prompts Cards */}
      <div className="space-y-4">
        {filteredPrompts.map((p) => {
          const isRevealed = revealedMap[p.id];
          const isBookmarked = bookmarkedMap[p.id];

          return (
            <div
              key={p.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400">
                      {p.category}
                    </span>
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      Level: {p.level}
                    </span>
                  </div>

                  <button
                    onClick={() => toggleBookmark(p.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isBookmarked
                        ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                    }`}
                    title="Bookmark Question"
                  >
                    <Bookmark className="w-4 h-4 fill-current" />
                  </button>
                </div>

                <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {p.question}
                </h3>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => toggleReveal(p.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 text-white dark:text-slate-900 text-xs font-bold transition-all shadow-sm"
                  >
                    {isRevealed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {isRevealed ? 'Hide Solution' : 'Reveal Solution & Senior Tradeoffs'}
                  </button>
                </div>
              </div>

              {/* Solution & Senior Tradeoffs Drawer */}
              {isRevealed && (
                <div className="border-t border-slate-200 dark:border-slate-800 p-6 bg-slate-50/50 dark:bg-slate-950/30 space-y-4">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Model Senior Architecture Solution
                    </span>
                    <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-medium">
                      {p.answer}
                    </div>
                  </div>

                  {/* Key Evaluation Points */}
                  {p.keyPoints && p.keyPoints.length > 0 && (
                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        What Interviewers Look For
                      </span>
                      <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 pl-4 list-disc">
                        {p.keyPoints.map((pt, i) => (
                          <li key={i}>{pt}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Tradeoffs */}
                  {p.tradeoffs && p.tradeoffs.length > 0 && (
                    <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-300 space-y-1">
                      <span className="font-bold block flex items-center gap-1">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-600" /> Architectural Tradeoffs
                      </span>
                      <ul className="pl-4 list-disc space-y-1 opacity-90">
                        {p.tradeoffs.map((to, i) => (
                          <li key={i}>{to}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
