import { describe, it, expect } from 'vitest';
import { calculateSm2 } from '../core/algorithms/sm2';

describe('SuperMemo-2 (SM-2) Spaced Repetition Engine', () => {
  const BASE_TIME = 1700000000000;
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  it('resets repetitions and interval on failure ("Again" rating 0)', () => {
    const prev = { rating: 0 as const, repetitions: 4, interval: 25, easeFactor: 2.5 };
    const res = calculateSm2(prev, BASE_TIME);

    expect(res.repetitions).toBe(0);
    expect(res.interval).toBe(1);
    expect(res.dueDate).toBe(BASE_TIME + ONE_DAY_MS);
    expect(res.nextIntervalLabel).toBe('1 day');
  });

  it('progresses first successful review to 1 day and second review to 6 days', () => {
    // First successful review (Good rating 2)
    const firstReview = calculateSm2({ rating: 2, repetitions: 0, interval: 1, easeFactor: 2.5 }, BASE_TIME);
    expect(firstReview.repetitions).toBe(1);
    expect(firstReview.interval).toBe(1);

    // Second review
    const secondReview = calculateSm2(
      { rating: 2, repetitions: firstReview.repetitions, interval: firstReview.interval, easeFactor: firstReview.easeFactor },
      BASE_TIME
    );
    expect(secondReview.repetitions).toBe(2);
    expect(secondReview.interval).toBe(6);
  });

  it('multiplies interval by ease factor on subsequent successful reviews', () => {
    // 3rd review: interval = round(6 * 2.5) = 15 days
    const res = calculateSm2({ rating: 2, repetitions: 2, interval: 6, easeFactor: 2.5 }, BASE_TIME);
    expect(res.repetitions).toBe(3);
    expect(res.interval).toBe(15);
  });

  it('rewards "Easy" rating with increased ease factor and bonus multiplier', () => {
    const res = calculateSm2({ rating: 3, repetitions: 2, interval: 6, easeFactor: 2.5 }, BASE_TIME);
    expect(res.easeFactor).toBeGreaterThan(2.5);
    // Base interval = 15, Easy bonus 1.3x = round(15 * 1.3) = 20 days
    expect(res.interval).toBeGreaterThanOrEqual(19);
  });

  it('never allows ease factor to drop below minimum bound of 1.3', () => {
    let ef = 1.35;
    for (let i = 0; i < 5; i++) {
      const res = calculateSm2({ rating: 1, repetitions: 0, interval: 1, easeFactor: ef }, BASE_TIME);
      ef = res.easeFactor;
    }
    expect(ef).toBeGreaterThanOrEqual(1.3);
  });
});
