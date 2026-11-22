import { SimulatorDefinition, SimulatorLogic, OutcomeDef, StatTileDef, RequestPayload } from '../engine/types';

export const RETRY_OUTCOMES: OutcomeDef[] = [
  { id: 'first_try_ok', label: 'First Attempt Succeeded (200 OK)', color: '#10b981', shape: 'circle' },
  { id: 'retry_success', label: 'Recovered After Retry Attempt', color: '#3b82f6', shape: 'square' },
  { id: 'retries_exhausted', label: 'Max Retries Exhausted (500 Error)', color: '#ef4444', shape: 'cross' },
  { id: 'storm_spike', label: 'Retry Storm / Thundering Herd Wave', color: '#f59e0b', shape: 'triangle' },
];

export class RetryStrategiesLogic implements SimulatorLogic {
  private mode: string = 'full_jitter';
  private logicalReqs: number = 0;
  private wireAttempts: number = 0;
  private recoveredRetries: number = 0;
  private permanentFailures: number = 0;
  private downstreamDegraded: boolean = false;

  init(params: Record<string, any>, modeId: string): any {
    this.mode = modeId;
    this.reset();
    return this.getState();
  }

  reset(): void {
    this.logicalReqs = 0;
    this.wireAttempts = 0;
    this.recoveredRetries = 0;
    this.permanentFailures = 0;
    this.downstreamDegraded = false;
  }

  onRequest(req: RequestPayload, now: number): OutcomeDef {
    this.logicalReqs++;
    this.wireAttempts++;

    const isFlaky = this.downstreamDegraded || (req.id % 5 === 0);

    if (!isFlaky) {
      return RETRY_OUTCOMES[0]; // first try ok
    }

    if (this.mode === 'no_retry') {
      this.permanentFailures++;
      return RETRY_OUTCOMES[2]; // fail immediately
    }

    // Try up to 3 retries
    const maxRetries = 3;
    let success = false;
    for (let r = 1; r <= maxRetries; r++) {
      this.wireAttempts++;
      if (Math.random() > 0.4) {
        success = true;
        this.recoveredRetries++;
        break;
      }
    }

    if (this.mode === 'retry_storm') {
      return RETRY_OUTCOMES[3]; // storm wave
    }

    if (success) {
      return RETRY_OUTCOMES[1];
    } else {
      this.permanentFailures++;
      return RETRY_OUTCOMES[2];
    }
  }

  tick(dtMs: number, now: number): void {}

  getCenterMetric(): { label: string; value: string | number; percentage?: number } {
    const amp = this.logicalReqs > 0 ? (this.wireAttempts / this.logicalReqs).toFixed(2) : '1.00';
    const pct = Math.min(100, Math.round((Number(amp) / 4) * 100));
    return {
      label: 'Traffic Multiplier',
      value: `${amp}x`,
      percentage: pct,
    };
  }

  getStats(): [StatTileDef, StatTileDef, StatTileDef] {
    const amp = this.logicalReqs > 0 ? (this.wireAttempts / this.logicalReqs).toFixed(2) : '1.00';
    return [
      { label: 'Logical Inbound', value: this.logicalReqs, color: '#38bdf8' },
      { label: 'Wire Requests Sent', value: `${this.wireAttempts} calls`, color: '#f59e0b' },
      { label: 'Traffic Amplification', value: `${amp}x`, trend: Number(amp) < 1.5 ? 'down' : 'up', color: Number(amp) < 1.5 ? '#10b981' : '#ef4444' },
    ];
  }

  getState(): any {
    return { logical: this.logicalReqs, wire: this.wireAttempts, recovered: this.recoveredRetries };
  }

  applyFailure(actionId: string): void {
    if (actionId === 'toggle_degradation') {
      this.downstreamDegraded = !this.downstreamDegraded;
    }
  }
}

export const retryStrategiesDefinition: SimulatorDefinition = {
  id: 'retry-strategies',
  title: 'Retry Strategies & Backoff Storms',
  description: 'Simulate exponential backoff, full jitter, fixed delays, and how uncoordinated retries trigger catastrophic retry storms.',
  linkedLessonId: 'retry-backoff',
  defaultRate: 15,
  maxRate: 50,
  modes: [
    {
      id: 'full_jitter',
      label: 'Exponential Backoff + Full Jitter',
      explanation: 'sleep = random_between(0, min(cap, base * 2^attempt)). De-correlates retry arrival, completely spreading out peak server load.',
    },
    {
      id: 'exponential_backoff',
      label: 'Exponential Backoff (No Jitter)',
      explanation: 'Doubles delay after every failure. Still causes synchronous wave pulses as synchronized clients wake up simultaneously.',
    },
    {
      id: 'fixed_delay',
      label: 'Fixed Delay',
      explanation: 'Retries every fixed N milliseconds. Highest risk of pounding an already struggling database.',
    },
    {
      id: 'no_retry',
      label: 'Fail-Fast (No Retry)',
      explanation: 'Zero retries. Protects backend services completely at the cost of bubbling transient glitches to end-users.',
    },
    {
      id: 'retry_storm',
      label: 'Retry Storm Cascade',
      explanation: 'Clients bombard an overloaded downstream service with aggressive retries, multiplying traffic by 3x-4x until total crash.',
    },
  ],
  params: [],
  outcomes: RETRY_OUTCOMES,
  failureActions: [
    { id: 'toggle_degradation', label: 'Toggle Downstream Service Flakiness (50% Loss)', apply: (s) => {} },
  ],
  createLogic: () => new RetryStrategiesLogic(),
};
