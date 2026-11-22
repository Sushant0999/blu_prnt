import React, { useState } from 'react';
import { ArrowRight, RotateCcw, Play, CheckCircle2, AlertCircle } from 'lucide-react';

interface CacheEntry {
  key: string;
  freq: number; // for LFU
  lastAccessed: number; // for LRU
}

const CACHE_CAPACITY = 4;
const DEFAULT_ACCESS_STREAM = ['A', 'B', 'C', 'D', 'A', 'E', 'A', 'B', 'C', 'F'];

export const CacheEvictionSim: React.FC = () => {
  const [stream, setStream] = useState<string[]>(DEFAULT_ACCESS_STREAM);
  const [streamIndex, setStreamIndex] = useState<number>(0);

  // LRU State
  const [lruCache, setLruCache] = useState<string[]>([]);
  const [lruHits, setLruHits] = useState(0);
  const [lruMisses, setLruMisses] = useState(0);
  const [lruLastAction, setLruLastAction] = useState<string>('Ready');

  // LFU State
  const [lfuCache, setLfuCache] = useState<CacheEntry[]>([]);
  const [lfuHits, setLfuHits] = useState(0);
  const [lfuMisses, setLfuMisses] = useState(0);
  const [lfuLastAction, setLfuLastAction] = useState<string>('Ready');

  const stepForward = () => {
    if (streamIndex >= stream.length) return;
    const currentKey = stream[streamIndex];
    setStreamIndex((prev) => prev + 1);

    // 1. Process LRU
    setLruCache((prevLru) => {
      const existsIndex = prevLru.indexOf(currentKey);
      if (existsIndex !== -1) {
        // HIT: move to front (most recently used)
        setLruHits((h) => h + 1);
        setLruLastAction(`HIT: "${currentKey}" moved to MRU head`);
        const next = [...prevLru];
        next.splice(existsIndex, 1);
        return [currentKey, ...next];
      } else {
        // MISS: evict tail if full
        setLruMisses((m) => m + 1);
        if (prevLru.length >= CACHE_CAPACITY) {
          const victim = prevLru[prevLru.length - 1];
          setLruLastAction(`MISS: Evicted "${victim}" (LRU Tail), inserted "${currentKey}"`);
          return [currentKey, ...prevLru.slice(0, CACHE_CAPACITY - 1)];
        } else {
          setLruLastAction(`MISS: Inserted "${currentKey}"`);
          return [currentKey, ...prevLru];
        }
      }
    });

    // 2. Process LFU
    setLfuCache((prevLfu) => {
      const matchIndex = prevLfu.findIndex((e) => e.key === currentKey);
      if (matchIndex !== -1) {
        // HIT: increment frequency
        setLfuHits((h) => h + 1);
        setLfuLastAction(`HIT: Incremented freq for "${currentKey}" (${prevLfu[matchIndex].freq + 1})`);
        return prevLfu.map((e, idx) =>
          idx === matchIndex ? { ...e, freq: e.freq + 1, lastAccessed: Date.now() } : e
        );
      } else {
        // MISS: evict lowest frequency
        setLfuMisses((m) => m + 1);
        if (prevLfu.length >= CACHE_CAPACITY) {
          // Sort by lowest freq first, then oldest lastAccessed
          const sorted = [...prevLfu].sort((a, b) => a.freq - b.freq || a.lastAccessed - b.lastAccessed);
          const victim = sorted[0];
          setLfuLastAction(`MISS: Evicted "${victim.key}" (Freq: ${victim.freq}), inserted "${currentKey}"`);
          const filtered = prevLfu.filter((e) => e.key !== victim.key);
          return [...filtered, { key: currentKey, freq: 1, lastAccessed: Date.now() }];
        } else {
          setLfuLastAction(`MISS: Inserted "${currentKey}"`);
          return [...prevLfu, { key: currentKey, freq: 1, lastAccessed: Date.now() }];
        }
      }
    });
  };

  const reset = () => {
    setStreamIndex(0);
    setLruCache([]);
    setLruHits(0);
    setLruMisses(0);
    setLruLastAction('Ready');
    setLfuCache([]);
    setLfuHits(0);
    setLfuMisses(0);
    setLfuLastAction('Ready');
  };

  const lruHitRate = lruHits + lruMisses > 0 ? Math.round((lruHits / (lruHits + lruMisses)) * 100) : 0;
  const lfuHitRate = lfuHits + lfuMisses > 0 ? Math.round((lfuHits / (lfuHits + lfuMisses)) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <h4 className="font-bold text-slate-900 dark:text-slate-100">Cache Eviction: LRU vs LFU Comparison</h4>
        <p className="text-xs text-slate-500 mt-1">
          LRU (Least Recently Used) discards items not accessed for the longest time, protecting against cache churn.
          LFU (Least Frequently Used) counts access frequencies to keep hot popular items pinned regardless of recency.
        </p>
      </div>

      {/* Stream Tape */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Request Access Trace:</span>
          <div className="flex gap-2">
            <button
              onClick={stepForward}
              disabled={streamIndex >= stream.length}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" /> Next Access ({streamIndex}/{stream.length})
            </button>
            <button
              onClick={reset}
              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-lg text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto py-2">
          {stream.map((key, idx) => (
            <span
              key={idx}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                idx === streamIndex - 1
                  ? 'bg-brand-600 text-white ring-2 ring-brand-400 scale-105'
                  : idx < streamIndex
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                  : 'bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
              }`}
            >
              {key}
            </span>
          ))}
        </div>
      </div>

      {/* Side by side comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LRU */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="font-bold text-sm text-slate-800 dark:text-slate-200">LRU (Least Recently Used)</h5>
            <span className="text-xs font-bold text-brand-600">Hit Rate: {lruHitRate}%</span>
          </div>

          <div className="flex gap-2">
            {Array.from({ length: CACHE_CAPACITY }).map((_, slotIdx) => {
              const entry = lruCache[slotIdx];
              return (
                <div
                  key={slotIdx}
                  className="flex-1 h-20 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-2"
                >
                  <span className="text-[9px] text-slate-400 uppercase">
                    {slotIdx === 0 ? 'MRU (Head)' : slotIdx === CACHE_CAPACITY - 1 ? 'LRU (Tail)' : `Slot ${slotIdx}`}
                  </span>
                  <span className="text-base font-extrabold font-mono mt-1 text-slate-800 dark:text-slate-200">
                    {entry || '—'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="text-[11px] font-mono text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg">
            {lruLastAction}
          </div>
        </div>

        {/* LFU */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="font-bold text-sm text-slate-800 dark:text-slate-200">LFU (Least Frequently Used)</h5>
            <span className="text-xs font-bold text-indigo-600">Hit Rate: {lfuHitRate}%</span>
          </div>

          <div className="flex gap-2">
            {Array.from({ length: CACHE_CAPACITY }).map((_, slotIdx) => {
              const entry = lfuCache[slotIdx];
              return (
                <div
                  key={slotIdx}
                  className="flex-1 h-20 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-2"
                >
                  <span className="text-[9px] text-slate-400 uppercase">Slot {slotIdx}</span>
                  <span className="text-base font-extrabold font-mono mt-0.5 text-slate-800 dark:text-slate-200">
                    {entry?.key || '—'}
                  </span>
                  {entry && (
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                      {entry.freq}x
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-[11px] font-mono text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg">
            {lfuLastAction}
          </div>
        </div>
      </div>
    </div>
  );
};
