import React from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TopBarControlsProps {
  title: string;
  description: string;
  linkedLessonId?: string;
  isPaused: boolean;
  isBursty: boolean;
  rate: number;
  onTogglePause: () => void;
  onReset: () => void;
}

export const TopBarControls: React.FC<TopBarControlsProps> = ({
  title,
  description,
  linkedLessonId,
  isPaused,
  isBursty,
  rate,
  onTogglePause,
  onReset,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
      {/* Title & Back Navigation */}
      <div className="flex items-start space-x-3">
        <Link
          to="/simulate"
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title="Back to All Simulators"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight">{title}</h1>
            {linkedLessonId && (
              <Link
                to={`/lessons/${linkedLessonId}`}
                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-950/70 border border-cyan-800/80 text-cyan-300 hover:bg-cyan-900/60 transition"
                title="Go to associated lesson"
              >
                <BookOpen className="w-3 h-3" />
                <span>Lesson</span>
              </Link>
            )}
            {/* Status Pill */}
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium ${
                isPaused
                  ? 'bg-amber-950/70 border border-amber-800/80 text-amber-300'
                  : isBursty
                  ? 'bg-purple-950/70 border border-purple-800/80 text-purple-300'
                  : 'bg-emerald-950/70 border border-emerald-800/80 text-emerald-300'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                  isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'
                }`}
              />
              {isPaused ? 'Paused' : isBursty ? `Streaming (${rate} req/s bursty)` : `Streaming (${rate} req/s)`}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">{description}</p>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center space-x-2 self-end md:self-center">
        <button
          onClick={onTogglePause}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm ${
            isPaused
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-amber-600 hover:bg-amber-500 text-white'
          }`}
          title="Toggle Pause / Resume (Hotkey: Space)"
        >
          {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
          <span>{isPaused ? 'Resume' : 'Pause'}</span>
          <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] bg-black/30 rounded font-mono">
            Space
          </kbd>
        </button>

        <button
          onClick={onReset}
          className="px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          title="Reset internal state & metrics (Hotkey: R)"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset</span>
          <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] bg-black/30 rounded font-mono">
            R
          </kbd>
        </button>
      </div>
    </div>
  );
};
