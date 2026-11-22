/**
 * Pure TypeScript TrafficGenerator with fixed-timestep RAF accumulator loop.
 * Guarantees precise request counts without drift on slow or throttled frames.
 * Supports continuous auto-streaming, rate adjustments, pause/resume, and burst generator.
 */

import { RequestPayload } from './types';

// Fast deterministic LCG PRNG for reproducible simulations
export class SimplePrng {
  private state: number;

  constructor(seed = 1337) {
    this.state = seed % 2147483647;
    if (this.state <= 0) this.state += 2147483646;
  }

  next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return (this.state - 1) / 2147483646;
  }
}

export interface TrafficGeneratorOptions {
  ratePerSec: number;
  maxRate?: number;
  bursty?: boolean;
  seed?: number;
  onRequest: (req: RequestPayload, now: number) => void;
  onTick?: (dtMs: number, now: number) => void;
}

export class TrafficGenerator {
  private ratePerSec: number;
  private maxRate: number;
  private bursty: boolean;
  private isRunning: boolean = false;
  private isPaused: boolean = false;

  private accumulatorSec: number = 0;
  private lastTimestamp: number = 0;
  private nextRequestId: number = 1;
  private prng: SimplePrng;

  // Bursty mode phase tracking
  // Bursty cycles between quiet gap (0.2x rate) and short bursts (3x-5x rate)
  private burstPhaseTimerSec: number = 0;
  private isBurstActive: boolean = false;

  private onRequest: (req: RequestPayload, now: number) => void;
  private onTick?: (dtMs: number, now: number) => void;
  private rafHandle: number | null = null;

  constructor(options: TrafficGeneratorOptions) {
    this.ratePerSec = Math.max(0.1, options.ratePerSec);
    this.maxRate = options.maxRate || 200;
    this.bursty = options.bursty || false;
    this.prng = new SimplePrng(options.seed || 42);
    this.onRequest = options.onRequest;
    this.onTick = options.onTick;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.lastTimestamp = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.scheduleNextFrame();
  }

  pause(): void {
    this.isPaused = true;
    if (this.rafHandle !== null) {
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.rafHandle);
      }
      this.rafHandle = null;
    }
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }

  resume(): void {
    if (!this.isRunning) {
      this.start();
      return;
    }
    if (!this.isPaused) return;
    this.isPaused = false;
    this.lastTimestamp = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.scheduleNextFrame();
  }

  stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    if (this.rafHandle !== null) {
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.rafHandle);
      }
      this.rafHandle = null;
    }
  }

  reset(): void {
    this.accumulatorSec = 0;
    this.nextRequestId = 1;
    this.burstPhaseTimerSec = 0;
    this.isBurstActive = false;
    this.lastTimestamp = typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  setRate(rate: number): void {
    this.ratePerSec = Math.min(this.maxRate, Math.max(0.1, rate));
  }

  getRate(): number {
    return this.ratePerSec;
  }

  setBursty(bursty: boolean): void {
    this.bursty = bursty;
    this.burstPhaseTimerSec = 0;
    this.isBurstActive = false;
  }

  isBursty(): boolean {
    return this.bursty;
  }

  isActive(): boolean {
    return this.isRunning && !this.isPaused;
  }

  /**
   * Deterministic manual stepping for unit tests and headless simulations.
   */
  step(deltaMs: number, nowMs?: number): number {
    if (this.isPaused) {
      return 0;
    }
    const now = nowMs !== undefined ? nowMs : (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const dtSec = Math.min(1.0, deltaMs / 1000); // Guard against multi-second pauses

    let effectiveRate = this.ratePerSec;

    if (this.bursty) {
      this.burstPhaseTimerSec += dtSec;
      // Cycle: 2.0s quiet, then 0.6s burst
      if (!this.isBurstActive && this.burstPhaseTimerSec >= 2.0) {
        this.isBurstActive = true;
        this.burstPhaseTimerSec = 0;
      } else if (this.isBurstActive && this.burstPhaseTimerSec >= 0.6) {
        this.isBurstActive = false;
        this.burstPhaseTimerSec = 0;
      }
      // When burst is active: 4x rate; when quiet: 0.25x rate (balanced long-term average)
      effectiveRate = this.isBurstActive ? this.ratePerSec * 4.0 : this.ratePerSec * 0.25;
    }

    if (this.onTick) {
      this.onTick(deltaMs, now);
    }

    const intervalPerReqSec = 1.0 / effectiveRate;
    this.accumulatorSec += dtSec;

    let generatedCount = 0;
    // Drain accumulator by firing requests
    while (this.accumulatorSec >= intervalPerReqSec && generatedCount < 1000) {
      this.accumulatorSec -= intervalPerReqSec;
      generatedCount++;

      const payload: RequestPayload = {
        id: this.nextRequestId++,
        key: `key_${Math.floor(this.prng.next() * 10000)}`,
        timestamp: now,
      };

      this.onRequest(payload, now);
    }

    // Prevent spiral of death accumulator explosion
    if (this.accumulatorSec > intervalPerReqSec * 2) {
      this.accumulatorSec = intervalPerReqSec;
    }

    return generatedCount;
  }

  private loop = (timestamp: number): void => {
    if (!this.isRunning || this.isPaused) return;

    const deltaMs = Math.max(0, timestamp - this.lastTimestamp);
    this.lastTimestamp = timestamp;

    this.step(deltaMs, timestamp);
    this.scheduleNextFrame();
  };

  private scheduleNextFrame(): void {
    if (typeof requestAnimationFrame !== 'undefined') {
      this.rafHandle = requestAnimationFrame(this.loop);
    } else {
      // Fallback for Node test environments
      this.rafHandle = setTimeout(() => this.loop(Date.now()), 16) as any;
    }
  }
}
