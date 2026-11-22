/**
 * SuperMemo-2 (SM-2) Spaced Repetition Scheduling Engine.
 * Pure deterministic mathematical function.
 *
 * Ratings:
 * 0: Again (Complete blackout, reset reps to 0, interval 1 day)
 * 1: Hard (Significant effort, interval scaled by 1.2x)
 * 2: Good (Correct recall with slight hesitation)
 * 3: Easy (Immediate perfect recall, bonus interval)
 */

export interface Sm2Input {
  rating: 0 | 1 | 2 | 3;
  repetitions: number;
  interval: number; // in days
  easeFactor: number; // default starts at 2.5
}

export interface Sm2Result {
  repetitions: number;
  interval: number; // in days
  easeFactor: number;
  dueDate: number; // epoch ms
  nextIntervalLabel: string;
}

export function calculateSm2(input: Sm2Input, nowEpochMs = Date.now()): Sm2Result {
  const { rating, repetitions: prevReps, interval: prevInterval, easeFactor: prevEf } = input;

  let nextReps = prevReps;
  let nextInterval = prevInterval;
  let nextEf = prevEf;

  if (rating === 0) {
    // Again: Failure, restart learning phase
    nextReps = 0;
    nextInterval = 1;
  } else {
    // Success (Hard, Good, Easy)
    if (nextReps === 0) {
      nextInterval = 1;
    } else if (nextReps === 1) {
      nextInterval = 6;
    } else {
      nextInterval = Math.round(prevInterval * prevEf);
    }
    nextReps += 1;
  }

  // Quality score mapped to standard 0-5 SM2 scale:
  // Again -> 1, Hard -> 3, Good -> 4, Easy -> 5
  const qualityMap: Record<number, number> = {
    0: 1,
    1: 3,
    2: 4,
    3: 5,
  };
  const q = qualityMap[rating];

  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const deltaEf = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  nextEf = Math.max(1.3, Number((prevEf + deltaEf).toFixed(2)));

  // If rating was "Hard" (q=3), dampen interval slightly
  if (rating === 1 && nextInterval > 1) {
    nextInterval = Math.max(1, Math.round(nextInterval * 0.8));
  }
  // If rating was "Easy" (q=5), add bonus 1.3x multiplier
  if (rating === 3 && nextInterval > 1) {
    nextInterval = Math.round(nextInterval * 1.3);
  }

  const oneDayMs = 24 * 60 * 60 * 1000;
  const dueDate = nowEpochMs + nextInterval * oneDayMs;

  const nextIntervalLabel = nextInterval === 1 ? '1 day' : `${nextInterval} days`;

  return {
    repetitions: nextReps,
    interval: nextInterval,
    easeFactor: nextEf,
    dueDate,
    nextIntervalLabel,
  };
}
