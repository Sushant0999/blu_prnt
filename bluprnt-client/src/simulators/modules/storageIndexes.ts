import { SimulatorDefinition, SimulatorLogic, OutcomeDef, StatTileDef, RequestPayload } from '../engine/types';

export const INDEX_OUTCOMES: OutcomeDef[] = [
  { id: 'fast_read', label: 'Point Read (O(1) / O(log N))', color: '#10b981', shape: 'circle' },
  { id: 'page_split', label: 'B+ Tree Page Split / Disk Re-balance', color: '#f59e0b', shape: 'square' },
  { id: 'seq_append', label: 'LSM Fast Sequential Write', color: '#06b6d4', shape: 'diamond' },
  { id: 'hash_collision', label: 'Hash Collision Chain Traversal', color: '#ef4444', shape: 'cross' },
];

export class StorageIndexesLogic implements SimulatorLogic {
  private mode: string = 'b_plus_tree';
  private totalOps: number = 0;
  private avgLatencyMs: number = 2.5;
  private splitsOrCollisions: number = 0;
  private depth: number = 3;

  init(params: Record<string, any>, modeId: string): any {
    this.mode = modeId;
    this.reset();
    return this.getState();
  }

  reset(): void {
    this.totalOps = 0;
    this.splitsOrCollisions = 0;
    this.depth = this.mode === 'b_plus_tree' ? 3 : 1;
    this.avgLatencyMs = this.mode === 'lsm_index' ? 0.8 : 2.2;
  }

  onRequest(req: RequestPayload, now: number): OutcomeDef {
    this.totalOps++;
    const isWrite = req.id % 3 === 0;

    if (this.mode === 'b_plus_tree') {
      if (isWrite && req.id % 7 === 0) {
        this.splitsOrCollisions++;
        this.avgLatencyMs = 12.0;
        return INDEX_OUTCOMES[1]; // page split
      }
      this.avgLatencyMs = isWrite ? 4.5 : 2.1;
      return INDEX_OUTCOMES[0];
    }

    if (this.mode === 'lsm_index') {
      if (isWrite) {
        this.avgLatencyMs = 0.5;
        return INDEX_OUTCOMES[2]; // fast seq append
      }
      // Read might check multiple SSTables
      this.avgLatencyMs = 6.2;
      return INDEX_OUTCOMES[0];
    }

    // hash_index (e.g. Bitcask)
    if (req.id % 9 === 0) {
      this.splitsOrCollisions++;
      this.avgLatencyMs = 3.5;
      return INDEX_OUTCOMES[3]; // hash collision
    }
    this.avgLatencyMs = 0.9;
    return INDEX_OUTCOMES[0];
  }

  tick(dtMs: number, now: number): void {}

  getCenterMetric(): { label: string; value: string | number; percentage?: number } {
    return {
      label: 'Avg I/O Latency',
      value: `${this.avgLatencyMs.toFixed(1)} ms`,
      percentage: Math.min(100, Math.round((this.avgLatencyMs / 15) * 100)),
    };
  }

  getStats(): [StatTileDef, StatTileDef, StatTileDef] {
    return [
      { label: 'Total Index Ops', value: this.totalOps, color: '#38bdf8' },
      { label: 'Index Structural Events', value: this.splitsOrCollisions, trend: this.splitsOrCollisions < 10 ? 'down' : 'up', color: '#f59e0b' },
      { label: 'Read Complexity', value: this.mode === 'hash_index' ? 'O(1) Direct' : 'O(log N) Paged', color: '#10b981' },
    ];
  }

  getState(): any {
    return { mode: this.mode, total: this.totalOps, events: this.splitsOrCollisions };
  }
}

export const storageIndexesDefinition: SimulatorDefinition = {
  id: 'storage-indexes',
  title: 'Storage Engines & Index Structures',
  description: 'Compare B+ Trees, LSM-Trees, and In-Memory Hash Indexes across read latency, random writes, and page splits.',
  linkedLessonId: 'database-indexing',
  defaultRate: 20,
  maxRate: 50,
  modes: [
    {
      id: 'b_plus_tree',
      label: 'B+ Tree (InnoDB / Postgres)',
      explanation: 'Balanced tree with fixed 16KB pages. Blazing fast reads and range scans; random writes cause leaf page splits.',
    },
    {
      id: 'lsm_index',
      label: 'LSM Index (RocksDB / Cassandra)',
      explanation: 'Append-only log + sorted string tables. Ultra-fast sequential writes; point reads traverse bloom filters and SSTables.',
    },
    {
      id: 'hash_index',
      label: 'Hash Index (Bitcask / Redis)',
      explanation: 'All keys in RAM pointing directly to disk data file offsets. Strictly O(1) reads; cannot do range queries.',
    },
  ],
  params: [],
  outcomes: INDEX_OUTCOMES,
  createLogic: () => new StorageIndexesLogic(),
};
