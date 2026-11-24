import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { LoadBalancerLogic, loadBalancerDefinition } from '../simulators/modules/loadBalancer';
import { SIMULATOR_REGISTRY } from '../simulators/registry';
import { FlowDiagram, FlowNode, FlowEdge } from '../simulators/components/FlowDiagram';
import { getFlowDiagramProps } from '../simulators/engine/flowTopologyAdapters';

describe('Flow Diagram & Load Balancer Module', () => {
  describe('Dispatch Logic across algorithms with fixed seed', () => {
    it('round_robin sequentially loops through alive servers', () => {
      const lb = new LoadBalancerLogic();
      lb.init({}, 'round_robin', 42);

      const o1 = lb.onRequest({ id: 1, timestamp: 1000 }, 1000);
      const o2 = lb.onRequest({ id: 2, timestamp: 1000 }, 1000);
      const o3 = lb.onRequest({ id: 3, timestamp: 1000 }, 1000);
      const o4 = lb.onRequest({ id: 4, timestamp: 1000 }, 1000);

      expect(o1.id).toBe('node_a');
      expect(o2.id).toBe('node_b');
      expect(o3.id).toBe('node_c');
      expect(o4.id).toBe('node_a');
    });

    it('weighted_rr dispatches proportionally to configured weights', () => {
      const lb = new LoadBalancerLogic();
      // Weights: A=1, B=3, C=2. Total weight = 6
      lb.init({}, 'weighted_rr', 42);

      const outcomes: string[] = [];
      for (let i = 0; i < 6; i++) {
        outcomes.push(lb.onRequest({ id: i, timestamp: 1000 }, 1000).id);
      }

      const countA = outcomes.filter((id) => id === 'node_a').length;
      const countB = outcomes.filter((id) => id === 'node_b').length;
      const countC = outcomes.filter((id) => id === 'node_c').length;

      expect(countA).toBe(1);
      expect(countB).toBe(3);
      expect(countC).toBe(2);
    });

    it('least_conns routes to the server with fewest active/pending connections', () => {
      const lb = new LoadBalancerLogic();
      lb.init({}, 'least_conns', 42);

      // 1st request -> routes to A (all have 0, A is first)
      const o1 = lb.onRequest({ id: 1, timestamp: 1000 }, 1000);
      expect(o1.id).toBe('node_a');

      // Now A has 1 pending connection, B and C have 0 -> routes to B
      const o2 = lb.onRequest({ id: 2, timestamp: 1000 }, 1000);
      expect(o2.id).toBe('node_b');

      // Now A has 1, B has 1, C has 0 -> routes to C
      const o3 = lb.onRequest({ id: 3, timestamp: 1000 }, 1000);
      expect(o3.id).toBe('node_c');
    });

    it('ip_hash deterministically routes same request ID to the same server', () => {
      const lb = new LoadBalancerLogic();
      lb.init({}, 'ip_hash', 42);

      const o1 = lb.onRequest({ id: 8821, timestamp: 1000 }, 1000);
      const o2 = lb.onRequest({ id: 8821, timestamp: 1100 }, 1100);
      const o3 = lb.onRequest({ id: 8821, timestamp: 1200 }, 1200);

      expect(o1.id).toBe(o2.id);
      expect(o2.id).toBe(o3.id);
    });

    it('power_of_two deterministically chooses between two random candidates', () => {
      const lb1 = new LoadBalancerLogic();
      lb1.init({}, 'power_of_two', 9999);

      const lb2 = new LoadBalancerLogic();
      lb2.init({}, 'power_of_two', 9999);

      const run1 = Array.from({ length: 10 }, (_, i) => lb1.onRequest({ id: i, timestamp: 1000 }, 1000).id);
      const run2 = Array.from({ length: 10 }, (_, i) => lb2.onRequest({ id: i, timestamp: 1000 }, 1000).id);

      expect(run1).toEqual(run2);
    });
  });

  describe('Simulation consistency and invariants over N requests', () => {
    it('Handled, In flight, and Imbalance numbers stay consistent after a run of N requests', () => {
      const lb = new LoadBalancerLogic();
      lb.init({}, 'round_robin', 42);

      const N = 24;
      for (let i = 0; i < N; i++) {
        lb.onRequest({ id: i + 1, timestamp: 1000 + i * 50 }, 1000 + i * 50);
      }

      // Check state during travel (600ms per packet)
      let state = lb.getState();
      expect(state.packets.length).toBe(N);

      // Tick 650ms: all packets arrive at servers
      lb.tick(650, 1650);
      state = lb.getState();

      const totalActive = state.stats.inFlight;
      const totalHandled = state.stats.handled;
      const maxActive = Math.max(...state.servers.map((s: any) => s.activeConns));
      const minActive = Math.min(...state.servers.map((s: any) => s.activeConns));

      expect(state.stats.imbalance).toBe(maxActive - minActive);
      expect(totalActive + totalHandled).toBe(N);

      // Advance time until all server jobs are complete (e.g. 3000ms)
      lb.tick(3000, 4650);
      state = lb.getState();

      expect(state.stats.handled).toBe(N);
      expect(state.stats.inFlight).toBe(0);
      expect(state.stats.imbalance).toBe(0);
    });
  });

  describe('SLOW failure injection', () => {
    it('A SLOW server ends with a higher active count than healthy ones', () => {
      const lb = new LoadBalancerLogic();
      lb.init({}, 'round_robin', 42);

      // Inject SLOW degradation on srv2 (Server B)
      lb.applyFailure('toggle_slow_srv2');
      const stateBefore = lb.getState();
      expect(stateBefore.nodeStatus['srv2'].state).toBe('slow');
      expect(stateBefore.nodeStatus['srv2'].stateLabel).toBe('SLOW');

      // Dispatch 18 requests across round robin
      for (let i = 1; i <= 18; i++) {
        lb.onRequest({ id: i, timestamp: 1000 + i * 40 }, 1000 + i * 40);
      }

      // Tick 700ms: packets arrive, healthy servers (350ms duration) finish earlier than slow server (2500ms)
      lb.tick(700, 1700);
      // Tick another 400ms: healthy servers finish their first batch of jobs
      lb.tick(400, 2100);

      const stateAfter = lb.getState();
      const srv1Active = stateAfter.nodeStatus['srv1'].active;
      const srv2Active = stateAfter.nodeStatus['srv2'].active;
      const srv3Active = stateAfter.nodeStatus['srv3'].active;

      // srv2 was slow so its active count is strictly higher than healthy servers
      expect(srv2Active).toBeGreaterThan(srv1Active);
      expect(srv2Active).toBeGreaterThan(srv3Active);
    });
  });

  describe('FlowDiagram generic component rendering', () => {
    it('renders nodes, edges, server status, and footer stat tiles correctly', () => {
      const nodes: FlowNode[] = [
        { id: 'clients', label: 'Clients', kind: 'source' },
        { id: 'balancer', label: 'Balancer', kind: 'hub' },
        { id: 'srv1', label: 'srv1', kind: 'card' },
        { id: 'srv2', label: 'srv2', kind: 'card' },
        { id: 'srv3', label: 'srv3', kind: 'card' },
      ];

      const edges: FlowEdge[] = [
        { id: 'e1', source: 'clients', target: 'balancer' },
        { id: 'e2', source: 'balancer', target: 'srv1' },
        { id: 'e3', source: 'balancer', target: 'srv2' },
        { id: 'e4', source: 'balancer', target: 'srv3' },
      ];

      const nodeStatus = {
        srv1: { active: 3, done: 5, load: 0.3, state: 'normal' },
        srv2: { active: 7, done: 0, load: 0.7, state: 'slow', stateLabel: 'SLOW' },
        srv3: { active: 3, done: 4, load: 0.3, state: 'normal' },
      };

      const stats = {
        handled: 9,
        inFlight: 13,
        imbalance: 4,
      };

      const html = renderToString(
        React.createElement(FlowDiagram, {
          nodes,
          edges,
          nodeStatus,
          stats,
        })
      );

      // Verify node labels exist in rendered output
      expect(html).toContain('Clients');
      expect(html).toContain('Balancer');
      expect(html).toContain('srv1');
      expect(html).toContain('srv2');
      expect(html).toContain('srv3');

      // Verify SLOW badge for srv2
      expect(html).toContain('SLOW');

      // Verify server active & done texts
      expect(html).toContain('3 active · 5 done');
      expect(html).toContain('7 active · 0 done');
      expect(html).toContain('3 active · 4 done');

      // Verify footer stat tiles
      expect(html).toContain('9');
      expect(html).toContain('Handled');
      expect(html).toContain('13');
      expect(html).toContain('In flight');
      expect(html).toContain('4');
      expect(html).toContain('Imbalance');
    });

    it('generates and renders valid FlowDiagram for all 18 Auto-Streaming simulator modules', () => {
      expect(SIMULATOR_REGISTRY.length).toBe(18);

      SIMULATOR_REGISTRY.forEach((def) => {
        const logic = def.createLogic();
        const liveState = logic.init({}, def.modes[0].id);
        const latestOutcome = def.outcomes[0];

        const props = getFlowDiagramProps({
          simulatorId: def.id,
          modeId: def.modes[0].id,
          liveState,
          latestOutcome,
          rate: def.defaultRate,
          params: {},
        });

        expect(props.nodes.length).toBeGreaterThanOrEqual(3);
        expect(props.edges.length).toBeGreaterThanOrEqual(2);
        expect(props.stats).toBeDefined();

        const html = renderToString(React.createElement(FlowDiagram, props));
        expect(html).toContain('flow-nodes');
        expect(html).toContain('flow-cards');
        expect(html).toContain('flow-edges');
      });
    });
  });
});
