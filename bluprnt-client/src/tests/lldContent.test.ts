import { describe, it, expect } from 'vitest';
import { validateLldDiagram } from '../core/lld/diagramValidation';
import type { LldProblem, LldPattern } from '../core/types/lld';
import problemsData from '../../public/content/lld-problems.json';
import patternsData from '../../public/content/lld-patterns.json';

describe('lldContent', () => {
  const problems = problemsData as unknown as LldProblem[];
  const patterns = patternsData as unknown as LldPattern[];

  const problemIds = new Set(problems.map((p) => p.id));
  const patternIds = new Set(patterns.map((p) => p.id));

  it('contains all 18 target problems with full required attributes', () => {
    expect(problems.length).toBeGreaterThanOrEqual(18);
    for (const p of problems) {
      expect(p.id).toBeTruthy();
      expect(p.title).toBeTruthy();
      expect(['easy', 'medium', 'hard']).toContain(p.difficulty);
      expect(p.requirements.length).toBeGreaterThanOrEqual(3);
      expect(p.constraints.length).toBeGreaterThanOrEqual(1);
      expect(p.hints.length).toBeGreaterThanOrEqual(3);
      expect(p.keyEntities.length).toBeGreaterThanOrEqual(3);
      expect(p.selfReviewChecklist.length).toBeGreaterThanOrEqual(3);
      expect(p.referenceNotes).toBeTruthy();
      expect(p.referenceDiagram).toBeDefined();
    }
  });

  it('contains at least 8 seed patterns with full required attributes', () => {
    expect(patterns.length).toBeGreaterThanOrEqual(8);
    for (const pat of patterns) {
      expect(pat.id).toBeTruthy();
      expect(pat.name).toBeTruthy();
      expect(['creational', 'structural', 'behavioral']).toContain(pat.category);
      expect(pat.intent).toBeTruthy();
      expect(pat.problemItSolves).toBeTruthy();
      expect(pat.whenToUse.length).toBeGreaterThan(0);
      expect(pat.whenNotToUse.length).toBeGreaterThan(0);
      expect(pat.javaCode).toBeTruthy();
      expect(pat.diagram).toBeDefined();
      expect(pat.quiz.length).toBeGreaterThanOrEqual(3);
      expect(pat.flashcards.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('has bidirectional referential integrity between problems and patterns', () => {
    for (const p of problems) {
      for (const patId of p.relatedPatternIds) {
        expect(patternIds.has(patId), `Problem ${p.id} references non-existent pattern ${patId}`).toBe(true);
      }
    }

    for (const pat of patterns) {
      for (const probId of pat.relatedProblemIds) {
        expect(problemIds.has(probId), `Pattern ${pat.id} references non-existent problem ${probId}`).toBe(true);
      }
    }
  });

  it('verifies that every problem reference diagram passes validation with 0 warnings', () => {
    for (const p of problems) {
      const warnings = validateLldDiagram(p.referenceDiagram);
      expect(warnings, `Problem ${p.id} reference diagram has warnings: ${JSON.stringify(warnings)}`).toEqual([]);
    }
  });

  it('verifies that every pattern diagram passes validation with 0 warnings', () => {
    for (const pat of patterns) {
      const warnings = validateLldDiagram(pat.diagram);
      expect(warnings, `Pattern ${pat.id} diagram has warnings: ${JSON.stringify(warnings)}`).toEqual([]);
    }
  });
});
