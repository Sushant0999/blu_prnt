import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Copy,
  Check,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Layers,
  Code2,
  BookOpen,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { ContentRepository } from '../repository/ContentRepository';
import { db } from '../db/database';
import { ClassDiagramEditor } from '../components/lld/ClassDiagramEditor';
import { StrategyDemo } from '../components/lld/demos/StrategyDemo';
import { ObserverDemo } from '../components/lld/demos/ObserverDemo';
import { StateDemo } from '../components/lld/demos/StateDemo';
import type { LldPattern } from '../core/types/lld';

export const LldPatternDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [pattern, setPattern] = useState<LldPattern | null>(null);
  const [loading, setLoading] = useState(true);

  // Copy code feedback
  const [copiedCode, setCopiedCode] = useState(false);

  // Flashcards added to SRS feedback
  const [cardsAdded, setCardsAdded] = useState(false);

  // Quiz state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [revealedExplanations, setRevealedExplanations] = useState<Record<number, boolean>>({});

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const pat = await ContentRepository.getLldPattern(id);
        if (pat) setPattern(pat);
      } catch (e) {
        console.error('Failed to load pattern detail:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleCopyCode = () => {
    if (!pattern?.javaCode) return;
    navigator.clipboard.writeText(pattern.javaCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAddFlashcardsToSrs = async () => {
    if (!pattern || !pattern.flashcards) return;
    try {
      const now = Date.now();
      for (const card of pattern.flashcards) {
        const cardId = `srs_card_lld_${pattern.id}_${card.front.slice(0, 15).replace(/\s+/g, '_')}`;
        await db.srsCards.put({
          cardId,
          deckId: 'lld-patterns',
          easeFactor: 2.5,
          interval: 1,
          repetitions: 0,
          dueDate: now,
          lastReviewedAt: 0,
        });
      }
      setCardsAdded(true);
      setTimeout(() => setCardsAdded(false), 3000);
    } catch (err) {
      console.error('Failed to add flashcards:', err);
    }
  };

  const handleSelectQuizOption = (qIdx: number, optIdx: number) => {
    setSelectedAnswers({ ...selectedAnswers, [qIdx]: optIdx });
    setRevealedExplanations({ ...revealedExplanations, [qIdx]: true });
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Loading pattern...</div>;
  }

  if (!pattern) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Pattern not found</h2>
        <Link to="/lld/patterns" className="mt-4 inline-block text-sm text-cyan-600 underline">
          Return to Patterns Library
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Back button & Header */}
      <div>
        <Link
          to="/lld/patterns"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Patterns
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                {pattern.category} Pattern
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {pattern.name}
            </h1>
          </div>

          <button
            onClick={handleAddFlashcardsToSrs}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border transition ${
              cardsAdded
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {cardsAdded ? <Check className="w-4 h-4 text-emerald-500" /> : <Sparkles className="w-4 h-4 text-amber-500" />}
            <span>{cardsAdded ? 'Flashcards Added to SRS!' : 'Add to Daily SRS Review'}</span>
          </button>
        </div>
      </div>

      {/* 1. Intent & Problem It Solves */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Intent
          </h3>
          <p className="text-base text-slate-900 dark:text-slate-100 font-semibold leading-relaxed">
            {pattern.intent}
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Problem It Solves
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {pattern.problemItSolves}
          </p>
        </div>
      </div>

      {/* 2. When to Use & When Not to Use */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> When to Use
          </h4>
          <ul className="space-y-1.5 pl-4 list-disc text-xs text-emerald-900 dark:text-emerald-200 leading-snug">
            {pattern.whenToUse.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-rose-600" /> When NOT to Use
          </h4>
          <ul className="space-y-1.5 pl-4 list-disc text-xs text-rose-900 dark:text-rose-200 leading-snug">
            {pattern.whenNotToUse.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 3. Class Diagram */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-600" /> Structure: UML Class Diagram
          </h3>
        </div>
        <div className="h-80 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <ClassDiagramEditor
            initialDiagram={pattern.diagram}
            readOnly={true}
          />
        </div>
      </div>

      {/* 4. Java Code Example */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-indigo-600" /> Complete Java Example
          </h3>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto shadow-md border border-slate-800 leading-relaxed">
          <pre>{pattern.javaCode}</pre>
        </div>
      </div>

      {/* 5. Interactive Demo (if available) */}
      {pattern.demoId && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" /> Interactive Hands-on Demo
          </h3>
          {pattern.demoId === 'strategy' && <StrategyDemo />}
          {pattern.demoId === 'observer' && <ObserverDemo />}
          {pattern.demoId === 'state' && <StateDemo />}
        </div>
      )}

      {/* 6. Related Problems */}
      {pattern.relatedProblemIds && pattern.relatedProblemIds.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-600" /> Practice in LLD Interview Problems
          </h3>
          <div className="flex flex-wrap gap-2">
            {pattern.relatedProblemIds.map((pid) => (
              <Link
                key={pid}
                to={`/lld/problems/${pid}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-cyan-700 dark:text-cyan-300 hover:border-cyan-500 transition shadow-sm"
              >
                <span>{pid}</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 7. Quiz Section */}
      {pattern.quiz && pattern.quiz.length > 0 && (
        <div className="space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-purple-600" /> Knowledge Check: Mini Quiz
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Test your comprehension of {pattern.name}.</p>
          </div>

          <div className="space-y-4">
            {pattern.quiz.map((q, qIdx) => {
              const selected = selectedAnswers[qIdx];
              const isAnswered = selected !== undefined;
              const isCorrect = selected === q.answerIndex;

              return (
                <div
                  key={qIdx}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-xs"
                >
                  <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {qIdx + 1}. {q.question}
                  </div>

                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => {
                      let btnStyle = 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800';
                      if (isAnswered) {
                        if (optIdx === q.answerIndex) {
                          btnStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 font-semibold';
                        } else if (selected === optIdx) {
                          btnStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200';
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          disabled={isAnswered}
                          onClick={() => handleSelectQuizOption(qIdx, optIdx)}
                          className={`w-full text-left p-2.5 rounded-xl border transition-all ${btnStyle}`}
                        >
                          <span className="font-bold mr-2 text-slate-400">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {isAnswered && (
                    <div
                      className={`p-3 rounded-xl border leading-relaxed ${
                        isCorrect
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 text-emerald-900 dark:text-emerald-200'
                          : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 text-rose-900 dark:text-rose-200'
                      }`}
                    >
                      <div className="font-bold mb-0.5">
                        {isCorrect ? '✓ Correct!' : '✗ Explanation:'}
                      </div>
                      <div>{q.explanation}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
