import { SimulatorDefinition, SimulatorLogic, OutcomeDef, StatTileDef, RequestPayload } from '../engine/types';

export const LSM_OUTCOMES: OutcomeDef[] = [
  { id: 'memtable_write', label: 'MemTable Write (In-Memory SkipList)', color: '#10b981', shape: 'circle' },
  { id: 'flush_l0', label: 'MemTable Flushed to L0 SSTable', color: '#3b82f6', shape: 'square' },
  { id: 'compaction_minor', label: 'Compaction Merge Executed', color: '#8b5cf6', shape: 'diamond' },
  { id: 'io_spike', label: 'Heavy Compaction I/O Spike', color: '#ef4444', shape: 'cross' },
];

export class LsmTreeLogic implements SimulatorLogic {
  private mode: string = 'leveled';
  private memtableLimit: number = 8;
  private memtableCount: number = 0;
  private l0SSTables: number = 0;
  private l1SSTables: number = 0;
  private l2SSTables: number = 0;
  private totalWrites: number = 0;
  private diskBytesWritten: number = 0;
  private logicalBytesWritten: number = 0;

  init(params: Record<string, any>, modeId: string): any {
    this.mode = modeId;
    this.memtableLimit = Number(params.memtableLimit || 8);
    this.reset();
    return this.getState();
  }

  reset(): void {
    this.memtableCount = 0;
    this.l0SSTables = 0;
    this.l1SSTables = 0;
    this.l2SSTables = 0;
    this.totalWrites = 0;
    this.diskBytesWritten = 0;
    this.logicalBytesWritten = 0;
  }

  onRequest(req: RequestPayload, now: number): OutcomeDef {
    this.totalWrites++;
    const payloadSize = 256;
    this.logicalBytesWritten += payloadSize;
    this.memtableCount++;

    // Check if Memtable full -> flush to L0
    if (this.memtableCount >= this.memtableLimit) {
      this.memtableCount = 0;
      this.l0SSTables++;
      this.diskBytesWritten += payloadSize * this.memtableLimit;

      // Check compaction trigger based on mode
      if (this.mode === 'leveled') {
        if (this.l0SSTables >= 4) {
          this.l0SSTables -= 4;
          this.l1SSTables += 2;
          this.diskBytesWritten += payloadSize * this.memtableLimit * 4;
          if (this.l1SSTables >= 10) {
            this.l1SSTables -= 5;
            this.l2SSTables += 2;
            this.diskBytesWritten += payloadSize * this.memtableLimit * 10;
            return LSM_OUTCOMES[3]; // heavy I/O spike
          }
          return LSM_OUTCOMES[2]; // compaction merge
        }
      } else if (this.mode === 'size_tiered') {
        if (this.l0SSTables >= 4) {
          this.l0SSTables -= 4;
          this.l1SSTables += 1;
          this.diskBytesWritten += payloadSize * this.memtableLimit * 4;
          return LSM_OUTCOMES[2];
        }
      }

      return LSM_OUTCOMES[1]; // flush L0
    }

    return LSM_OUTCOMES[0]; // memtable write
  }

  tick(dtMs: number, now: number): void {}

  getCenterMetric(): { label: string; value: string | number; percentage?: number } {
    const pct = Math.round((this.memtableCount / this.memtableLimit) * 100);
    return {
      label: 'MemTable Fill',
      value: `${this.memtableCount} / ${this.memtableLimit}`,
      percentage: pct,
    };
  }

  getStats(): [StatTileDef, StatTileDef, StatTileDef] {
    const totalSSTables = this.l0SSTables + this.l1SSTables + this.l2SSTables;
    const writeAmp = this.logicalBytesWritten > 0 ? (this.diskBytesWritten / this.logicalBytesWritten).toFixed(1) : '1.0';

    return [
      { label: 'Total Ingestion', value: `${this.totalWrites} keys`, color: '#38bdf8' },
      { label: 'Active SSTables', value: `${totalSSTables} files`, trend: totalSSTables < 8 ? 'down' : 'up', color: '#10b981' },
      { label: 'Write Amplification', value: `${writeAmp}x`, trend: Number(writeAmp) < 3 ? 'down' : 'up', color: Number(writeAmp) < 3 ? '#a855f7' : '#ef4444' },
    ];
  }

  getState(): any {
    return {
      memtable: this.memtableCount,
      l0: this.l0SSTables,
      l1: this.l1SSTables,
      l2: this.l2SSTables,
    };
  }

  applyFailure(actionId: string): void {
    if (actionId === 'force_flush') {
      this.memtableCount = this.memtableLimit;
    } else if (actionId === 'saturate_l0') {
      this.l0SSTables += 8;
    }
  }
}

export const lsmTreeDefinition: SimulatorDefinition = {
  id: 'lsm-tree',
  title: 'LSM-Tree Storage & Compaction',
  description: 'Visualize append-only MemTables, write-ahead logs, SSTable flushes, and Leveled vs Size-Tiered compactions.',
  linkedLessonId: 'lsm-compaction',
  defaultRate: 15,
  maxRate: 50,
  modes: [
    {
      id: 'leveled',
      label: 'Leveled Compaction (LCS)',
      explanation: 'Organizes disk into exponentially larger levels (L0, L1, L2). Strict key non-overlap per level minimizes read amplification.',
    },
    {
      id: 'size_tiered',
      label: 'Size-Tiered Compaction (STCS)',
      explanation: 'Merges SSTables of similar sizes into a larger file. Highly optimized for high-throughput write-heavy workloads.',
    },
    {
      id: 'time_window',
      label: 'Time-Window (TWCS)',
      explanation: 'Groups SSTables into time windows based on timestamp metadata. Ideal for time-series data with fixed retention.',
    },
  ],
  params: [
    { id: 'memtableLimit', label: 'MemTable Size Threshold', type: 'stepper', min: 4, max: 20, default: 8, unit: 'keys' },
  ],
  outcomes: LSM_OUTCOMES,
  failureActions: [
    { id: 'force_flush', label: 'Force Immediate MemTable Flush', apply: (s) => {} },
    { id: 'saturate_l0', label: 'Inject 8 L0 SSTables (Compaction Backpressure)', apply: (s) => {} },
  ],
  createLogic: () => new LsmTreeLogic(),
};
