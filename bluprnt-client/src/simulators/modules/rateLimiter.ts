import { SimulatorDefinition, SimulatorLogic, OutcomeDef, StatTileDef, RequestPayload } from '../engine/types';

export const RATE_LIMITER_OUTCOMES: OutcomeDef[] = [
  { id: 'allowed', label: 'Allowed (200 OK)', color: '#10b981', shape: 'circle' },
  { id: 'throttled', label: 'Throttled (429 Too Many Requests)', color: '#f43f5e', shape: 'cross' },
  { id: 'queued', label: 'Queued (Delayed Leak)', color: '#f59e0b', shape: 'square' },
];

export class RateLimiterLogic implements SimulatorLogic {
  private params: Record<string, any> = {};
  private mode: string = 'token_bucket';
  private totalReqs: number = 0;
  private allowedReqs: number = 0;
  private throttledReqs: number = 0;
  private queuedReqs: number = 0;

  // Token Bucket State
  private tokens: number = 20;
  private maxTokens: number = 20;
  private refillRate: number = 10; // tokens/sec

  // Leaky Bucket State
  private queue: number[] = [];
  private leakRate: number = 10; // leaks/sec
  private queueCapacity: number = 25;

  // Fixed Window State
  private windowSizeMs: number = 1000;
  private windowStartMs: number = 0;
  private windowCount: number = 0;
  private windowLimit: number = 15;

  // Sliding Window Log State
  private log: number[] = [];
  private slidingWindowLimit: number = 15;

  // Sliding Counter State
  private prevWindowCount: number = 0;
  private currWindowCount: number = 0;
  private currWindowStart: number = 0;

  init(params: Record<string, any>, modeId: string): any {
    this.params = { ...params };
    this.mode = modeId;
    this.reset();
    return this.getState();
  }

  reset(): void {
    this.totalReqs = 0;
    this.allowedReqs = 0;
    this.throttledReqs = 0;
    this.queuedReqs = 0;

    this.maxTokens = Number(this.params.capacity || 25);
    this.tokens = this.maxTokens;
    this.refillRate = Number(this.params.refillRate || 12);

    this.queue = [];
    this.queueCapacity = Number(this.params.queueCapacity || 20);
    this.leakRate = Number(this.params.leakRate || 10);

    const now = Date.now();
    this.windowStartMs = now;
    this.windowCount = 0;
    this.windowLimit = Number(this.params.windowLimit || 15);

    this.log = [];
    this.slidingWindowLimit = Number(this.params.windowLimit || 15);

    this.currWindowStart = now;
    this.prevWindowCount = 0;
    this.currWindowCount = 0;
  }

  onRequest(req: RequestPayload, now: number): OutcomeDef {
    this.totalReqs++;

    if (this.mode === 'token_bucket') {
      if (this.tokens >= 1) {
        this.tokens -= 1;
        this.allowedReqs++;
        return RATE_LIMITER_OUTCOMES[0]; // allowed
      } else {
        this.throttledReqs++;
        return RATE_LIMITER_OUTCOMES[1]; // throttled
      }
    }

    if (this.mode === 'leaky_bucket') {
      if (this.queue.length < this.queueCapacity) {
        this.queue.push(now);
        this.queuedReqs++;
        this.allowedReqs++;
        return RATE_LIMITER_OUTCOMES[2]; // queued
      } else {
        this.throttledReqs++;
        return RATE_LIMITER_OUTCOMES[1]; // throttled
      }
    }

    if (this.mode === 'fixed_window') {
      if (now - this.windowStartMs >= this.windowSizeMs) {
        this.windowStartMs = now;
        this.windowCount = 0;
      }
      if (this.windowCount < this.windowLimit) {
        this.windowCount++;
        this.allowedReqs++;
        return RATE_LIMITER_OUTCOMES[0];
      } else {
        this.throttledReqs++;
        return RATE_LIMITER_OUTCOMES[1];
      }
    }

    if (this.mode === 'sliding_log') {
      const windowCutoff = now - this.windowSizeMs;
      this.log = this.log.filter((t) => t > windowCutoff);
      if (this.log.length < this.slidingWindowLimit) {
        this.log.push(now);
        this.allowedReqs++;
        return RATE_LIMITER_OUTCOMES[0];
      } else {
        this.throttledReqs++;
        return RATE_LIMITER_OUTCOMES[1];
      }
    }

    if (this.mode === 'sliding_counter') {
      const elapsed = now - this.currWindowStart;
      if (elapsed >= this.windowSizeMs) {
        this.prevWindowCount = this.currWindowCount;
        this.currWindowCount = 0;
        this.currWindowStart = now;
      }
      const weight = Math.max(0, 1 - (now - this.currWindowStart) / this.windowSizeMs);
      const estimatedCount = this.prevWindowCount * weight + this.currWindowCount;

      if (estimatedCount < this.windowLimit) {
        this.currWindowCount++;
        this.allowedReqs++;
        return RATE_LIMITER_OUTCOMES[0];
      } else {
        this.throttledReqs++;
        return RATE_LIMITER_OUTCOMES[1];
      }
    }

    this.allowedReqs++;
    return RATE_LIMITER_OUTCOMES[0];
  }

  tick(dtMs: number, now: number): void {
    const dtSec = dtMs / 1000;

    // Token bucket refill
    if (this.mode === 'token_bucket') {
      this.tokens = Math.min(this.maxTokens, this.tokens + this.refillRate * dtSec);
    }

    // Leaky bucket drain
    if (this.mode === 'leaky_bucket') {
      const toDrain = Math.floor(this.leakRate * dtSec);
      if (toDrain > 0 && this.queue.length > 0) {
        this.queue.splice(0, Math.min(toDrain, this.queue.length));
      }
    }
  }

  getCenterMetric(): { label: string; value: string | number; percentage?: number } {
    if (this.mode === 'token_bucket') {
      const pct = Math.round((this.tokens / this.maxTokens) * 100);
      return {
        label: 'Tokens Left',
        value: `${Math.floor(this.tokens)} / ${this.maxTokens}`,
        percentage: pct,
      };
    }
    if (this.mode === 'leaky_bucket') {
      const pct = Math.round((this.queue.length / this.queueCapacity) * 100);
      return {
        label: 'Queue Depth',
        value: `${this.queue.length} / ${this.queueCapacity}`,
        percentage: pct,
      };
    }
    if (this.mode === 'fixed_window') {
      const pct = Math.round((this.windowCount / this.windowLimit) * 100);
      return {
        label: 'Window Used',
        value: `${this.windowCount} / ${this.windowLimit}`,
        percentage: pct,
      };
    }
    if (this.mode === 'sliding_log') {
      const pct = Math.round((this.log.length / this.slidingWindowLimit) * 100);
      return {
        label: 'Log Size',
        value: `${this.log.length} / ${this.slidingWindowLimit}`,
        percentage: pct,
      };
    }
    // sliding_counter
    const pct = Math.min(100, Math.round((this.currWindowCount / this.windowLimit) * 100));
    return {
      label: 'Counter Est.',
      value: `${this.currWindowCount} reqs`,
      percentage: pct,
    };
  }

  getStats(): [StatTileDef, StatTileDef, StatTileDef] {
    const allowedPct = this.totalReqs > 0 ? Math.round((this.allowedReqs / this.totalReqs) * 100) : 100;
    const throttledPct = this.totalReqs > 0 ? Math.round((this.throttledReqs / this.totalReqs) * 100) : 0;

    return [
      { label: 'Total Inbound', value: this.totalReqs, color: '#38bdf8' },
      { label: 'Pass Rate', value: `${allowedPct}%`, trend: allowedPct >= 90 ? 'up' : 'down', color: '#10b981' },
      { label: 'Throttled (429)', value: `${throttledPct}%`, trend: throttledPct > 10 ? 'up' : 'neutral', color: '#f43f5e' },
    ];
  }

  getState(): any {
    return {
      tokens: this.tokens,
      queue: this.queue.length,
      allowed: this.allowedReqs,
      throttled: this.throttledReqs,
    };
  }

  applyFailure(actionId: string): void {
    if (actionId === 'drain_tokens') {
      this.tokens = 0;
    } else if (actionId === 'fill_queue') {
      this.queue = Array(this.queueCapacity).fill(Date.now());
    }
  }
}

export const rateLimiterDefinition: SimulatorDefinition = {
  id: 'rate-limiter',
  title: 'Rate Limiter Architecture',
  description: 'Inspect token buckets, leaky queues, fixed windows, sliding logs, and sliding counters under continuous load.',
  linkedLessonId: 'rate-limiting',
  defaultRate: 15,
  maxRate: 50,
  modes: [
    {
      id: 'token_bucket',
      label: 'Token Bucket',
      explanation: 'Tokens fill at a steady rate. Requests consume a token instantly; bursts are allowed up to bucket capacity.',
      params: [
        { id: 'capacity', label: 'Bucket Capacity', type: 'stepper', min: 5, max: 100, default: 25, unit: 'tok' },
        { id: 'refillRate', label: 'Refill Rate', type: 'slider', min: 1, max: 40, default: 12, unit: 't/s' },
      ],
    },
    {
      id: 'leaky_bucket',
      label: 'Leaky Bucket',
      explanation: 'Requests enter a FIFO queue and leak out at a constant smooth rate. Overflow requests are rejected.',
      params: [
        { id: 'queueCapacity', label: 'Queue Capacity', type: 'stepper', min: 5, max: 50, default: 20, unit: 'reqs' },
        { id: 'leakRate', label: 'Leak Rate', type: 'slider', min: 2, max: 30, default: 10, unit: 'r/s' },
      ],
    },
    {
      id: 'fixed_window',
      label: 'Fixed Window',
      explanation: 'Counts requests in fixed 1-second time windows. Susceptible to 2x boundary bursts at edge transitions.',
      params: [
        { id: 'windowLimit', label: 'Window Limit', type: 'stepper', min: 5, max: 50, default: 15, unit: 'req/w' },
      ],
    },
    {
      id: 'sliding_log',
      label: 'Sliding Window Log',
      explanation: 'Maintains exact millisecond timestamps of every request in memory. Completely accurate, high memory cost.',
      params: [
        { id: 'windowLimit', label: 'Window Limit', type: 'stepper', min: 5, max: 50, default: 15, unit: 'req/w' },
      ],
    },
    {
      id: 'sliding_counter',
      label: 'Sliding Counter',
      explanation: 'Approximates rolling window by weighting previous window + current window. Memory-efficient and smooth.',
      params: [
        { id: 'windowLimit', label: 'Window Limit', type: 'stepper', min: 5, max: 50, default: 15, unit: 'req/w' },
      ],
    },
  ],
  params: [],
  outcomes: RATE_LIMITER_OUTCOMES,
  failureActions: [
    { id: 'drain_tokens', label: 'Drain All Tokens', apply: (s) => {} },
    { id: 'fill_queue', label: 'Saturate Leaky Queue', apply: (s) => {} },
  ],
  createLogic: () => new RateLimiterLogic(),
};
