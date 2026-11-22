/**
 * Core type contracts for the Universal Simulator Registry.
 * Pure framework-agnostic interfaces.
 */

export type ParamType = 'stepper' | 'slider' | 'toggle' | 'select';

export interface ParamDef {
  id: string;
  label: string;
  type: ParamType;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  default: number | boolean | string;
  options?: { value: string | number; label: string }[];
}

export type OutcomeShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'cross' | 'star' | 'slash';

export interface OutcomeDef {
  id: string;
  label: string;
  color: string; // Hex or CSS color
  shape: OutcomeShape; // Shape / pattern for color-independent accessibility
  description?: string;
}

export interface ModeDef {
  id: string;
  label: string;
  explanation: string; // One-line plain-language explanation
  params?: ParamDef[]; // Mode-specific parameters
}

export interface StatTileDef {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}

export interface FailureActionDef<T = any> {
  id: string;
  label: string;
  apply: (state: T) => void;
}

export interface RequestPayload {
  id: number;
  key?: string;
  timestamp: number;
  sizeBytes?: number;
}

export interface SimulatorLogic<TState = any> {
  init: (params: Record<string, any>, modeId: string, seed?: number) => TState;
  onRequest: (req: RequestPayload, now: number) => OutcomeDef;
  tick: (dtMs: number, now: number) => void;
  getCenterMetric: () => { label: string; value: string | number; percentage?: number };
  getStats: () => [StatTileDef, StatTileDef, StatTileDef]; // Exactly 3 tiles
  reset: () => void;
  getState: () => TState;
  applyFailure?: (actionId: string) => void;
}

export interface SimulatorDefinition<TState = any> {
  id: string;
  title: string;
  description: string;
  linkedLessonId?: string;
  defaultRate: number; // requests/sec
  maxRate: number;
  modes: ModeDef[];
  params: ParamDef[]; // Module-level shared params
  outcomes: OutcomeDef[];
  failureActions?: FailureActionDef<TState>[];
  createLogic: () => SimulatorLogic<TState>;
}
