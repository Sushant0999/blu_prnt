import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  Tag,
  AlertTriangle,
  Lightbulb,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ContentRepository } from '../repository/ContentRepository';
import { CaseStudy } from '../types/content';
import { db } from '../db/database';

export const CasesPage: React.FC = () => {
  const [cases, setCases] = useState<CaseStudy[]>([]);
  const [studiedMap, setStudiedMap] = useState<Record<string, boolean>>({});
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await ContentRepository.getCases();
        setCases(data.cases || []);

        const records = await db.caseStudies.toArray();
        const map: Record<string, boolean> = {};
        records.forEach((r) => {
          map[r.caseId] = r.studied;
        });
        setStudiedMap(map);
      } catch (e) {
        console.error('Failed to load cases', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const toggleStudied = async (caseId: string) => {
    const nextVal = !studiedMap[caseId];
    setStudiedMap((prev) => ({ ...prev, [caseId]: nextVal }));
    await db.caseStudies.put({
      caseId,
      studied: nextVal,
      bookmarked: false,
      updatedAt: Date.now(),
    });
  };

  const filteredCases = cases.filter((c) => {
    const matchesLevel = selectedLevel === 'all' || c.level.toLowerCase() === selectedLevel.toLowerCase();
    const matchesSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.subtitle.toLowerCase().includes(search.toLowerCase()) ||
      c.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchesLevel && matchesSearch;
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 mb-2">
            <FileText className="w-3.5 h-3.5" />
            Architectural Blueprints
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            System Design Case Studies
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Real-world end-to-end architectures, scale metrics, failure modes, and senior-level design notes.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search cases & tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Level Filters */}
      <div className="flex gap-2">
        {['all', 'beginner', 'intermediate', 'advanced'].map((lvl) => (
          <button
            key={lvl}
            onClick={() => setSelectedLevel(lvl)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              selectedLevel === lvl
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            {lvl}
          </button>
        ))}
      </div>

      {/* Cases List */}
      <div className="space-y-4">
        {filteredCases.map((c) => {
          const isStudied = studiedMap[c.id];
          const isExpanded = expandedCaseId === c.id;

          return (
            <div
              key={c.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-all"
            >
              {/* Card Banner */}
              <div
                onClick={() => setExpandedCaseId(isExpanded ? null : c.id)}
                className="p-6 cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        c.level === 'beginner'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : c.level === 'intermediate'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                      }`}
                    >
                      {c.level}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5" /> {c.readMinutes} min read
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{c.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">{c.subtitle}</p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {c.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium"
                      >
                        <Tag className="w-2.5 h-2.5" /> {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStudied(c.id);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isStudied
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isStudied ? 'Studied' : 'Mark Studied'}
                  </button>

                  <div className="text-slate-400">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* Expanded Detailed Breakdown */}
              {isExpanded && (
                <div className="border-t border-slate-200 dark:border-slate-800 p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950/30">
                  {/* Targets Row */}
                  {c.targets && c.targets.length > 0 && (
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2">
                        Scale & Capacity Targets
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {c.targets.map((t, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                          >
                            <span className="text-[10px] font-semibold text-slate-400 block">{t.label}</span>
                            <span className="text-sm font-extrabold text-brand-600 dark:text-brand-400 font-mono mt-0.5 block">
                              {t.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Requirements Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Functional Requirements
                      </span>
                      <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 pl-4 list-disc">
                        {c.functional.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Non-Functional Guarantees
                      </span>
                      <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 pl-4 list-disc">
                        {c.nonFunctional.map((nf, i) => (
                          <li key={i}>{nf}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Deep Dives */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Architectural Deep-Dives
                    </span>
                    <div className="space-y-2">
                      {c.deepDives.map((dd, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex items-start gap-2.5"
                        >
                          <Layers className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                          <span>{dd}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Senior Notes & Common Pitfalls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {c.seniorNotes && (
                      <div className="p-4 rounded-xl bg-brand-50/50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-900 text-xs text-brand-900 dark:text-brand-300 space-y-1.5">
                        <div className="font-bold flex items-center gap-1.5">
                          <Lightbulb className="w-4 h-4 text-brand-600" />
                          Staff / Principal Architect Notes
                        </div>
                        <p className="opacity-90 leading-relaxed">{c.seniorNotes}</p>
                      </div>
                    )}

                    {c.commonMistakes && c.commonMistakes.length > 0 && (
                      <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-900 dark:text-rose-300 space-y-1.5">
                        <div className="font-bold flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                          Common Interview Pitfalls
                        </div>
                        <ul className="pl-4 list-disc space-y-1 opacity-90">
                          {c.commonMistakes.map((m, i) => (
                            <li key={i}>{m}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
