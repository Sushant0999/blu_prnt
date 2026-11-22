import React from 'react';
import { ConsistentHashingSim } from '../../components/simulators/ConsistentHashingSim';
import { TokenBucketSim } from '../../components/simulators/TokenBucketSim';
import { LsmTreeSim } from '../../components/simulators/LsmTreeSim';
import { BloomFilterSim } from '../../components/simulators/BloomFilterSim';
import { SagaVs2PCSim } from '../../components/simulators/SagaVs2PCSim';
import { RaftConsensusSim } from '../../components/simulators/RaftConsensusSim';
import { LoadBalancerSim } from '../../components/simulators/LoadBalancerSim';
import { CacheEvictionSim } from '../../components/simulators/CacheEvictionSim';

export interface SimulatorMetadata {
  id: string;
  name: string;
  category: 'Partitioning' | 'Resilience' | 'Storage' | 'Networking' | 'Transactions';
  complexity: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  component: React.ComponentType;
  tags: string[];
}

export const SIMULATOR_REGISTRY: Record<string, SimulatorMetadata> = {
  'consistent-hashing': {
    id: 'consistent-hashing',
    name: 'Consistent Hashing Ring',
    category: 'Partitioning',
    complexity: 'Intermediate',
    description: 'Visual hash ring with virtual nodes (vnodes), clockwise key routing, and minimal migration during node churn.',
    component: ConsistentHashingSim,
    tags: ['Partitioning', 'Hashing', 'Distributed Caching', 'Ring Topology'],
  },
  'token-bucket': {
    id: 'token-bucket',
    name: 'Token Bucket Rate Limiter',
    category: 'Resilience',
    complexity: 'Beginner',
    description: 'Dynamic token reservoir supporting bursts up to capacity and steady continuous refill, demonstrating HTTP 429 throttling.',
    component: TokenBucketSim,
    tags: ['Rate Limiting', 'Traffic Shaping', 'DDoS Protection', 'API Gateway'],
  },
  'lsm-tree': {
    id: 'lsm-tree',
    name: 'LSM-Tree Compaction',
    category: 'Storage',
    complexity: 'Advanced',
    description: 'In-memory MemTable writes, immutable L0 SSTables flush, and multi-way merge-sort background compaction.',
    component: LsmTreeSim,
    tags: ['Storage Engine', 'Compaction', 'Cassandra', 'RocksDB', 'SkipList'],
  },
  'bloom-filter': {
    id: 'bloom-filter',
    name: 'Bloom Filter Probabilistic Set',
    category: 'Storage',
    complexity: 'Intermediate',
    description: 'Bit array hash projection verifying 0% false negative guarantees and demonstrating collision-driven false positives.',
    component: BloomFilterSim,
    tags: ['Probabilistic', 'Hashing', 'Disk Bypass', 'Cache Optimization'],
  },
  'saga-vs-2pc': {
    id: 'saga-vs-2pc',
    name: 'Saga Pattern vs Two-Phase Commit (2PC)',
    category: 'Transactions',
    complexity: 'Advanced',
    description: 'Compare blocking distributed locks in 2PC against asynchronous compensating transactions in Saga orchestration.',
    component: SagaVs2PCSim,
    tags: ['Microservices', 'Distributed Transactions', 'Choreography', 'ACID'],
  },
  'raft-consensus': {
    id: 'raft-consensus',
    name: 'Raft Consensus & Leader Election',
    category: 'Resilience',
    complexity: 'Advanced',
    description: 'Heartbeat pulses, randomized follower election timers, split-vote avoidance, and majority quorum consensus.',
    component: RaftConsensusSim,
    tags: ['Consensus', 'Leader Election', 'Quorum', 'etcd', 'ZooKeeper'],
  },
  'load-balancer': {
    id: 'load-balancer',
    name: 'Load Balancer Dispatch Algorithms',
    category: 'Networking',
    complexity: 'Beginner',
    description: 'Visual dispatch simulation comparing Round Robin, Least Connections, and Weighted Capacity routing with dynamic node outages.',
    component: LoadBalancerSim,
    tags: ['Networking', 'L4/L7 Balancing', 'Health Checks', 'Failover'],
  },
  'cache-eviction': {
    id: 'cache-eviction',
    name: 'Cache Eviction: LRU vs LFU',
    category: 'Storage',
    complexity: 'Intermediate',
    description: 'Side-by-side replay of access traces through LRU (recency) and LFU (frequency) fixed capacity cache slots.',
    component: CacheEvictionSim,
    tags: ['Caching', 'LRU', 'LFU', 'Working Set', 'Hit Rate'],
  },
};

export function getAllSimulators(): SimulatorMetadata[] {
  return Object.values(SIMULATOR_REGISTRY);
}

export function getSimulatorById(id: string): SimulatorMetadata | undefined {
  return SIMULATOR_REGISTRY[id];
}
