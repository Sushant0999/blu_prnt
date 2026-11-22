import { SimulatorDefinition } from './engine/types';
import { rateLimiterDefinition } from './modules/rateLimiter';
import { loadBalancerDefinition } from './modules/loadBalancer';
import { consistentHashingDefinition } from './modules/consistentHashing';
import { cacheDefinition } from './modules/cache';
import { bloomFilterDefinition } from './modules/bloomFilter';
import { lsmTreeDefinition } from './modules/lsmTree';
import { storageIndexesDefinition } from './modules/storageIndexes';
import { replicationDefinition } from './modules/replication';
import { shardingDefinition } from './modules/sharding';
import { raftConsensusDefinition } from './modules/raftConsensus';
import { distributedTxDefinition } from './modules/distributedTx';
import { circuitBreakerDefinition } from './modules/circuitBreaker';
import { retryStrategiesDefinition } from './modules/retryStrategies';
import { messageQueueDefinition } from './modules/messageQueue';
import { cdnEdgeDefinition } from './modules/cdnEdge';
import { gossipProtocolDefinition } from './modules/gossipProtocol';
import { autoscalingDefinition } from './modules/autoscaling';
import { idempotencyDefinition } from './modules/idempotency';

export const SIMULATOR_REGISTRY: SimulatorDefinition[] = [
  rateLimiterDefinition,
  loadBalancerDefinition,
  consistentHashingDefinition,
  cacheDefinition,
  bloomFilterDefinition,
  lsmTreeDefinition,
  storageIndexesDefinition,
  replicationDefinition,
  shardingDefinition,
  raftConsensusDefinition,
  distributedTxDefinition,
  circuitBreakerDefinition,
  retryStrategiesDefinition,
  messageQueueDefinition,
  cdnEdgeDefinition,
  gossipProtocolDefinition,
  autoscalingDefinition,
  idempotencyDefinition,
];

export function getSimulatorById(id: string): SimulatorDefinition | undefined {
  return SIMULATOR_REGISTRY.find((sim) => sim.id === id);
}
