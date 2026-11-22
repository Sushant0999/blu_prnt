import React, { useState } from 'react';
import { Database, ArrowDown, Search, Plus, RefreshCw } from 'lucide-react';

interface Entry {
  key: string;
  val: string;
  tombstone?: boolean;
}

export const LsmTreeSim: React.FC = () => {
  const [memTable, setMemTable] = useState<Entry[]>([
    { key: 'user:101', val: 'Alice' },
    { key: 'user:102', val: 'Bob' },
  ]);
  const [l0Tables, setL0Tables] = useState<Entry[][]>([
    [
      { key: 'user:099', val: 'Zoe' },
      { key: 'user:101', val: 'Alice_v1' },
      { key: 'user:105', val: 'Dan' },
    ],
  ]);
  const [l1Tables, setL1Tables] = useState<Entry[][]>([
    [
      { key: 'user:001', val: 'Aaron' },
      { key: 'user:050', val: 'Charlie' },
    ],
  ]);

  const [inputKey, setInputKey] = useState('');
  const [inputVal, setInputVal] = useState('');
  const [queryResult, setQueryResult] = useState<string | null>(null);

  const putEntry = () => {
    const k = inputKey.trim();
    const v = inputVal.trim();
    if (!k) return;

    // Insert or update in Memtable sorted
    const updated = [...memTable.filter((e) => e.key !== k), { key: k, val: v }].sort((a, b) =>
      a.key.localeCompare(b.key)
    );

    // If MemTable reaches size >= 4, auto-flush to L0
    if (updated.length >= 4) {
      setL0Tables([updated, ...l0Tables]);
      setMemTable([]);
    } else {
      setMemTable(updated);
    }

    setInputKey('');
    setInputVal('');
  };

  const manualFlush = () => {
    if (memTable.length === 0) return;
    setL0Tables([memTable, ...l0Tables]);
    setMemTable([]);
  };

  const triggerCompaction = () => {
    if (l0Tables.length === 0) return;
    // Merge sort all L0 and L1 tables, keeping the newest entry for each key
    const all = [...l0Tables.flat(), ...l1Tables.flat()];
    const dedupedMap = new Map<string, string>();
    all.forEach((item) => {
      // earlier in list is newer
      if (!dedupedMap.has(item.key)) {
        dedupedMap.set(item.key, item.val);
      }
    });

    const merged: Entry[] = Array.from(dedupedMap.entries())
      .map(([key, val]) => ({ key, val }))
      .sort((a, b) => a.key.localeCompare(b.key));

    setL0Tables([]);
    setL1Tables([merged]);
  };

  const searchKey = (k: string) => {
    // Check MemTable first
    const fromMem = memTable.find((e) => e.key === k);
    if (fromMem) {
      setQueryResult(`Hit in MemTable (In-Memory SkipList): "${fromMem.val}" (Fastest)`);
      return;
    }
    // Check L0
    for (let i = 0; i < l0Tables.length; i++) {
      const match = l0Tables[i].find((e) => e.key === k);
      if (match) {
        setQueryResult(`Hit in SSTable L0[${i}]: "${match.val}"`);
        return;
      }
    }
    // Check L1
    for (let i = 0; i < l1Tables.length; i++) {
      const match = l1Tables[i].find((e) => e.key === k);
      if (match) {
        setQueryResult(`Hit in Compacted SSTable L1[${i}]: "${match.val}"`);
        return;
      }
    }
    setQueryResult(`Key "${k}" not found across any tier (Bloom Filter verified)`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <h4 className="font-bold text-slate-900 dark:text-slate-100">LSM-Tree (Log-Structured Merge-Tree) Storage</h4>
        <p className="text-xs text-slate-500 mt-1">
          Writes append to in-memory MemTable for high write throughput. Periodic flushes convert to immutable SSTables on disk, which are compacted asynchronously to purge obsolete key updates.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8 space-y-4">
          {/* MemTable */}
          <div className="p-4 rounded-xl border-2 border-dashed border-brand-400 bg-brand-50/40 dark:bg-brand-950/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-brand-700 dark:text-brand-300 flex items-center gap-1.5">
                <Database className="w-4 h-4" /> Tier 1: In-Memory MemTable (RAM)
              </span>
              <button
                onClick={manualFlush}
                disabled={memTable.length === 0}
                className="text-xs px-2.5 py-1 bg-brand-600 text-white rounded font-medium disabled:opacity-50 hover:bg-brand-700"
              >
                Flush to L0
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {memTable.length === 0 ? (
                <span className="text-xs text-slate-400 italic">MemTable is currently empty</span>
              ) : (
                memTable.map((e) => (
                  <span
                    key={e.key}
                    className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-brand-300 dark:border-brand-700 text-xs font-mono font-medium shadow-sm"
                  >
                    {e.key} = {e.val}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-center text-slate-400">
            <ArrowDown className="w-5 h-5 animate-bounce" />
          </div>

          {/* L0 SSTables */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Tier 2: SSTables Level 0 (Disk - Overlapping Ranges)
              </span>
              <button
                onClick={triggerCompaction}
                disabled={l0Tables.length === 0}
                className="flex items-center gap-1 text-xs px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Compact L0 → L1
              </button>
            </div>
            <div className="space-y-2">
              {l0Tables.length === 0 ? (
                <span className="text-xs text-slate-400 italic">No SSTables in Level 0</span>
              ) : (
                l0Tables.map((tbl, i) => (
                  <div key={i} className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">SSTable #{i + 1}:</span>
                    {tbl.map((e) => (
                      <span key={e.key} className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[11px] font-mono">
                        {e.key}={e.val}
                      </span>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* L1 SSTables */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
              Tier 3: SSTables Level 1 (Disk - Non-Overlapping & Deduplicated)
            </span>
            <div className="space-y-2">
              {l1Tables.map((tbl, i) => (
                <div key={i} className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 flex flex-wrap gap-2 items-center">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Compacted:</span>
                  {tbl.map((e) => (
                    <span key={e.key} className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-mono">
                      {e.key}={e.val}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="md:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Put Operation (Write)</span>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Key (e.g. user:108)"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
              />
              <input
                type="text"
                placeholder="Value (e.g. Carol)"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
              />
              <button
                onClick={putEntry}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" /> Execute PUT
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Get Operation (Read Path)</span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Lookup key"
                id="searchKeyInput"
                className="flex-1 text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
              />
              <button
                onClick={() => {
                  const el = document.getElementById('searchKeyInput') as HTMLInputElement;
                  if (el?.value) searchKey(el.value.trim());
                }}
                className="px-3 py-1.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rounded text-xs font-semibold flex items-center gap-1"
              >
                <Search className="w-3.5 h-3.5" /> GET
              </button>
            </div>
            {queryResult && (
              <div className="mt-3 p-2.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                {queryResult}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
