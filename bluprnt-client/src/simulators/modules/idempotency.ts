import { SimulatorDefinition, SimulatorLogic, OutcomeDef, StatTileDef, RequestPayload } from '../engine/types';

export const IDEMPOTENCY_OUTCOMES: OutcomeDef[] = [
  { id: 'processed_new', label: 'New Request Processed (DB Write)', color: '#10b981', shape: 'circle' },
  { id: 'deduped_safe', label: 'Duplicate Deduped (Cached Ack Returned)', color: '#3b82f6', shape: 'square' },
  { id: 'double_processed', label: 'Double Processed (Duplicate Charge Hazard)', color: '#ef4444', shape: 'cross' },
  { id: 'dropped_packet', label: 'Packet Dropped in Transit', color: '#f59e0b', shape: 'triangle' },
];

export class IdempotencyLogic implements SimulatorLogic {
  private mode: string = 'exactly_once';
  private processedKeys: Set<string> = new Set();
  private totalIngested: number = 0;
  private safeDeduped: number = 0;
  private doubleProcessedErrors: number = 0;

  init(params: Record<string, any>, modeId: string): any {
    this.mode = modeId;
    this.reset();
    return this.getState();
  }

  reset(): void {
    this.processedKeys.clear();
    this.totalIngested = 0;
    this.safeDeduped = 0;
    this.doubleProcessedErrors = 0;
  }

  onRequest(req: RequestPayload, now: number): OutcomeDef {
    this.totalIngested++;

    // Respect explicit key if provided, or generate deterministic key
    const isRetry = req.id % 4 === 0;
    const key = req.key || `order-${isRetry ? (req.id - 1) : req.id}`;

    if (this.mode === 'at_most_once') {
      if (req.id % 10 === 0) {
        return IDEMPOTENCY_OUTCOMES[3]; // dropped
      }
      return IDEMPOTENCY_OUTCOMES[0];
    }

    if (this.mode === 'at_least_once') {
      if (this.processedKeys.has(key)) {
        this.doubleProcessedErrors++;
        return IDEMPOTENCY_OUTCOMES[2]; // double processed fault!
      }
      this.processedKeys.add(key);
      return IDEMPOTENCY_OUTCOMES[0];
    }

    // exactly_once with Idempotency-Key
    if (this.processedKeys.has(key)) {
      this.safeDeduped++;
      return IDEMPOTENCY_OUTCOMES[1]; // safe dedup!
    }

    this.processedKeys.add(key);
    return IDEMPOTENCY_OUTCOMES[0];
  }

  tick(dtMs: number, now: number): void {}

  getCenterMetric(): { label: string; value: string | number; percentage?: number } {
    const dedupRate = this.totalIngested > 0 ? Math.round((this.safeDeduped / this.totalIngested) * 100) : 0;
    return {
      label: 'Safe Dedup Rate',
      value: `${dedupRate}%`,
      percentage: dedupRate,
    };
  }

  getStats(): [StatTileDef, StatTileDef, StatTileDef] {
    return [
      { label: 'Total Inbound Messages', value: this.totalIngested, color: '#38bdf8' },
      { label: 'Safely Deduped', value: `${this.safeDeduped} msgs`, color: '#10b981' },
      { label: 'Duplicate Write Faults', value: this.doubleProcessedErrors, trend: this.doubleProcessedErrors === 0 ? 'neutral' : 'down', color: this.doubleProcessedErrors === 0 ? '#10b981' : '#ef4444' },
    ];
  }

  getState(): any {
    return { total: this.totalIngested, deduped: this.safeDeduped, doubleErrors: this.doubleProcessedErrors };
  }

  applyFailure(actionId: string): void {
    if (actionId === 'flush_keys') {
      this.processedKeys.clear();
    }
  }
}

export const idempotencyDefinition: SimulatorDefinition = {
  id: 'idempotency-delivery',
  title: 'Idempotency & Message Delivery Semantics',
  description: 'Differentiate At-Most-Once, At-Least-Once, and Exactly-Once delivery semantics using distributed Idempotency Keys.',
  linkedLessonId: 'idempotency-keys',
  defaultRate: 20,
  maxRate: 50,
  modes: [
    {
      id: 'exactly_once',
      label: 'Idempotency Keys (Effectively Once)',
      explanation: 'Clients pass a unique Idempotency-Key header. The server stores key + response; duplicates receive the cached response without re-executing.',
    },
    {
      id: 'at_least_once',
      label: 'At-Least-Once (Retry on Ack Loss)',
      explanation: 'Producers retry until acknowledgment. If acks are lost over the network, consumers process duplicate messages, risking double-charges.',
    },
    {
      id: 'at_most_once',
      label: 'At-Most-Once (Fire & Forget)',
      explanation: 'Producer sends message and never retries. Zero risk of duplicate execution, but transient packet loss causes permanent message loss.',
    },
  ],
  params: [],
  outcomes: IDEMPOTENCY_OUTCOMES,
  failureActions: [
    { id: 'flush_keys', label: 'Purge Idempotency Key Cache (Simulate Key Eviction)', apply: (s) => {} },
  ],
  createLogic: () => new IdempotencyLogic(),
};
