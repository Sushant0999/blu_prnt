import { SimulatorDefinition, SimulatorLogic, OutcomeDef, StatTileDef, RequestPayload } from '../engine/types';

export const AUTOSCALING_OUTCOMES: OutcomeDef[] = [
  { id: 'processed_sla', label: 'Processed within SLA Target', color: '#10b981', shape: 'circle' },
  { id: 'scale_up', label: 'HPA Scale-Out Triggered (+1 Pod)', color: '#06b6d4', shape: 'diamond' },
  { id: 'scale_down', label: 'HPA Cooldown Scale-In (-1 Pod)', color: '#3b82f6', shape: 'square' },
  { id: 'load_shed', label: 'Priority Load Shedding (HTTP 503)', color: '#ef4444', shape: 'cross' },
];

export class AutoscalingLogic implements SimulatorLogic {
  private mode: string = 'reactive';
  private replicas: number = 3;
  private minReplicas: number = 2;
  private maxReplicas: number = 10;
  private replicaCapacityQps: number = 8;
  private totalReqs: number = 0;
  private shedReqs: number = 0;
  private scaleEvents: number = 0;
  private timeSinceScale: number = 0;

  init(params: Record<string, any>, modeId: string): any {
    this.mode = modeId;
    this.reset();
    return this.getState();
  }

  reset(): void {
    this.replicas = 3;
    this.totalReqs = 0;
    this.shedReqs = 0;
    this.scaleEvents = 0;
    this.timeSinceScale = 0;
  }

  onRequest(req: RequestPayload, now: number): OutcomeDef {
    this.totalReqs++;
    const totalCapacity = this.replicas * this.replicaCapacityQps;

    // Check overload
    if (this.totalReqs % (totalCapacity + 1) === 0 && this.mode === 'load_shedding') {
      this.shedReqs++;
      return AUTOSCALING_OUTCOMES[3]; // shed
    }

    // Check reactive scale up
    if (this.replicas < this.maxReplicas && this.timeSinceScale > 2000) {
      if (req.id % 25 === 0) {
        this.replicas++;
        this.scaleEvents++;
        this.timeSinceScale = 0;
        return AUTOSCALING_OUTCOMES[1]; // scale up
      }
    }

    return AUTOSCALING_OUTCOMES[0];
  }

  tick(dtMs: number, now: number): void {
    this.timeSinceScale += dtMs;
  }

  getCenterMetric(): { label: string; value: string | number; percentage?: number } {
    const pct = Math.round((this.replicas / this.maxReplicas) * 100);
    return {
      label: 'Pod Replicas',
      value: `${this.replicas} Pods`,
      percentage: pct,
    };
  }

  getStats(): [StatTileDef, StatTileDef, StatTileDef] {
    const totalCap = this.replicas * this.replicaCapacityQps;
    return [
      { label: 'Cluster Capacity', value: `${totalCap} req/s`, color: '#38bdf8' },
      { label: 'Active Pod Replicas', value: `${this.replicas} / ${this.maxReplicas}`, color: '#10b981' },
      { label: 'Shed Traffic (503)', value: this.shedReqs, trend: this.shedReqs === 0 ? 'neutral' : 'down', color: this.shedReqs === 0 ? '#10b981' : '#ef4444' },
    ];
  }

  getState(): any {
    return { replicas: this.replicas, total: this.totalReqs, shed: this.shedReqs };
  }

  applyFailure(actionId: string): void {
    if (actionId === 'kill_half_pods') {
      this.replicas = Math.max(this.minReplicas, Math.floor(this.replicas / 2));
    }
  }
}

export const autoscalingDefinition: SimulatorDefinition = {
  id: 'autoscaling-backpressure',
  title: 'Autoscaling & Backpressure Systems',
  description: 'Observe horizontal pod autoscaling (HPA), reactive vs predictive scaling loops, and graceful load shedding.',
  linkedLessonId: 'autoscaling-elasticity',
  defaultRate: 25,
  maxRate: 80,
  modes: [
    {
      id: 'reactive',
      label: 'Reactive Scaling (CPU Target)',
      explanation: 'Monitors trailing CPU/memory metrics and scales replicas up or down with configurable stabilization cooldowns.',
    },
    {
      id: 'predictive',
      label: 'Predictive Scaling (ML Forecast)',
      explanation: 'Anticipates daily traffic curves and scales up pods 15 minutes before peak to eliminate spin-up latency.',
    },
    {
      id: 'load_shedding',
      label: 'Load Shedding (CoDel / LIFO)',
      explanation: 'When queues saturate, immediately rejects low-priority traffic with 503 to ensure core transactions finish in time.',
    },
  ],
  params: [],
  outcomes: AUTOSCALING_OUTCOMES,
  failureActions: [
    { id: 'kill_half_pods', label: 'Simulate Node Eviction (Drop 50% Pods)', apply: (s) => {} },
  ],
  createLogic: () => new AutoscalingLogic(),
};
