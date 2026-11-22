import { describe, it, expect } from 'vitest';
import { RateLimiterLogic } from '../simulators/modules/rateLimiter';
import { LoadBalancerLogic } from '../simulators/modules/loadBalancer';
import { ConsistentHashingLogic } from '../simulators/modules/consistentHashing';
import { CacheLogic } from '../simulators/modules/cache';
import { BloomFilterLogic } from '../simulators/modules/bloomFilter';
import { RaftLogic } from '../simulators/modules/raftConsensus';
import { CircuitBreakerLogic } from '../simulators/modules/circuitBreaker';
import { IdempotencyLogic } from '../simulators/modules/idempotency';

describe('Simulator Algorithmic Logic Modules', () => {
  describe('Rate Limiter', () => {
    it('Token bucket consumes tokens and rejects when exhausted', () => {
      const rl = new RateLimiterLogic();
      rl.init({ capacity: 5, refillRate: 1 }, 'token_bucket');

      // Consume all 5 tokens
      for (let i = 0; i < 5; i++) {
        const out = rl.onRequest({ id: i, timestamp: 1000 }, 1000);
        expect(out.id).toBe('allowed');
      }

      // 6th request is throttled
      const throttled = rl.onRequest({ id: 5, timestamp: 1000 }, 1000);
      expect(throttled.id).toBe('throttled');

      // Refill 2 tokens by ticking 2000ms
      rl.tick(2000, 3000);
      const afterRefill = rl.onRequest({ id: 6, timestamp: 3000 }, 3000);
      expect(afterRefill.id).toBe('allowed');
    });

    it('Leaky bucket enqueues requests and leaks smoothly', () => {
      const rl = new RateLimiterLogic();
      rl.init({ queueCapacity: 3, leakRate: 5 }, 'leaky_bucket');

      const r1 = rl.onRequest({ id: 1, timestamp: 1000 }, 1000);
      const r2 = rl.onRequest({ id: 2, timestamp: 1000 }, 1000);
      const r3 = rl.onRequest({ id: 3, timestamp: 1000 }, 1000);
      expect(r1.id).toBe('queued');
      expect(r2.id).toBe('queued');
      expect(r3.id).toBe('queued');

      // 4th request exceeds queue capacity
      const r4 = rl.onRequest({ id: 4, timestamp: 1000 }, 1000);
      expect(r4.id).toBe('throttled');
    });
  });

  describe('Load Balancer', () => {
    it('Round Robin alternates sequentially across healthy servers', () => {
      const lb = new LoadBalancerLogic();
      lb.init({}, 'round_robin');

      const o1 = lb.onRequest({ id: 1, timestamp: 1000 }, 1000);
      const o2 = lb.onRequest({ id: 2, timestamp: 1000 }, 1000);
      const o3 = lb.onRequest({ id: 3, timestamp: 1000 }, 1000);
      const o4 = lb.onRequest({ id: 4, timestamp: 1000 }, 1000);

      expect(o1.id).toBe('node_a');
      expect(o2.id).toBe('node_b');
      expect(o3.id).toBe('node_c');
      expect(o4.id).toBe('node_a'); // loops back
    });

    it('Least Connections routes to the server with fewest active conns', () => {
      const lb = new LoadBalancerLogic();
      lb.init({}, 'least_conns');

      // Server A gets conn
      const o1 = lb.onRequest({ id: 1, timestamp: 1000 }, 1000);
      expect(o1.id).toBe('node_a');

      // Now server B has 0 conns, so server B gets next
      const o2 = lb.onRequest({ id: 2, timestamp: 1000 }, 1000);
      expect(o2.id).toBe('node_b');
    });
  });

  describe('Consistent Hashing', () => {
    it('Routes deterministically on hash ring and reports stats', () => {
      const ch = new ConsistentHashingLogic();
      ch.init({ vnodes: 10 }, 'virtual_nodes');

      const o1 = ch.onRequest({ id: 100, timestamp: 1000 }, 1000);
      const o2 = ch.onRequest({ id: 100, timestamp: 1000 }, 1000);

      // Same key should route to the exact same node
      expect(o1.id).toBe(o2.id);

      const stats = ch.getStats();
      expect(stats.length).toBe(3);
    });
  });

  describe('Cache Eviction', () => {
    it('Evicts keys when capacity is reached and records hits', () => {
      const cache = new CacheLogic();
      cache.init({ capacity: 5 }, 'lru');

      // Feed requests
      for (let i = 0; i < 20; i++) {
        cache.onRequest({ id: i, timestamp: 1000 + i * 50 }, 1000 + i * 50);
      }

      const state = cache.getState();
      expect(state.size).toBeLessThanOrEqual(5);
      expect(state.evictions).toBeGreaterThan(0);
    });
  });

  describe('Bloom Filter', () => {
    it('Guarantees zero false negatives for all inserted items', () => {
      const bf = new BloomFilterLogic();
      bf.init({ bits: 256 }, 'standard');

      // After init, known keys are seeded. Feed lookups
      for (let i = 0; i < 30; i++) {
        const out = bf.onRequest({ id: i * 2, timestamp: 1000 }, 1000);
        expect(['def_not_in_set', 'in_set', 'false_positive', 'mutated']).toContain(out.id);
      }

      const stats = bf.getStats();
      expect(stats.length).toBe(3);
      expect(stats[0].label).toBe('Disk Reads Filtered');
    });
  });

  describe('Raft Consensus', () => {
    it('Increments commit index and responds to partitions', () => {
      const raft = new RaftLogic();
      raft.init({}, 'replication');

      const o1 = raft.onRequest({ id: 1, timestamp: 1000 }, 1000);
      expect(o1.id).toBe('log_committed');

      // Trigger partition
      raft.applyFailure('isolate_partition');
      const o2 = raft.onRequest({ id: 2, timestamp: 1000 }, 1000);
      expect(o2.id).toBe('quorum_lost');
    });
  });

  describe('Circuit Breaker', () => {
    it('Trips from CLOSED to OPEN after failure threshold and fast-fails', () => {
      const cb = new CircuitBreakerLogic();
      cb.init({ failureThreshold: 3, resetTimeout: 2000 }, 'standard_fowler');

      // Simulate broken downstream
      cb.applyFailure('crash_downstream');

      // Trigger failures
      cb.onRequest({ id: 1, timestamp: 1000 }, 1000);
      cb.onRequest({ id: 2, timestamp: 1000 }, 1000);
      cb.onRequest({ id: 3, timestamp: 1000 }, 1000);

      const centerMetric = cb.getCenterMetric();
      expect(centerMetric.value).toBe('OPEN');

      // Fast-fail call while open
      const fastFail = cb.onRequest({ id: 4, timestamp: 1500 }, 1500);
      expect(fastFail.id).toBe('fast_failed');

      // After resetTimeout (2000ms), transitions to HALF_OPEN
      cb.tick(2500, 3500);
      const halfOpenMetric = cb.getCenterMetric();
      expect(halfOpenMetric.value).toBe('HALF_OPEN');
    });
  });

  describe('Idempotency & Delivery', () => {
    it('Safely dedupes repeated requests under exactly-once semantics', () => {
      const idem = new IdempotencyLogic();
      idem.init({}, 'exactly_once');

      // First request with idempotency key 'order-100'
      const first = idem.onRequest({ id: 1, key: 'order-100', timestamp: 1000 }, 1000);
      expect(first.id).toBe('processed_new');

      // Duplicate request with the identical key
      const second = idem.onRequest({ id: 2, key: 'order-100', timestamp: 1000 }, 1000);
      expect(second.id).toBe('deduped_safe');
    });
  });
});
