import { describe, it, expect } from 'vitest';
import type { LldProgressRecord, LldDesignRecord } from '../core/types/lld';

function transitionProgress(
  current: LldProgressRecord | undefined,
  action:
    | { type: 'USE_HINT' }
    | { type: 'VIEW_REFERENCE'; timestamp: string }
    | { type: 'SUBMIT'; timestamp: string },
  problemId: string
): LldProgressRecord {
  const record: LldProgressRecord = current
    ? { ...current }
    : { problemId, status: 'in-progress', hintsUsed: 0 };

  if (action.type === 'USE_HINT') {
    record.hintsUsed += 1;
    if (record.status === 'not-started') record.status = 'in-progress';
  } else if (action.type === 'VIEW_REFERENCE') {
    record.referenceViewedAt = action.timestamp;
    if (record.status === 'not-started') record.status = 'in-progress';
  } else if (action.type === 'SUBMIT') {
    record.status = 'completed';
    record.completedAt = action.timestamp;
  }

  return record;
}

describe('lldProgress transitions', () => {
  it('correctly increments hints and transitions status to in-progress', () => {
    let prog = transitionProgress(undefined, { type: 'USE_HINT' }, 'parking-lot');
    expect(prog.problemId).toBe('parking-lot');
    expect(prog.hintsUsed).toBe(1);
    expect(prog.status).toBe('in-progress');

    prog = transitionProgress(prog, { type: 'USE_HINT' }, 'parking-lot');
    expect(prog.hintsUsed).toBe(2);
  });

  it('records reference unlock timestamp', () => {
    const time = new Date().toISOString();
    const prog = transitionProgress(undefined, { type: 'VIEW_REFERENCE', timestamp: time }, 'vending-machine');
    expect(prog.referenceViewedAt).toBe(time);
    expect(prog.status).toBe('in-progress');
  });

  it('marks problem as completed upon submission with timestamp', () => {
    const time = new Date().toISOString();
    let prog: LldProgressRecord = {
      problemId: 'splitwise',
      status: 'in-progress',
      hintsUsed: 3,
    };

    prog = transitionProgress(prog, { type: 'SUBMIT', timestamp: time }, 'splitwise');
    expect(prog.status).toBe('completed');
    expect(prog.completedAt).toBe(time);
    expect(prog.hintsUsed).toBe(3);
  });
});
