import { SimulatorDefinition, SimulatorLogic, OutcomeDef, StatTileDef, RequestPayload } from '../engine/types';

export const QUEUE_OUTCOMES: OutcomeDef[] = [
  { id: 'enqueued', label: 'Message Produced / Enqueued', color: '#10b981', shape: 'circle' },
  { id: 'consumed', label: 'Message Consumed & Acknowledged', color: '#3b82f6', shape: 'square' },
  { id: 'partition_fanout', label: 'Pub/Sub Fanout to Multiple Subscribers', color: '#a855f7', shape: 'diamond' },
  { id: 'dlq_routed', label: 'Dead Letter Queue (DLQ) Routed', color: '#ef4444', shape: 'cross' },
];

export class MessageQueueLogic implements SimulatorLogic {
  private mode: string = 'consumer_groups';
  private backlog: number = 0;
  private maxBacklog: number = 50;
  private totalProduced: number = 0;
  private totalConsumed: number = 0;
  private dlqCount: number = 0;
  private consumerStalled: boolean = false;

  init(params: Record<string, any>, modeId: string): any {
    this.mode = modeId;
    this.reset();
    return this.getState();
  }

  reset(): void {
    this.backlog = 0;
    this.totalProduced = 0;
    this.totalConsumed = 0;
    this.dlqCount = 0;
    this.consumerStalled = false;
  }

  onRequest(req: RequestPayload, now: number): OutcomeDef {
    this.totalProduced++;

    if (req.id % 15 === 0) {
      this.dlqCount++;
      return QUEUE_OUTCOMES[3]; // DLQ
    }

    if (this.backlog < this.maxBacklog) {
      this.backlog++;
    }

    if (this.mode === 'pub_sub') {
      return QUEUE_OUTCOMES[2]; // Fanout
    }

    return QUEUE_OUTCOMES[0]; // Enqueued
  }

  tick(dtMs: number, now: number): void {
    if (this.consumerStalled) return;

    // Consumers process messages
    const consumeRate = 18; // msgs / sec
    const toConsume = Math.floor((consumeRate * dtMs) / 1000);
    if (toConsume > 0 && this.backlog > 0) {
      const actual = Math.min(toConsume, this.backlog);
      this.backlog -= actual;
      this.totalConsumed += actual;
    }
  }

  getCenterMetric(): { label: string; value: string | number; percentage?: number } {
    const pct = Math.min(100, Math.round((this.backlog / this.maxBacklog) * 100));
    return {
      label: 'Backlog Depth',
      value: `${this.backlog} msgs`,
      percentage: pct,
    };
  }

  getStats(): [StatTileDef, StatTileDef, StatTileDef] {
    return [
      { label: 'Total Produced', value: this.totalProduced, color: '#38bdf8' },
      { label: 'Active Consumer Lag', value: `${this.backlog} msgs`, trend: this.backlog < 15 ? 'down' : 'up', color: this.backlog < 15 ? '#10b981' : '#f59e0b' },
      { label: 'Dead Letter (DLQ)', value: this.dlqCount, trend: this.dlqCount === 0 ? 'neutral' : 'down', color: this.dlqCount === 0 ? '#10b981' : '#ef4444' },
    ];
  }

  getState(): any {
    return { backlog: this.backlog, produced: this.totalProduced, consumed: this.totalConsumed };
  }

  applyFailure(actionId: string): void {
    if (actionId === 'stall_consumer') {
      this.consumerStalled = !this.consumerStalled;
    }
  }
}

export const messageQueueDefinition: SimulatorDefinition = {
  id: 'message-queue',
  title: 'Message Queues & Streaming Buffers',
  description: 'Model point-to-point queues, Pub/Sub topics, partitioned consumer groups, backpressure, and Dead Letter Queues.',
  linkedLessonId: 'message-queues',
  defaultRate: 20,
  maxRate: 50,
  modes: [
    {
      id: 'consumer_groups',
      label: 'Partitioned Consumer Group',
      explanation: 'Partitions logs across multiple parallel consumers. Each partition is consumed sequentially by exactly one worker.',
    },
    {
      id: 'point_to_point',
      label: 'Point-to-Point Queue',
      explanation: 'Standard work queue (e.g. SQS, RabbitMQ). Each message is received and processed by exactly one competing consumer.',
    },
    {
      id: 'pub_sub',
      label: 'Pub/Sub Topic Fanout',
      explanation: 'Publishers broadcast messages to a topic; all independent subscriber queues receive identical copies.',
    },
    {
      id: 'dlq',
      label: 'Dead Letter Queue (DLQ)',
      explanation: 'Poison pills or repeatedly failing messages are moved to a separate quarantine queue for human inspection.',
    },
  ],
  params: [],
  outcomes: QUEUE_OUTCOMES,
  failureActions: [
    { id: 'stall_consumer', label: 'Pause / Resume Consumer Workers (Simulate Lag Spike)', apply: (s) => {} },
  ],
  createLogic: () => new MessageQueueLogic(),
};
