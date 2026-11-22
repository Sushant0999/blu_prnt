import { useState, useEffect, useRef, useCallback } from 'react';
import { TrafficGenerator } from './TrafficGenerator';
import { SimulatorDefinition, OutcomeDef, StatTileDef, RequestPayload } from './types';

export interface UseTrafficGeneratorResult {
  // Play/Pause & Rate
  isRunning: boolean;
  isPaused: boolean;
  rate: number;
  isBursty: boolean;
  togglePause: () => void;
  resetAll: () => void;
  setRate: (rate: number) => void;
  setBursty: (bursty: boolean) => void;

  // Step-Through Debugger & Custom Injection
  isStepMode: boolean;
  stepModeCount: number;
  toggleStepMode: (val?: boolean) => void;
  stepForward: (count?: number) => void;
  injectCustomRequest: (req: RequestPayload) => OutcomeDef;
  latestTrace: {
    key: string;
    action: string;
    details: string;
    status: 'ok' | 'throttled' | 'miss' | 'hit' | 'error';
  } | null;

  // Active Mode & Parameters
  currentModeId: string;
  setMode: (modeId: string) => void;
  params: Record<string, any>;
  setParam: (paramId: string, val: any) => void;

  // Visual Outcome Strip (last 44 items)
  outcomesHistory: OutcomeDef[];

  // Dynamic Center Metric & Stats
  centerMetric: { label: string; value: string | number; percentage?: number };
  stats: [StatTileDef, StatTileDef, StatTileDef];
  liveState: any;

  // Actions
  triggerFailure: (actionId: string) => void;
}

export function useTrafficGenerator(
  definition: SimulatorDefinition
): UseTrafficGeneratorResult {
  const [currentModeId, setCurrentModeId] = useState<string>(definition.modes[0]?.id || 'default');
  const [rate, setRateState] = useState<number>(definition.defaultRate);
  const [isBursty, setIsBurstyState] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isStepMode, setIsStepMode] = useState<boolean>(false);
  const [stepModeCount, setStepModeCount] = useState<number>(0);
  const [latestTrace, setLatestTrace] = useState<{
    key: string;
    action: string;
    details: string;
    status: 'ok' | 'throttled' | 'miss' | 'hit' | 'error';
  } | null>(null);

  // Grouped parameters: initialize from definition defaults
  const [params, setParams] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    definition.params.forEach((p) => {
      initial[p.id] = p.default;
    });
    // Add mode specific defaults
    const activeMode = definition.modes.find((m) => m.id === currentModeId);
    activeMode?.params?.forEach((p) => {
      initial[p.id] = p.default;
    });
    return initial;
  });

  // UI Buffers throttled to ~10 fps for optimal performance
  const [outcomesHistory, setOutcomesHistory] = useState<OutcomeDef[]>([]);
  const [centerMetric, setCenterMetric] = useState<{ label: string; value: string | number; percentage?: number }>({
    label: '',
    value: 0,
  });
  const [stats, setStats] = useState<[StatTileDef, StatTileDef, StatTileDef]>([
    { label: 'Tile 1', value: 0 },
    { label: 'Tile 2', value: 0 },
    { label: 'Tile 3', value: 0 },
  ]);
  const [liveState, setLiveState] = useState<any>(() => {
    try {
      return definition.createLogic().getState?.() || {};
    } catch {
      return {};
    }
  });

  // Logic instance
  const logicRef = useRef(definition.createLogic());
  const generatorRef = useRef<TrafficGenerator | null>(null);
  const bufferOutcomes = useRef<OutcomeDef[]>([]);
  const lastUiUpdate = useRef<number>(0);

  // Initialize/re-initialize logic when mode or parameters change
  const reinitLogic = useCallback(
    (p: Record<string, any>, m: string) => {
      logicRef.current.init(p, m);
      setCenterMetric(logicRef.current.getCenterMetric());
      setStats(logicRef.current.getStats());
      setLiveState(logicRef.current.getState?.() || {});
    },
    []
  );

  useEffect(() => {
    reinitLogic(params, currentModeId);
  }, [currentModeId, reinitLogic]);

  // Setup generator loop
  useEffect(() => {
    const generator = new TrafficGenerator({
      ratePerSec: definition.defaultRate,
      maxRate: definition.maxRate,
      bursty: isBursty,
      onRequest: (req, now) => {
        const outcome = logicRef.current.onRequest(req, now);
        bufferOutcomes.current.push(outcome);
      },
      onTick: (dtMs, now) => {
        logicRef.current.tick(dtMs, now);

        // Throttle React state refresh to ~10-12 fps (every 85ms)
        if (now - lastUiUpdate.current >= 85) {
          lastUiUpdate.current = now;

          if (bufferOutcomes.current.length > 0) {
            const batch = bufferOutcomes.current;
            bufferOutcomes.current = [];
            setOutcomesHistory((prev) => {
              const combined = [...prev, ...batch];
              // Keep strictly the last 44 requests (newest on right)
              return combined.slice(-44);
            });
          }

          setCenterMetric(logicRef.current.getCenterMetric());
          setStats(logicRef.current.getStats());
          setLiveState(logicRef.current.getState?.() || {});
        }
      },
    });

    generatorRef.current = generator;
    // Auto-start immediately upon mounting!
    generator.start();

    // Auto-pause when tab is hidden to conserve resources
    const handleVisibilityChange = () => {
      if (document.hidden) {
        generator.pause();
      } else {
        if (!isPaused) generator.resume();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      generator.stop();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [definition]);

  // Keyboard navigation shortcuts: Space (pause/play), Up/Down (rate), R (reset), 1-9 (mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePause();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        resetAll();
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setRate(Math.min(definition.maxRate, rate + 1));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setRate(Math.max(1, rate - 1));
      } else if (e.key >= '1' && e.key <= '9') {
        const modeIndex = parseInt(e.key, 10) - 1;
        if (modeIndex < definition.modes.length) {
          setMode(definition.modes[modeIndex].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rate, isPaused, definition]);

  const togglePause = useCallback(() => {
    if (!generatorRef.current) return;
    if (isPaused) {
      generatorRef.current.resume();
      setIsPaused(false);
    } else {
      generatorRef.current.pause();
      setIsPaused(true);
    }
  }, [isPaused]);

  const resetAll = useCallback(() => {
    generatorRef.current?.reset();
    logicRef.current.reset();
    bufferOutcomes.current = [];
    setOutcomesHistory([]);
    setCenterMetric(logicRef.current.getCenterMetric());
    setStats(logicRef.current.getStats());
    setLiveState(logicRef.current.getState?.() || {});
  }, []);

  const setRate = useCallback((newRate: number) => {
    setRateState(newRate);
    generatorRef.current?.setRate(newRate);
  }, []);

  const setBursty = useCallback((bursty: boolean) => {
    setIsBurstyState(bursty);
    generatorRef.current?.setBursty(bursty);
  }, []);

  const setMode = useCallback((modeId: string) => {
    setCurrentModeId(modeId);
    // Reset algorithm state on mode switch while keeping traffic flowing!
    reinitLogic(params, modeId);
    bufferOutcomes.current = [];
    setOutcomesHistory([]);
  }, [params, reinitLogic]);

  const setParam = useCallback((paramId: string, val: any) => {
    setParams((prev) => {
      const next = { ...prev, [paramId]: val };
      reinitLogic(next, currentModeId);
      return next;
    });
  }, [currentModeId, reinitLogic]);

  const triggerFailure = useCallback((actionId: string) => {
    logicRef.current.applyFailure?.(actionId);
    setCenterMetric(logicRef.current.getCenterMetric());
    setStats(logicRef.current.getStats());
    setLiveState(logicRef.current.getState?.() || {});
  }, []);

  const toggleStepMode = useCallback((val?: boolean) => {
    setIsStepMode((prev) => {
      const next = typeof val === 'boolean' ? val : !prev;
      if (next) {
        generatorRef.current?.pause();
        setIsPaused(true);
      } else {
        generatorRef.current?.resume();
        setIsPaused(false);
      }
      return next;
    });
  }, []);

  const stepForward = useCallback((count = 1) => {
    const newOutcomes: OutcomeDef[] = [];
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      const stepId = stepModeCount + i + 1;
      const req: RequestPayload = {
        id: stepId,
        key: `step-key-${stepId % 100}`,
        timestamp: now + i * 20,
      };
      const outcome = logicRef.current.onRequest(req, now + i * 20);
      newOutcomes.push(outcome);
    }
    logicRef.current.tick(50 * count, now);

    setOutcomesHistory((prev) => [...prev, ...newOutcomes].slice(-44));
    setCenterMetric(logicRef.current.getCenterMetric());
    setStats(logicRef.current.getStats());
    setLiveState(logicRef.current.getState?.() || {});
    setStepModeCount((prev) => prev + count);
  }, [stepModeCount]);

  const injectCustomRequest = useCallback((req: RequestPayload): OutcomeDef => {
    const now = req.timestamp || Date.now();
    const outcome = logicRef.current.onRequest(req, now);
    logicRef.current.tick(20, now);

    setOutcomesHistory((prev) => [...prev, outcome].slice(-44));
    setCenterMetric(logicRef.current.getCenterMetric());
    setStats(logicRef.current.getStats());
    setLiveState(logicRef.current.getState?.() || {});

    const isFailure =
      outcome.id.includes('fail') ||
      outcome.id.includes('drop') ||
      outcome.id.includes('throttled') ||
      outcome.id.includes('error');
    const isHit = outcome.id.includes('hit') || outcome.id.includes('ok');

    setLatestTrace({
      key: req.key || `id:${req.id}`,
      action: outcome.label,
      details: `Dispatched to ${definition.title}. Route result: [${outcome.label}]. Internal state synchronized.`,
      status: isFailure ? 'throttled' : isHit ? 'hit' : 'ok',
    });

    return outcome;
  }, [definition.title]);

  return {
    isRunning: true,
    isPaused,
    rate,
    isBursty,
    togglePause,
    resetAll,
    setRate,
    setBursty,
    isStepMode,
    stepModeCount,
    toggleStepMode,
    stepForward,
    injectCustomRequest,
    latestTrace,
    currentModeId,
    setMode,
    params,
    setParam,
    outcomesHistory,
    centerMetric,
    stats,
    liveState,
    triggerFailure,
  };
}
