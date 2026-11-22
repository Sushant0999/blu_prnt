import { SimulatorDefinition, SimulatorLogic, OutcomeDef, StatTileDef, RequestPayload } from '../engine/types';

export const CDN_OUTCOMES: OutcomeDef[] = [
  { id: 'edge_hit', label: 'Edge POP Hit (<10ms)', color: '#10b981', shape: 'circle' },
  { id: 'origin_fetch', label: 'Edge Miss ➔ Origin Fetch (~120ms)', color: '#f59e0b', shape: 'square' },
  { id: 'swr_revalidate', label: 'Stale Served + Async Revalidate', color: '#06b6d4', shape: 'diamond' },
  { id: 'origin_down', label: 'Origin Unavailable (Stale Fallback)', color: '#ef4444', shape: 'cross' },
];

export class CdnEdgeLogic implements SimulatorLogic {
  private mode: string = 'pull_cdn';
  private totalReqs: number = 0;
  private edgeHits: number = 0;
  private originFetches: number = 0;
  private originDown: boolean = false;

  init(params: Record<string, any>, modeId: string): any {
    this.mode = modeId;
    this.reset();
    return this.getState();
  }

  reset(): void {
    this.totalReqs = 0;
    this.edgeHits = 0;
    this.originFetches = 0;
    this.originDown = false;
  }

  onRequest(req: RequestPayload, now: number): OutcomeDef {
    this.totalReqs++;

    if (this.originDown) {
      return CDN_OUTCOMES[3]; // Origin down
    }

    if (this.mode === 'push_cdn') {
      // 95% hit rate because assets are pre-warmed
      if (req.id % 20 === 0) {
        this.originFetches++;
        return CDN_OUTCOMES[1];
      }
      this.edgeHits++;
      return CDN_OUTCOMES[0];
    }

    if (this.mode === 'swr') {
      if (req.id % 6 === 0) {
        this.edgeHits++;
        return CDN_OUTCOMES[2]; // Stale served instantly, async revalidate
      }
      this.edgeHits++;
      return CDN_OUTCOMES[0];
    }

    // Pull CDN: cold misses on first query
    if (req.id % 4 === 0) {
      this.originFetches++;
      return CDN_OUTCOMES[1];
    }

    this.edgeHits++;
    return CDN_OUTCOMES[0];
  }

  tick(dtMs: number, now: number): void {}

  getCenterMetric(): { label: string; value: string | number; percentage?: number } {
    const offload = this.totalReqs > 0 ? Math.round((this.edgeHits / this.totalReqs) * 100) : 100;
    return {
      label: 'Edge Offload',
      value: `${offload}%`,
      percentage: offload,
    };
  }

  getStats(): [StatTileDef, StatTileDef, StatTileDef] {
    const offload = this.totalReqs > 0 ? Math.round((this.edgeHits / this.totalReqs) * 100) : 100;
    return [
      { label: 'Edge Inbound', value: this.totalReqs, color: '#38bdf8' },
      { label: 'Origin Traffic Offload', value: `${offload}%`, trend: offload >= 80 ? 'up' : 'down', color: offload >= 80 ? '#10b981' : '#f59e0b' },
      { label: 'Origin Shield Hits', value: this.originFetches, color: '#a855f7' },
    ];
  }

  getState(): any {
    return { total: this.totalReqs, edge: this.edgeHits, origin: this.originFetches };
  }

  applyFailure(actionId: string): void {
    if (actionId === 'drop_origin') {
      this.originDown = !this.originDown;
    }
  }
}

export const cdnEdgeDefinition: SimulatorDefinition = {
  id: 'cdn-edge-caching',
  title: 'CDN & Edge Caching Architecture',
  description: 'Inspect edge point-of-presence (POP) distribution, Pull vs Push caching, and Stale-While-Revalidate behaviors.',
  linkedLessonId: 'cdn-edge-caching',
  defaultRate: 20,
  maxRate: 60,
  modes: [
    {
      id: 'pull_cdn',
      label: 'Pull CDN (Origin Fetch on Miss)',
      explanation: 'Edge caches asset on demand when first requested. Subsequent clients in that geographic POP get cached hit.',
    },
    {
      id: 'push_cdn',
      label: 'Push CDN (Pre-Warmed)',
      explanation: 'Content creators push new media directly to all edge points during deployment. Near 100% cache hit rate.',
    },
    {
      id: 'swr',
      label: 'Stale-While-Revalidate (SWR)',
      explanation: 'Edge returns cached asset immediately to the client while simultaneously triggering an asynchronous origin update.',
    },
  ],
  params: [],
  outcomes: CDN_OUTCOMES,
  failureActions: [
    { id: 'drop_origin', label: 'Cut Origin Server Access (Verify Edge Stale Serve)', apply: (s) => {} },
  ],
  createLogic: () => new CdnEdgeLogic(),
};
