import { describe, it, expect } from 'vitest';
import { SIMULATOR_REGISTRY } from '../simulators/registry';
import { OutcomeShape } from '../simulators/engine/types';

const VALID_SHAPES: OutcomeShape[] = ['circle', 'square', 'triangle', 'diamond', 'cross', 'star', 'slash'];

describe('Universal Simulator Registry Definition of Done', () => {
  it('contains all 18 full-fidelity simulation definitions', () => {
    expect(SIMULATOR_REGISTRY.length).toBe(18);
  });

  SIMULATOR_REGISTRY.forEach((def) => {
    describe(`Simulator: ${def.id} (${def.title})`, () => {
      it('has valid metadata and rate boundaries', () => {
        expect(def.id).toBeTruthy();
        expect(def.title).toBeTruthy();
        expect(def.description).toBeTruthy();
        expect(def.defaultRate).toBeGreaterThan(0);
        expect(def.maxRate).toBeGreaterThanOrEqual(def.defaultRate);
      });

      it('has at least one mode with plain-language explanation', () => {
        expect(def.modes.length).toBeGreaterThan(0);
        def.modes.forEach((mode) => {
          expect(mode.id).toBeTruthy();
          expect(mode.label).toBeTruthy();
          expect(mode.explanation).toBeTruthy();
          expect(mode.explanation.length).toBeGreaterThan(15);
        });
      });

      it('has accessible outcomes with color AND distinct shape/pattern', () => {
        expect(def.outcomes.length).toBeGreaterThan(0);
        def.outcomes.forEach((outcome) => {
          expect(outcome.id).toBeTruthy();
          expect(outcome.label).toBeTruthy();
          expect(outcome.color).toMatch(/^#|rgb/);
          expect(VALID_SHAPES).toContain(outcome.shape);
        });
      });

      it('instantiates logic class and satisfies pure interface contracts', () => {
        const logic = def.createLogic();
        expect(logic).toBeDefined();

        // Test init
        const firstModeId = def.modes[0].id;
        logic.init({}, firstModeId);

        // Test center metric
        const center = logic.getCenterMetric();
        expect(center).toHaveProperty('label');
        expect(center).toHaveProperty('value');

        // Test exactly 3 stat tiles (Hard Requirement)
        const stats = logic.getStats();
        expect(Array.isArray(stats)).toBe(true);
        expect(stats.length).toBe(3);
        stats.forEach((tile) => {
          expect(tile).toHaveProperty('label');
          expect(tile).toHaveProperty('value');
        });

        // Test auto-streaming request evaluation
        const outcome = logic.onRequest({ id: 1, timestamp: 1000 }, 1000);
        expect(outcome).toBeDefined();
        expect(outcome.id).toBeTruthy();
        expect(VALID_SHAPES).toContain(outcome.shape);

        // Test tick & reset
        logic.tick(100, 1100);
        logic.reset();
        const postResetStats = logic.getStats();
        expect(postResetStats.length).toBe(3);
      });
    });
  });
});
