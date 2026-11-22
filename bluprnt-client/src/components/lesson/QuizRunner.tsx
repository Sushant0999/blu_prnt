import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, XCircle, Award, RotateCcw, HelpCircle } from 'lucide-react';
import type { QuizOption } from '../../types/content';
import { useProgressStore } from '../../stores/useProgressStore';

interface QuizRunnerProps {
  lessonId: string;
  quiz: QuizOption[];
  onComplete?: (score: number, total: number) => void;
}

export const QuizRunner: React.FC<QuizRunnerProps> = ({ lessonId, quiz, onComplete }) => {
  const { markLessonComplete, getLessonProgress } = useProgressStore();
  const existingProgress = getLessonProgress(lessonId);

  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!quiz || quiz.length === 0) {
    return null;
  }

  const handleSelect = (questionIndex: number, optionIndex: number) => {
    if (submitted) return; // Prevent changing after submission
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex,
    }));
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const isAllAnswered = answeredCount === quiz.length;

  const handleSubmit = () => {
    let correctCount = 0;
    quiz.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correct) {
        correctCount++;
      }
    });

    setSubmitted(true);
    markLessonComplete(lessonId, correctCount, quiz.length);

    if (correctCount === quiz.length) {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // Fallback gracefully if confetti fails
      }
    }

    onComplete?.(correctCount, quiz.length);
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setSubmitted(false);
  };

  const score = quiz.reduce((acc, q, idx) => acc + (selectedAnswers[idx] === q.correct ? 1 : 0), 0);

  return (
    <div className="mt-12 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Knowledge Check</h3>
            <p className="text-xs text-slate-500">
              Answer all {quiz.length} questions to verify your mastery and earn lesson completion.
            </p>
          </div>
        </div>

        {existingProgress?.completed && !submitted && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed ({existingProgress.quizScore ?? quiz.length}/{existingProgress.quizTotal ?? quiz.length})
          </span>
        )}
      </div>

      <div className="space-y-8">
        {quiz.map((q, qIdx) => {
          const selectedOption = selectedAnswers[qIdx];
          const isCorrect = selectedOption === q.correct;

          return (
            <div key={q.id || qIdx} className="space-y-3">
              <h4 className="text-sm md:text-base font-semibold text-slate-900 dark:text-slate-200">
                <span className="text-brand-600 dark:text-brand-400 font-bold mr-2">Q{qIdx + 1}.</span>
                {q.prompt}
              </h4>

              <div className="space-y-2">
                {q.options.map((opt, optIdx) => {
                  const isSelected = selectedOption === optIdx;
                  let optionClass =
                    'border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 bg-slate-50/50 dark:bg-slate-800/30';

                  if (isSelected && !submitted) {
                    optionClass =
                      'border-brand-500 dark:border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-medium';
                  }

                  if (submitted) {
                    if (optIdx === q.correct) {
                      optionClass =
                        'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 font-semibold';
                    } else if (isSelected && !isCorrect) {
                      optionClass =
                        'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200';
                    } else {
                      optionClass = 'border-slate-200 dark:border-slate-800 opacity-60';
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={submitted}
                      onClick={() => handleSelect(qIdx, optIdx)}
                      className={`w-full text-left p-3.5 rounded-xl border text-sm transition-all flex items-start gap-3 ${optionClass}`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {submitted ? (
                          optIdx === q.correct ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : isSelected ? (
                            <XCircle className="w-4 h-4 text-rose-600" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700" />
                          )
                        ) : (
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'border-brand-600 bg-brand-600'
                                : 'border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        )}
                      </div>
                      <span className="flex-1">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {submitted && (
                <div
                  className={`p-3.5 rounded-xl text-xs mt-2 ${
                    isCorrect
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                      : 'bg-rose-50/80 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40'
                  }`}
                >
                  <span className="font-bold mr-1">{isCorrect ? 'Correct!' : 'Incorrect:'}</span>
                  {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        {!submitted ? (
          <>
            <span className="text-xs text-slate-500">
              {answeredCount} of {quiz.length} answered
            </span>
            <button
              onClick={handleSubmit}
              disabled={!isAllAnswered}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md ${
                isAllAnswered
                  ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-500/25'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              Submit Answers
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Award
                className={`w-5 h-5 ${
                  score === quiz.length ? 'text-amber-500' : 'text-slate-400'
                }`}
              />
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Score: {score} / {quiz.length} ({Math.round((score / quiz.length) * 100)}%)
              </span>
            </div>

            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retake Quiz
            </button>
          </>
        )}
      </div>
    </div>
  );
};
