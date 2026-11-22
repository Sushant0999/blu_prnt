import { SimulatorDefinition, SimulatorLogic, OutcomeDef, StatTileDef, RequestPayload } from '../engine/types';

export const BLOOM_OUTCOMES: OutcomeDef[] = [
  { id: 'def_not_in_set', label: 'Definitely Not In Set (Disk I/O Saved)', color: '#10b981', shape: 'circle' },
  { id: 'in_set', label: 'True Positive (Found in DB)', color: '#3b82f6', shape: 'square' },
  { id: 'false_positive', label: 'False Positive (Wasted Disk Read)', color: '#ef4444', shape: 'cross' },
  { id: 'mutated', label: 'Item Inserted into Filter', color: '#f59e0b', shape: 'diamond' },
];

export class BloomFilterLogic implements SimulatorLogic {
  private mode: string = 'standard';
  private bitArraySize: number = 256;
  private bits: Uint8Array = new Uint8Array(256);
  private counters: Uint8Array = new Uint8Array(256);
  private knownSet: Set<string> = new Set();
  private totalQueries: number = 0;
  private savedDiskReads: number = 0;
  private falsePositives: number = 0;
  private truePositives: number = 0;

  init(params: Record<string, any>, modeId: string): any {
    this.mode = modeId;
    this.bitArraySize = Number(params.bits || 256);
    this.reset();
    return this.getState();
  }

  reset(): void {
    this.bits = new Uint8Array(this.bitArraySize);
    this.counters = new Uint8Array(this.bitArraySize);
    this.knownSet.clear();
    this.totalQueries = 0;
    this.savedDiskReads = 0;
    this.falsePositives = 0;
    this.truePositives = 0;

    // Seed 25 items into the known set
    for (let i = 0; i < 25; i++) {
      this.insertItem(`user-${i * 3}`);
    }
  }

  private hash1(key: string): number {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % this.bitArraySize;
    return Math.abs(h);
  }

  private hash2(key: string): number {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 37 + key.charCodeAt(i)) % this.bitArraySize;
    return Math.abs(h);
  }

  private hash3(key: string): number {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 41 + key.charCodeAt(i)) % this.bitArraySize;
    return Math.abs(h);
  }

  private insertItem(key: string): void {
    this.knownSet.add(key);
    const h1 = this.hash1(key);
    const h2 = this.hash2(key);
    const h3 = this.hash3(key);

    this.bits[h1] = 1;
    this.bits[h2] = 1;
    this.bits[h3] = 1;

    this.counters[h1] = Math.min(255, this.counters[h1] + 1);
    this.counters[h2] = Math.min(255, this.counters[h2] + 1);
    this.counters[h3] = Math.min(255, this.counters[h3] + 1);
  }

  onRequest(req: RequestPayload, now: number): OutcomeDef {
    // 20% inserts, 80% lookups
    const isInsert = req.id % 5 === 0;
    const testKey = `user-${req.id % 80}`;

    if (isInsert) {
      this.insertItem(testKey);
      return BLOOM_OUTCOMES[3]; // mutated
    }

    this.totalQueries++;
    const h1 = this.hash1(testKey);
    const h2 = this.hash2(testKey);
    const h3 = this.hash3(testKey);

    const maybePresent = this.bits[h1] === 1 && this.bits[h2] === 1 && this.bits[h3] === 1;

    if (!maybePresent) {
      this.savedDiskReads++;
      return BLOOM_OUTCOMES[0]; // definitely not in set
    }

    // It claimed maybe present! Check true database
    if (this.knownSet.has(testKey)) {
      this.truePositives++;
      return BLOOM_OUTCOMES[1]; // true positive
    } else {
      this.falsePositives++;
      return BLOOM_OUTCOMES[2]; // false positive!
    }
  }

  tick(dtMs: number, now: number): void {}

  getCenterMetric(): { label: string; value: string | number; percentage?: number } {
    let setBits = 0;
    for (let i = 0; i < this.bitArraySize; i++) {
      if (this.bits[i] === 1) setBits++;
    }
    const saturation = Math.round((setBits / this.bitArraySize) * 100);
    return {
      label: 'Bit Saturation',
      value: `${saturation}%`,
      percentage: saturation,
    };
  }

  getStats(): [StatTileDef, StatTileDef, StatTileDef] {
    const totalPositives = this.falsePositives + this.truePositives;
    const fpRate = totalPositives > 0 ? Math.round((this.falsePositives / totalPositives) * 100) : 0;
    const savedPct = this.totalQueries > 0 ? Math.round((this.savedDiskReads / this.totalQueries) * 100) : 100;

    return [
      { label: 'Disk Reads Filtered', value: `${savedPct}%`, color: '#10b981', trend: 'up' },
      { label: 'False Positive Rate', value: `${fpRate}%`, trend: fpRate < 10 ? 'down' : 'up', color: fpRate < 10 ? '#38bdf8' : '#ef4444' },
      { label: 'Known Keys Count', value: this.knownSet.size, color: '#f59e0b' },
    ];
  }

  getState(): any {
    return {
      bitSize: this.bitArraySize,
      known: this.knownSet.size,
      fp: this.falsePositives,
    };
  }

  applyFailure(actionId: string): void {
    if (actionId === 'saturate_bits') {
      // Set all bits to 1 (100% false positive mode)
      this.bits.fill(1);
    } else if (actionId === 'clear_filter') {
      this.bits.fill(0);
      this.knownSet.clear();
    }
  }
}

export const bloomFilterDefinition: SimulatorDefinition = {
  id: 'bloom-filter',
  title: 'Bloom Filter & Membership Testing',
  description: 'Test set membership with zero false negatives; observe bit saturation and false positive tradeoffs.',
  linkedLessonId: 'bloom-filters',
  defaultRate: 20,
  maxRate: 50,
  modes: [
    {
      id: 'standard',
      label: 'Standard Bloom Filter',
      explanation: 'Uses 3 independent hash functions mapped to a bit array. Zero false negatives; false positive rate rises with saturation.',
    },
    {
      id: 'counting',
      label: 'Counting Bloom Filter',
      explanation: 'Replaces single bits with 4-bit counters to support key deletions without rebuilding the filter.',
    },
    {
      id: 'cuckoo',
      label: 'Cuckoo Filter',
      explanation: 'Uses cuckoo hashing with fingerprints. Supports deletions, higher space efficiency, and bounded false positives.',
    },
  ],
  params: [
    { id: 'bits', label: 'Filter Bit Array Size', type: 'stepper', min: 128, max: 1024, step: 128, default: 256, unit: 'bits' },
  ],
  outcomes: BLOOM_OUTCOMES,
  failureActions: [
    { id: 'saturate_bits', label: 'Saturate All Bits (Max False Positives)', apply: (s) => {} },
    { id: 'clear_filter', label: 'Reset Filter Bits', apply: (s) => {} },
  ],
  createLogic: () => new BloomFilterLogic(),
};
