import { SimulatorDefinition, SimulatorLogic, OutcomeDef, StatTileDef, RequestPayload } from '../engine/types';

export const BREAKER_OUTCOMES: OutcomeDef[] = [
  { id: 'success', label: 'Call Succeeded (Closed State)', color: '#10b981', shape: 'circle' },
  { id: 'fast_failed', label: 'Fast-Failed (Circuit OPEN)', color: '#ef4444', shape: 'cross' },
  { id: 'probe_trial', label: 'Probe Trial (HALF-OPEN)', color: '#f59e0b', shape: 'square' },
  { id: 'fallback', label: 'Cached Fallback Returned', color: '#8b5cf6', shape: 'diamond' },
];

export type BreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreakerLogic implements SimulatorLogic {
  private mode: string = 'standard_fowler';
  private state: BreakerState = 'CLOSED';
  private failureThreshold: number = 5;
  private consecutiveFailures: number = 0;
  private openResetTimeoutMs: number = 3000;
  private openedAtMs: number = 0;
  private tripCount: number = 0;
  private fastFailedCount: number = 0;
  private totalCalls: number = 0;
  private downstreamBroken: boolean = false;

  init(params: Record<string, any>, modeId: string): any {
    this.mode = modeId;
    this.failureThreshold = Number(params.failureThreshold || 5);
    this.openResetTimeoutMs = Number(params.resetTimeout || 3000);
    this.reset();
    return this.getState();
  }

  reset(): void {
    this.state = 'CLOSED';
    this.consecutiveFailures = 0;
    this.openedAtMs = 0;
    this.tripCount = 0;
    this.fastFailedCount = 0;
    this.totalCalls = 0;
    this.downstreamBroken = false;
  }

  onRequest(req: RequestPayload, now: number): OutcomeDef {
    this.totalCalls++;

    // Check Open timeout -> Half Open
    if (this.state === 'OPEN') {
      if (now - this.openedAtMs >= this.openResetTimeoutMs) {
        this.state = 'HALF_OPEN';
      } else {
        this.fastFailedCount++;
        return BREAKER_OUTCOMES[1]; // Fast fail!
      }
    }

    if (this.state === 'HALF_OPEN') {
      if (this.downstreamBroken) {
        // Probe failed -> Re-open
        this.state = 'OPEN';
        this.openedAtMs = now;
        this.tripCount++;
        this.fastFailedCount++;
        return BREAKER_OUTCOMES[1];
      } else {
        // Probe succeeded -> Close!
        this.state = 'CLOSED';
        this.consecutiveFailures = 0;
        return BREAKER_OUTCOMES[2]; // Probe trial
      }
    }

    // State is CLOSED
    if (this.downstreamBroken || req.id % 12 === 0) {
      this.consecutiveFailures++;
      if (this.consecutiveFailures >= this.failureThreshold) {
        this.state = 'OPEN';
        this.openedAtMs = now;
        this.tripCount++;
      }
      return BREAKER_OUTCOMES[3]; // Fallback
    }

    this.consecutiveFailures = 0;
    return BREAKER_OUTCOMES[0]; // Success
  }

  tick(dtMs: number, now: number): void {
    if (this.state === 'OPEN' && now - this.openedAtMs >= this.openResetTimeoutMs) {
      this.state = 'HALF_OPEN';
    }
  }

  getCenterMetric(): { label: string; value: string | number; percentage?: number } {
    const pct = this.state === 'CLOSED' ? 0 : this.state === 'HALF_OPEN' ? 50 : 100;
    return {
      label: 'Breaker State',
      value: this.state,
      percentage: pct,
    };
  }

  getStats(): [StatTileDef, StatTileDef, StatTileDef] {
    return [
      { label: 'Current State', value: this.state, color: this.state === 'CLOSED' ? '#10b981' : this.state === 'HALF_OPEN' ? '#f59e0b' : '#ef4444' },
      { label: 'Total Trips', value: `${this.tripCount} times`, trend: this.tripCount === 0 ? 'neutral' : 'up', color: '#38bdf8' },
      { label: 'Fast-Failed Rejections', value: this.fastFailedCount, color: this.fastFailedCount > 0 ? '#ef4444' : '#10b981' },
    ];
  }

  getState(): any {
    return { state: this.state, trips: this.tripCount, failures: this.consecutiveFailures };
  }

  applyFailure(actionId: string): void {
    if (actionId === 'crash_downstream') {
      this.downstreamBroken = !this.downstreamBroken;
    }
  }
}

export const circuitBreakerDefinition: SimulatorDefinition = {
  id: 'circuit-breaker',
  title: 'Circuit Breaker State Machine',
  description: 'Track transitions between CLOSED, OPEN, and HALF-OPEN states to protect systems against cascading cascading failures.',
  linkedLessonId: 'circuit-breaker-pattern',
  defaultRate: 15,
  maxRate: 40,
  modes: [
    {
      id: 'standard_fowler',
      label: 'Standard Breaker (Fowler)',
      explanation: 'Monitors downstream error rate. Trips OPEN upon consecutive failures, fast-failing traffic to allow recovery before testing via HALF-OPEN.',
    },
    {
      id: 'adaptive',
      label: 'Adaptive Percentile Breaker',
      explanation: 'Trips based on rolling P99 latency percentiles rather than strict HTTP status errors.',
    },
  ],
  params: [
    { id: 'failureThreshold', label: 'Failure Threshold', type: 'stepper', min: 2, max: 10, default: 5, unit: 'errors' },
    { id: 'resetTimeout', label: 'Open Timeout Duration', type: 'stepper', min: 1000, max: 10000, step: 1000, default: 3000, unit: 'ms' },
  ],
  outcomes: BREAKER_OUTCOMES,
  failureActions: [
    { id: 'crash_downstream', label: 'Toggle Downstream Service Outage (Trigger Open)', apply: (s) => {} },
  ],
  createLogic: () => new CircuitBreakerLogic(),
};
