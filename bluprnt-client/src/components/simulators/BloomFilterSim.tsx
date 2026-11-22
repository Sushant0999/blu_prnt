import React, { useState, useMemo } from 'react';
import { Plus, Search, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';

const BIT_ARRAY_SIZE = 24;

// 3 pseudo-random hash functions mapping string -> [0, BIT_ARRAY_SIZE - 1]
function hash1(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash) % BIT_ARRAY_SIZE;
}

function hash2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash) % BIT_ARRAY_SIZE;
}

function hash3(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 17 + str.charCodeAt(i) * 37) & 0xffffffff;
  }
  return Math.abs(hash) % BIT_ARRAY_SIZE;
}

export const BloomFilterSim: React.FC = () => {
  const [bitArray, setBitArray] = useState<number[]>(new Array(BIT_ARRAY_SIZE).fill(0));
  const [insertedItems, setInsertedItems] = useState<string[]>(['alice@example.com', 'user:409']);
  const [inputItem, setInputItem] = useState('');
  const [queryItem, setQueryItem] = useState('');
  const [queryResult, setQueryResult] = useState<{
    tested: string;
    indices: number[];
    isMember: boolean;
    isFalsePositivePossible: boolean;
  } | null>(null);

  // Initialize with default items
  React.useEffect(() => {
    const bits = new Array(BIT_ARRAY_SIZE).fill(0);
    ['alice@example.com', 'user:409'].forEach((item) => {
      bits[hash1(item)] = 1;
      bits[hash2(item)] = 1;
      bits[hash3(item)] = 1;
    });
    setBitArray(bits);
  }, []);

  const addItem = () => {
    const item = inputItem.trim();
    if (!item) return;

    const idx1 = hash1(item);
    const idx2 = hash2(item);
    const idx3 = hash3(item);

    const nextBits = [...bitArray];
    nextBits[idx1] = 1;
    nextBits[idx2] = 1;
    nextBits[idx3] = 1;

    setBitArray(nextBits);
    if (!insertedItems.includes(item)) {
      setInsertedItems([...insertedItems, item]);
    }
    setInputItem('');
  };

  const testQuery = () => {
    const item = queryItem.trim();
    if (!item) return;

    const indices = [hash1(item), hash2(item), hash3(item)];
    const isMember = indices.every((idx) => bitArray[idx] === 1);
    const wasActuallyInserted = insertedItems.includes(item);

    setQueryResult({
      tested: item,
      indices,
      isMember,
      isFalsePositivePossible: isMember && !wasActuallyInserted,
    });
  };

  const reset = () => {
    setBitArray(new Array(BIT_ARRAY_SIZE).fill(0));
    setInsertedItems([]);
    setQueryResult(null);
  };

  // Theoretical False Positive Probability: (1 - e^(-kn/m))^k
  const falsePositiveProb = useMemo(() => {
    const m = BIT_ARRAY_SIZE;
    const k = 3;
    const n = insertedItems.length;
    if (n === 0) return 0;
    const exponent = (-k * n) / m;
    const prob = Math.pow(1 - Math.exp(exponent), k);
    return Number((prob * 100).toFixed(1));
  }, [insertedItems.length]);

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <h4 className="font-bold text-slate-900 dark:text-slate-100">Bloom Filter Probabilistic Data Structure</h4>
        <p className="text-xs text-slate-500 mt-1">
          Bloom filters guarantee <strong>zero false negatives</strong>: if a bit is 0, the item is definitely absent.
          However, hash collisions can cause <strong>false positives</strong> (reporting an item exists when it doesn't).
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Bit Array ({BIT_ARRAY_SIZE} bits | k=3 hash functions)
          </span>
          <button
            onClick={reset}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Clear All
          </button>
        </div>

        {/* Visual Bit Array */}
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
          {bitArray.map((bit, idx) => {
            const isHighlightedByQuery = queryResult?.indices.includes(idx);
            return (
              <div
                key={idx}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                  isHighlightedByQuery
                    ? 'border-brand-500 ring-2 ring-brand-400 bg-brand-50 dark:bg-brand-950/60'
                    : bit === 1
                    ? 'border-indigo-300 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-slate-400'
                }`}
              >
                <span className="text-[10px] text-slate-400 font-mono mb-0.5">#{idx}</span>
                <span className="text-base font-extrabold font-mono">{bit}</span>
              </div>
            );
          })}
        </div>

        {/* Input & Query Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Add Item */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Add Element to Set</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. bob@mail.com"
                value={inputItem}
                onChange={(e) => setInputItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addItem()}
                className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
              />
              <button
                onClick={addItem}
                className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Insert
              </button>
            </div>
            <div className="text-[11px] text-slate-400">
              Inserted ({insertedItems.length}): {insertedItems.join(', ') || 'None'}
            </div>
          </div>

          {/* Test Membership */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Test Membership (GET)</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. test@unknown.org"
                value={queryItem}
                onChange={(e) => setQueryItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && testQuery()}
                className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
              />
              <button
                onClick={testQuery}
                className="px-3.5 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                <Search className="w-3.5 h-3.5" /> Check
              </button>
            </div>
          </div>
        </div>

        {/* Query Result Display */}
        {queryResult && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              queryResult.isFalsePositivePossible
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                : queryResult.isMember
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200'
            }`}
          >
            {queryResult.isFalsePositivePossible ? (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            ) : queryResult.isMember ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="text-xs font-bold">
                {queryResult.isFalsePositivePossible
                  ? 'False Positive Detected! (Colliding Hash)'
                  : queryResult.isMember
                  ? 'Probably in Set (All Bits = 1)'
                  : 'Definitely NOT in Set (Zero Found)'}
              </div>
              <p className="text-xs mt-1 opacity-90">
                Tested indices: <span className="font-mono">[{queryResult.indices.join(', ')}]</span>.{' '}
                {queryResult.isMember
                  ? 'All 3 hash slots contain 1. The database may contain this record.'
                  : 'At least one hash bit evaluated to 0. Can safely bypass disk lookup!'}
              </p>
            </div>
          </div>
        )}

        {/* Theoretical stats */}
        <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-4">
          <span>Theoretical False Positive Probability: <strong>{falsePositiveProb}%</strong></span>
          <span>Space efficiency: ~3 bytes for entire set</span>
        </div>
      </div>
    </div>
  );
};
