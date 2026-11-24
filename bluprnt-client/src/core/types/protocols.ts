export type InterServiceProtocol = 'grpc' | 'rest' | 'event' | 'graphql' | 'tcp';

export interface ProtocolDefinition {
  id: InterServiceProtocol;
  label: string;
  badge: string;
  description: string;
  color: string;           // Particle/badge color
  dashArray?: string;      // SVG stroke-dasharray for line style
  latencyMultiplier: number;
}

export const PROTOCOL_REGISTRY: Record<InterServiceProtocol, ProtocolDefinition> = {
  grpc: {
    id: 'grpc',
    label: 'gRPC (HTTP/2 Protobuf)',
    badge: 'gRPC',
    description: 'Binary multiplexed RPC over HTTP/2 with protobuf serialization. Lowest latency and CPU overhead for internal microservices.',
    color: '#06b6d4', // Cyan
    latencyMultiplier: 0.7,
  },
  rest: {
    id: 'rest',
    label: 'REST / HTTP/1.1 (JSON)',
    badge: 'REST',
    description: 'Standard JSON over HTTP/1.1. Universal readability and compatibility with public and private APIs.',
    color: '#6366f1', // Indigo
    latencyMultiplier: 1.0,
  },
  event: {
    id: 'event',
    label: 'Async Event / PubSub (Kafka / AMQP)',
    badge: 'Async Event',
    description: 'Non-blocking asynchronous messaging through brokers like Kafka, RabbitMQ, or SQS.',
    color: '#a855f7', // Purple
    dashArray: '5 5',
    latencyMultiplier: 1.2,
  },
  graphql: {
    id: 'graphql',
    label: 'GraphQL Federation',
    badge: 'GraphQL',
    description: 'Federated GraphQL schema query layer with declarative client-specified payloads.',
    color: '#ec4899', // Pink
    latencyMultiplier: 1.1,
  },
  tcp: {
    id: 'tcp',
    label: 'Direct TCP / Custom Wire',
    badge: 'TCP',
    description: 'Raw streaming TCP sockets for gaming, financial engines, or high-throughput telemetry.',
    color: '#10b981', // Emerald
    latencyMultiplier: 0.5,
  },
};
