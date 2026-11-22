import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Cpu,
  ExternalLink,
  Lightbulb,
  ListOrdered,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ContentRepository } from '../repository/ContentRepository';
import type { LessonContent } from '../types/content';
import { QuizRunner } from '../components/lesson/QuizRunner';
import { useProgressStore } from '../stores/useProgressStore';
import { getSimulatorById } from '../core/registry/simulatorRegistry';

export const LessonPage: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<LessonContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { progressMap, loadProgress } = useProgressStore();
  const [inlineSimOpen, setInlineSimOpen] = useState(false);

  useEffect(() => {
    loadProgress();
    if (!lessonId) return;

    setLoading(true);
    ContentRepository.getLesson(lessonId)
      .then((data) => {
        setLesson(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [lessonId, loadProgress]);

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-500">Loading lesson content...</span>
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-4">
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-sm">
          Failed to load lesson: {error}
        </div>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300"
        >
          Return to Course Directory
        </button>
      </div>
    );
  }

  const isCompleted = progressMap[lesson.id]?.completed;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      {/* Back button & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Courses
        </Link>

        {isCompleted && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Lesson Completed
          </span>
        )}
      </div>

      {/* Header section */}
      <div className="space-y-3 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">
          <BookOpen className="w-3 h-3" />
          Interactive Lesson
        </div>
        <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          {lesson.title}
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
          {lesson.intro}
        </p>
      </div>

      {/* Objectives Box */}
      {lesson.objectives && lesson.objectives.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            <ListOrdered className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            Learning Objectives
          </div>
          <ul className="space-y-1.5 pl-6 list-disc text-sm text-slate-600 dark:text-slate-400">
            {lesson.objectives.map((obj, idx) => (
              <li key={idx} className="leading-relaxed">
                {obj}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Simulator Shortcut Banner */}
      {lesson.sim && (() => {
        const simMeta = getSimulatorById(lesson.sim);
        const SimComponent = simMeta?.component;
        return (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-brand-600/10 via-indigo-600/10 to-transparent border border-brand-200 dark:border-brand-900/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-brand-600 text-white shadow-md shadow-brand-600/20">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Interactive Simulator: {simMeta?.name || 'Simulation Lab'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Experiment with live visual parameters for this topic.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInlineSimOpen(!inlineSimOpen)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1.5"
                >
                  {inlineSimOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {inlineSimOpen ? 'Collapse' : 'Expand Inline'}
                </button>
                <Link
                  to={`/simulators/${lesson.sim}`}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-sm shrink-0 flex items-center gap-1.5"
                >
                  Full Screen
                  <Sparkles className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {inlineSimOpen && SimComponent && (
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
                <SimComponent />
              </div>
            )}
          </div>
        );
      })()}

      {/* Markdown Main Body */}
      <article className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 prose-headings:font-bold prose-headings:tracking-tight prose-a:text-brand-600 prose-code:font-mono prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.body}</ReactMarkdown>
      </article>

      {/* Concepts breakdown cards */}
      {lesson.concepts && lesson.concepts.length > 0 && (
        <div className="space-y-4 pt-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Key Concepts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lesson.concepts.map((concept, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-sm"
              >
                <h4 className="font-bold text-sm text-brand-600 dark:text-brand-400">
                  {concept.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {concept.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Idea Callout */}
      {lesson.keyIdea && (
        <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-4">
          <Lightbulb className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">
              Architectural Takeaway
            </h4>
            <p className="text-sm text-slate-800 dark:text-slate-200 font-medium italic">
              "{lesson.keyIdea}"
            </p>
          </div>
        </div>
      )}

      {/* Real-World Industry Examples */}
      {lesson.examples && lesson.examples.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Real-World Production Examples
          </h4>
          <ul className="space-y-1.5 pl-6 list-disc text-xs text-slate-600 dark:text-slate-400">
            {lesson.examples.map((ex, idx) => (
              <li key={idx}>{ex}</li>
            ))}
          </ul>
        </div>
      )}

      {/* External Resources */}
      {lesson.resources && lesson.resources.length > 0 && (
        <div className="space-y-2 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Recommended Papers & Deep-Dives
          </h4>
          <div className="flex flex-wrap gap-2">
            {lesson.resources.map((res, idx) => (
              <a
                key={idx}
                href={res.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
              >
                <span>{res.title}</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Quiz Runner */}
      <QuizRunner lessonId={lesson.id} quiz={lesson.quiz} />
    </div>
  );
};
