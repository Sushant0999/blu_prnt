import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Lightbulb,
  CheckSquare,
  Lock,
  Unlock,
  Eye,
  RotateCcw,
  Send,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import confetti from 'canvas-confetti';

import { ContentRepository } from '../repository/ContentRepository';
import { db } from '../db/database';
import { ClassDiagramEditor } from '../components/lld/ClassDiagramEditor';
import type { LldProblem, LldDiagram, LldDesignRecord, LldProgressRecord } from '../core/types/lld';

export const LldProblemWorkspacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [problem, setProblem] = useState<LldProblem | null>(null);
  const [loading, setLoading] = useState(true);

  // Diagram state
  const [diagram, setDiagram] = useState<LldDiagram>({ nodes: {}, edges: {} });

  // Workspace panels state
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<'notes' | 'checklist' | 'reference'>('checklist');

  // Hints
  const [revealedHints, setRevealedHints] = useState<number>(0);

  // Notes & Checklist state
  const [notes, setNotes] = useState<string>('');
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});

  // Reference lock status
  const [isReferenceUnlocked, setIsReferenceUnlocked] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Autosave status message
  const [saveStatus, setSaveStatus] = useState<string>('Saved');

  // Load problem content & design from Dexie
  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const prob = await ContentRepository.getLldProblem(id);
        if (!prob) return;
        setProblem(prob);

        // Load progress
        const prog = await db.lldProgress.get(id);
        if (prog) {
          setRevealedHints(prog.hintsUsed || 0);
          if (prog.status === 'completed' || prog.referenceViewedAt) {
            setIsReferenceUnlocked(true);
          }
          if (prog.status === 'completed') {
            setIsSubmitted(true);
          }
        }

        // Load design
        const savedDesign = await db.lldDesigns.where('problemId').equals(id).first();
        if (savedDesign) {
          setDiagram(savedDesign.diagram);
          setNotes(savedDesign.notes || '');
          setChecklistState(savedDesign.checklistState || {});
          if (savedDesign.status === 'submitted') {
            setIsSubmitted(true);
            setIsReferenceUnlocked(true);
          }
        }
      } catch (err) {
        console.error('Failed to load workspace data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // Autosave diagram & notes to Dexie
  const handleSaveDiagram = useCallback(
    async (newDiagram: LldDiagram) => {
      if (!id) return;
      setDiagram(newDiagram);
      setSaveStatus('Saving...');
      try {
        const existing = await db.lldDesigns.where('problemId').equals(id).first();
        const recordId = existing ? existing.id : `lld_design_${id}_${Date.now()}`;
        const record: LldDesignRecord = {
          id: recordId,
          problemId: id,
          title: problem?.title || 'LLD Design',
          diagram: newDiagram,
          notes,
          checklistState,
          updatedAt: new Date().toISOString(),
          status: isSubmitted ? 'submitted' : 'draft',
        };
        await db.lldDesigns.put(record);

        // Update progress to in-progress if not yet completed
        const prog = await db.lldProgress.get(id);
        if (!prog || prog.status === 'not-started') {
          await db.lldProgress.put({
            problemId: id,
            status: 'in-progress',
            hintsUsed: revealedHints,
          });
        }

        setSaveStatus('Autosaved');
      } catch (e) {
        console.error('Save failed:', e);
        setSaveStatus('Save error');
      }
    },
    [id, problem, notes, checklistState, isSubmitted, revealedHints]
  );

  // Handle note change
  const handleNotesChange = (text: string) => {
    setNotes(text);
    if (!id) return;
    db.lldDesigns.where('problemId').equals(id).first().then((existing) => {
      if (existing) {
        db.lldDesigns.update(existing.id, { notes: text, updatedAt: new Date().toISOString() });
      }
    });
  };

  // Handle checklist toggle
  const handleToggleChecklist = (key: string) => {
    const next = { ...checklistState, [key]: !checklistState[key] };
    setChecklistState(next);
    if (!id) return;
    db.lldDesigns.where('problemId').equals(id).first().then((existing) => {
      if (existing) {
        db.lldDesigns.update(existing.id, { checklistState: next, updatedAt: new Date().toISOString() });
      }
    });
  };

  // Reveal next hint
  const handleRevealHint = async () => {
    if (!problem || !id) return;
    if (revealedHints < problem.hints.length) {
      const nextCount = revealedHints + 1;
      setRevealedHints(nextCount);
      const prog = await db.lldProgress.get(id);
      await db.lldProgress.put({
        problemId: id,
        status: prog?.status || 'in-progress',
        hintsUsed: nextCount,
        referenceViewedAt: prog?.referenceViewedAt,
        completedAt: prog?.completedAt,
      });
    }
  };

  // Unlock reference ("I'm stuck, show me")
  const handleUnlockReference = async () => {
    if (!id) return;
    setIsReferenceUnlocked(true);
    setActiveRightTab('reference');
    const prog = await db.lldProgress.get(id);
    await db.lldProgress.put({
      problemId: id,
      status: prog?.status || 'in-progress',
      hintsUsed: revealedHints,
      referenceViewedAt: new Date().toISOString(),
      completedAt: prog?.completedAt,
    });
  };

  // Submit design
  const handleSubmitDesign = async () => {
    if (!id) return;
    setIsSubmitted(true);
    setIsReferenceUnlocked(true);
    setActiveRightTab('reference');

    // Fire celebratory confetti!
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    // Update progress & streak
    await db.lldProgress.put({
      problemId: id,
      status: 'completed',
      hintsUsed: revealedHints,
      completedAt: new Date().toISOString(),
    });

    const existing = await db.lldDesigns.where('problemId').equals(id).first();
    if (existing) {
      await db.lldDesigns.update(existing.id, {
        status: 'submitted',
        updatedAt: new Date().toISOString(),
      });
    }

    // Update main streak
    const streakRecord = await db.streak.get('main');
    if (streakRecord) {
      const today = new Date().toISOString().split('T')[0];
      if (!streakRecord.activeDates.includes(today)) {
        await db.streak.update('main', {
          currentStreak: streakRecord.currentStreak + 1,
          longestStreak: Math.max(streakRecord.longestStreak, streakRecord.currentStreak + 1),
          lastActiveDate: today,
          activeDates: [...streakRecord.activeDates, today],
        });
      }
    }
  };

  // Reset workspace design
  const handleReset = async () => {
    if (!window.confirm('Reset this workspace to an empty diagram? Your notes and current draft will be cleared.')) return;
    if (!id) return;
    const emptyDiagram: LldDiagram = { nodes: {}, edges: {} };
    setDiagram(emptyDiagram);
    setNotes('');
    setChecklistState({});
    const existing = await db.lldDesigns.where('problemId').equals(id).first();
    if (existing) {
      await db.lldDesigns.update(existing.id, {
        diagram: emptyDiagram,
        notes: '',
        checklistState: {},
        updatedAt: new Date().toISOString(),
      });
    }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center text-sm text-slate-500">Loading problem workspace...</div>;
  }

  if (!problem) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Problem not found</h2>
        <Link to="/lld/problems" className="mt-4 inline-block text-sm text-cyan-600 underline">
          Return to Problem Bank
        </Link>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Workspace Sub-header */}
      <div className="h-13 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/lld/problems"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Back to problems"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                {problem.title}
              </h2>
              <span className="text-[10px] font-bold px-1.5 py-0.2 uppercase rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {problem.difficulty}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                • {saveStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {problem.relatedPatternIds && problem.relatedPatternIds.length > 0 && (
            <div className="hidden lg:flex items-center gap-1 mr-2">
              <span className="text-[11px] font-medium text-slate-500">Patterns:</span>
              {problem.relatedPatternIds.map((pid) => (
                <Link
                  key={pid}
                  to={`/lld/patterns/${pid}`}
                  target="_blank"
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/80 hover:underline"
                >
                  {pid}
                </Link>
              ))}
            </div>
          )}

          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Reset Diagram"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {!isReferenceUnlocked && (
            <button
              onClick={handleUnlockReference}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 hover:bg-amber-100 transition"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>I'm stuck, show me</span>
            </button>
          )}

          <button
            onClick={handleSubmitDesign}
            disabled={isSubmitted}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg shadow-sm transition ${
              isSubmitted
                ? 'bg-emerald-600 text-white cursor-default'
                : 'bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white'
            }`}
          >
            {isSubmitted ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" /> Submitted
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" /> Submit my design
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3-Area Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Requirements, Constraints & Hints */}
        <div
          className={`border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col transition-all duration-300 ease-in-out shrink-0 ${
            isLeftPanelCollapsed ? 'w-10' : 'w-80 md:w-96'
          }`}
        >
          {/* Collapse Toggle */}
          <div className="h-10 border-b border-slate-200 dark:border-slate-800 px-3 flex items-center justify-between">
            {!isLeftPanelCollapsed && (
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Problem Requirements
              </span>
            )}
            <button
              onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title={isLeftPanelCollapsed ? 'Expand requirements' : 'Collapse requirements'}
            >
              {isLeftPanelCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {!isLeftPanelCollapsed && (
            <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
              {/* Summary */}
              <div>
                <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                  {problem.summary}
                </p>
              </div>

              {/* Functional Requirements */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-cyan-600" />
                  Functional Requirements
                </h4>
                <ul className="space-y-1.5 text-slate-600 dark:text-slate-400 pl-4 list-disc">
                  {problem.requirements.map((req, idx) => (
                    <li key={idx} className="leading-snug">{req}</li>
                  ))}
                </ul>
              </div>

              {/* Constraints */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Scope & Constraints
                </h4>
                <ul className="space-y-1.5 text-slate-600 dark:text-slate-400 pl-4 list-disc">
                  {problem.constraints.map((c, idx) => (
                    <li key={idx} className="leading-snug">{c}</li>
                  ))}
                </ul>
              </div>

              {/* Hints Box */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    Hints ({revealedHints}/{problem.hints.length})
                  </h4>
                  {revealedHints < problem.hints.length && (
                    <button
                      onClick={handleRevealHint}
                      className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
                    >
                      Reveal Next
                    </button>
                  )}
                </div>

                {revealedHints === 0 ? (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-slate-500 italic text-[11px]">
                    Need a clue? Click "Reveal Next" to unlock hints one by one.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {problem.hints.slice(0, revealedHints).map((hint, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 leading-snug"
                      >
                        <span className="font-bold mr-1">Hint {i + 1}:</span>
                        {hint}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Center: Class Diagram Editor */}
        <div className="flex-1 relative h-full">
          <ClassDiagramEditor
            initialDiagram={diagram}
            onSave={handleSaveDiagram}
          />
        </div>

        {/* Right Panel: Tabs (Notes / Self-Review / Reference) */}
        <div className="w-80 md:w-96 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0">
          {/* Tabs bar */}
          <div className="h-10 border-b border-slate-200 dark:border-slate-800 flex items-center px-2 gap-1 bg-slate-50/50 dark:bg-slate-900/50">
            <button
              onClick={() => setActiveRightTab('notes')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                activeRightTab === 'notes'
                  ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-300 shadow-sm border border-slate-200 dark:border-slate-700'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Notes
            </button>
            <button
              onClick={() => setActiveRightTab('checklist')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                activeRightTab === 'checklist'
                  ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-300 shadow-sm border border-slate-200 dark:border-slate-700'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Self-Review
            </button>
            <button
              onClick={() => setActiveRightTab('reference')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                activeRightTab === 'reference'
                  ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-300 shadow-sm border border-slate-200 dark:border-slate-700'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {isReferenceUnlocked ? <Unlock className="w-3 h-3 text-emerald-500" /> : <Lock className="w-3 h-3 text-slate-400" />}
              <span>Reference</span>
            </button>
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* 1. Notes Tab */}
            {activeRightTab === 'notes' && (
              <div className="space-y-3 h-full flex flex-col">
                <div className="text-xs text-slate-500">
                  Record design assumptions, concurrency decisions, and trade-offs.
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="e.g. Assuming parking lot fits within a single building with 3 floors. Spot allocation is synchronized per floor..."
                  className="flex-1 w-full text-xs font-mono p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 resize-none leading-relaxed"
                />
              </div>
            )}

            {/* 2. Self-Review Checklist Tab */}
            {activeRightTab === 'checklist' && (
              <div className="space-y-6 text-xs">
                {/* Key Entities Checklist */}
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2">
                    Key Entities in Design
                  </h4>
                  <div className="space-y-2">
                    {problem.keyEntities.map((entity) => {
                      const isChecked = !!checklistState[`entity_${entity}`];
                      return (
                        <label
                          key={entity}
                          className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleChecklist(`entity_${entity}`)}
                            className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                          />
                          <span className={`font-mono text-[11px] ${isChecked ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200 font-semibold'}`}>
                            {entity}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Self-Review Questions */}
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2">
                    Design Quality Questions
                  </h4>
                  <div className="space-y-2">
                    {problem.selfReviewChecklist.map((question, i) => {
                      const isChecked = !!checklistState[`q_${i}`];
                      return (
                        <label
                          key={i}
                          className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleChecklist(`q_${i}`)}
                            className="mt-0.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                          />
                          <span className={`leading-snug ${isChecked ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                            {question}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 3. Reference Tab */}
            {activeRightTab === 'reference' && (
              <div className="space-y-5 text-xs">
                {!isReferenceUnlocked ? (
                  <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                    <Lock className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      Reference Solution Locked
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
                      Try modeling the classes on the canvas first! Once you submit your design or choose "I'm stuck", the reference architecture and notes will unlock.
                    </p>
                    <button
                      onClick={handleUnlockReference}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition"
                    >
                      Unlock Reference Now
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Reference Diagram mini-canvas */}
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center justify-between">
                        <span>Reference Class Diagram</span>
                      </h4>
                      <div className="h-64 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner">
                        <ClassDiagramEditor
                          initialDiagram={problem.referenceDiagram}
                          readOnly={true}
                        />
                      </div>
                    </div>

                    {/* Common Mistakes */}
                    {problem.commonMistakes && problem.commonMistakes.length > 0 && (
                      <div className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60">
                        <h4 className="font-bold text-rose-900 dark:text-rose-200 mb-2 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                          Common Pitfalls to Avoid
                        </h4>
                        <ul className="space-y-1 pl-4 list-disc text-rose-800 dark:text-rose-300 text-[11px]">
                          {problem.commonMistakes.map((m, idx) => (
                            <li key={idx} className="leading-snug">{m}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Reference Notes (Markdown) */}
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2">
                        Architectural Rationale
                      </h4>
                      <div className="prose prose-xs dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {problem.referenceNotes}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
