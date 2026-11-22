import { SimulatorDefinition, SimulatorLogic, OutcomeDef, StatTileDef, RequestPayload } from '../engine/types';

export const CACHE_OUTCOMES: OutcomeDef[] = [
  { id: 'hit', label: 'Cache Hit (RAM ~1ms)', color: '#10b981', shape: 'circle' },
  { id: 'miss', label: 'Cache Miss (DB Read ~50ms)', color: '#f59e0b', shape: 'square' },
  { id: 'evicted', label: 'Cache Evicted & Replaced', color: '#8b5cf6', shape: 'triangle' },
  { id: 'stampede', label: 'Cache Stampede Hotspot', color: '#ef4444', shape: 'cross' },
];

interface CacheEntry {
  key: string;
  lastAccessed: number;
  frequency: number;
  insertedAt: number;
  ttlMs: number;
}

export class CacheLogic implements SimulatorLogic {
  private mode: string = 'lru';
  private capacity: number = 20;
  private entries: Map<string, CacheEntry> = new Map();
  private totalReqs: number = 0;
  private hits: number = 0;
  private misses: number = 0;
  private evictions: number = 0;
  private stampedeTriggered: boolean = false;

  init(params: Record<string, any>, modeId: string): any {
    this.mode = modeId;
    this.capacity = Number(params.capacity || 20);
    this.reset();
    return this.getState();
  }

  reset(): void {
    this.entries.clear();
    this.totalReqs = 0;
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
    this.stampedeTriggered = false;
  }

  onRequest(req: RequestPayload, now: number): OutcomeDef {
    this.totalReqs++;

    // Skewed Zipf distribution over 40 keys so cache fills up and evicts
    const keyId = this.stampedeTriggered ? 'hot-key-999' : `item-${Math.floor(Math.pow(Math.random(), 2) * 40)}`;
    const existing = this.entries.get(keyId);

    // TTL check
    if (this.mode === 'ttl' && existing && (now - existing.insertedAt > existing.ttlMs)) {
      this.entries.delete(keyId);
    }

    if (this.entries.has(keyId)) {
      this.hits++;
      const item = this.entries.get(keyId)!;
      item.lastAccessed = now;
      item.frequency++;
      if (this.stampedeTriggered) {
        return CACHE_OUTCOMES[3]; // stampede
      }
      return CACHE_OUTCOMES[0]; // hit
    }

    // Miss
    this.misses++;
    let wasEvicted = false;

    // Check capacity eviction
    if (this.entries.size >= this.capacity) {
      this.evictions++;
      wasEvicted = true;
      let evictKey = '';

      if (this.mode === 'lru') {
        let oldest = Infinity;
        for (const [k, v] of this.entries.entries()) {
          if (v.lastAccessed < oldest) {
            oldest = v.lastAccessed;
            evictKey = k;
          }
        }
      } else if (this.mode === 'lfu') {
        let lowestFreq = Infinity;
        for (const [k, v] of this.entries.entries()) {
          if (v.frequency < lowestFreq) {
            lowestFreq = v.frequency;
            evictKey = k;
          }
        }
      } else if (this.mode === 'fifo') {
        let earliest = Infinity;
        for (const [k, v] of this.entries.entries()) {
          if (v.insertedAt < earliest) {
            earliest = v.insertedAt;
            evictKey = k;
          }
        }
      } else {
        // random or ttl
        const keys = Array.from(this.entries.keys());
        evictKey = keys[Math.floor(Math.random() * keys.length)];
      }

      if (evictKey) {
        this.entries.delete(evictKey);
      }
    }

    // Store new item
    this.entries.set(keyId, {
      key: keyId,
      lastAccessed: now,
      frequency: 1,
      insertedAt: now,
      ttlMs: 3000,
    });

    return wasEvicted ? CACHE_OUTCOMES[2] : CACHE_OUTCOMES[1];
  }

  tick(dtMs: number, now: number): void {
    if (this.mode === 'ttl') {
      for (const [k, v] of this.entries.entries()) {
        if (now - v.insertedAt > v.ttlMs) {
          this.entries.delete(k);
          this.evictions++;
        }
      }
    }
  }

  getCenterMetric(): { label: string; value: string | number; percentage?: number } {
    const hitRate = this.totalReqs > 0 ? Math.round((this.hits / this.totalReqs) * 100) : 0;
    return {
      label: 'Hit Ratio',
      value: `${hitRate}%`,
      percentage: hitRate,
    };
  }

  getStats(): [StatTileDef, StatTileDef, StatTileDef] {
    const hitRate = this.totalReqs > 0 ? Math.round((this.hits / this.totalReqs) * 100) : 0;

    return [
      { label: 'Cache Occupancy', value: `${this.entries.size} / ${this.capacity}`, color: '#38bdf8' },
      { label: 'Hit Rate', value: `${hitRate}%`, trend: hitRate >= 70 ? 'up' : 'down', color: hitRate >= 70 ? '#10b981' : '#f59e0b' },
      { label: 'Total Evictions', value: this.evictions, trend: this.evictions > 50 ? 'up' : 'neutral', color: '#8b5cf6' },
    ];
  }

  getState(): any {
    return { size: this.entries.size, hits: this.hits, misses: this.misses, evictions: this.evictions };
  }

  applyFailure(actionId: string): void {
    if (actionId === 'flush_cache') {
      this.entries.clear();
      this.evictions += 20;
    } else if (actionId === 'trigger_stampede') {
      this.stampedeTriggered = !this.stampedeTriggered;
    }
  }
}

export const cacheDefinition: SimulatorDefinition = {
  id: 'cache-policies',
  title: 'Cache Eviction & Access Patterns',
  description: 'Simulate LRU, LFU, FIFO, TTL expiry, and stampede failure cascades on an in-memory key-value cache.',
  linkedLessonId: 'caching-strategies',
  defaultRate: 20,
  maxRate: 60,
  modes: [
    {
      id: 'lru',
      label: 'LRU (Least Recently Used)',
      explanation: 'Evicts the key that has not been read or written for the longest duration. Excellent for temporal locality.',
    },
    {
      id: 'lfu',
      label: 'LFU (Least Frequently Used)',
      explanation: 'Evicts items with the lowest hit frequency counter. Preserves highly popular evergreen items.',
    },
    {
      id: 'fifo',
      label: 'FIFO (First In First Out)',
      explanation: 'Evicts items strictly in insertion order like a simple queue. Low overhead, ignores hit frequencies.',
    },
    {
      id: 'random',
      label: 'Random Eviction',
      explanation: 'Picks any key at random to evict. Lowest computational overhead; often used in Redis memory limits.',
    },
    {
      id: 'ttl',
      label: 'TTL Expiration',
      explanation: 'Keys carry an explicit time-to-live (3 seconds) and expire automatically via background eviction.',
    },
  ],
  params: [
    { id: 'capacity', label: 'Cache Capacity', type: 'stepper', min: 5, max: 40, default: 20, unit: 'items' },
  ],
  outcomes: CACHE_OUTCOMES,
  failureActions: [
    { id: 'flush_cache', label: 'Flush Cache (Cold Start Miss Wave)', apply: (s) => {} },
    { id: 'trigger_stampede', label: 'Toggle Cache Stampede Hotkey', apply: (s) => {} },
  ],
  createLogic: () => new CacheLogic(),
};
