import { describe, it, expect, vi } from 'vitest';
import { TrafficGenerator, SimplePrng } from '../simulators/engine/TrafficGenerator';

describe('TrafficGenerator Pure Engine', () => {
  it('deterministic PRNG generates reproducible sequence given a seed', () => {
    const prng1 = new SimplePrng(12345);
    const prng2 = new SimplePrng(12345);

    const seq1 = [prng1.next(), prng1.next(), prng1.next(), prng1.next()];
    const seq2 = [prng2.next(), prng2.next(), prng2.next(), prng2.next()];

    expect(seq1).toEqual(seq2);
  });

  it('generates expected request count at steady rate', () => {
    let requestsFired = 0;
    const generator = new TrafficGenerator({
      ratePerSec: 10,
      maxRate: 50,
      bursty: false,
      onRequest: () => {
        requestsFired++;
      },
    });

    // Step 1000ms in 100ms chunks
    let currentTime = 1000;
    for (let i = 0; i < 10; i++) {
      currentTime += 100;
      generator.step(100, currentTime);
    }

    // At 10 req/s over 1000ms, should fire 10 requests (+/- 1 for integer discretization)
    expect(requestsFired).toBeGreaterThanOrEqual(9);
    expect(requestsFired).toBeLessThanOrEqual(11);
  });

  it('dynamically adapts request rate mid-stream without restarting', () => {
    let requestsFired = 0;
    const generator = new TrafficGenerator({
      ratePerSec: 5,
      maxRate: 100,
      bursty: false,
      onRequest: () => {
        requestsFired++;
      },
    });

    let currentTime = 1000;
    // Step 1000ms at 5 req/s
    for (let i = 0; i < 10; i++) {
      currentTime += 100;
      generator.step(100, currentTime);
    }
    const countFirstSec = requestsFired;
    expect(countFirstSec).toBeGreaterThanOrEqual(4);
    expect(countFirstSec).toBeLessThanOrEqual(6);

    // Increase rate to 30 req/s
    generator.setRate(30);

    // Step another 1000ms at 30 req/s
    for (let i = 0; i < 10; i++) {
      currentTime += 100;
      generator.step(100, currentTime);
    }
    const countSecondSec = requestsFired - countFirstSec;
    expect(countSecondSec).toBeGreaterThanOrEqual(28);
    expect(countSecondSec).toBeLessThanOrEqual(32);
  });

  it('pauses and freezes traffic generation', () => {
    let requestsFired = 0;
    const generator = new TrafficGenerator({
      ratePerSec: 20,
      maxRate: 100,
      bursty: false,
      onRequest: () => {
        requestsFired++;
      },
    });

    let currentTime = 1000;
    generator.pause();
    expect(generator.getIsPaused()).toBe(true);

    for (let i = 0; i < 10; i++) {
      currentTime += 100;
      generator.step(100, currentTime);
    }

    expect(requestsFired).toBe(0);

    // Resume
    generator.resume();
    expect(generator.getIsPaused()).toBe(false);

    for (let i = 0; i < 10; i++) {
      currentTime += 100;
      generator.step(100, currentTime);
    }

    expect(requestsFired).toBeGreaterThanOrEqual(18);
  });

  it('handles bursty traffic cycles', () => {
    let requestsFired = 0;
    const generator = new TrafficGenerator({
      ratePerSec: 20,
      maxRate: 100,
      bursty: true,
      onRequest: () => {
        requestsFired++;
      },
    });

    let currentTime = 1000;
    // Step through 2.6s (quiet period + burst period)
    for (let i = 0; i < 26; i++) {
      currentTime += 100;
      generator.step(100, currentTime);
    }

    expect(requestsFired).toBeGreaterThan(0);
  });
});
