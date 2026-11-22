import { describe, it, expect } from 'vitest';
import { serializeTopology, deserializeTopology } from '../core/algorithms/topologySerializer';
import { PLAYGROUND_TEMPLATES } from '../components/playground/playgroundTemplates';

describe('topologySerializer', () => {
  it('serializes and deserializes a basic topology cleanly', () => {
    const tpl = PLAYGROUND_TEMPLATES['url-shortener'];
    const compressed = serializeTopology(tpl.nodes, tpl.edges, 35000);
    expect(typeof compressed).toBe('string');
    expect(compressed.length).toBeGreaterThan(10);

    const restored = deserializeTopology(compressed);
    expect(restored).not.toBeNull();
    expect(restored!.nodes.length).toBe(tpl.nodes.length);
    expect(restored!.edges.length).toBe(tpl.edges.length);
    expect(restored!.targetRps).toBe(35000);

    // Verify first node properties
    const origFirst = tpl.nodes[0];
    const restFirst = restored!.nodes[0];
    expect(restFirst.id).toBe(origFirst.id);
    expect(restFirst.data.label).toBe(origFirst.data.label);
    expect(restFirst.position.x).toBe(origFirst.position.x);
    expect(restFirst.position.y).toBe(origFirst.position.y);
  });

  it('serializes massive complex multi-tier topologies (Netflix streaming)', () => {
    const tpl = PLAYGROUND_TEMPLATES['netflix-streaming'];
    const compressed = serializeTopology(tpl.nodes, tpl.edges, 120000);
    const restored = deserializeTopology(compressed);

    expect(restored).not.toBeNull();
    expect(restored!.nodes.length).toBe(tpl.nodes.length);
    expect(restored!.edges.length).toBe(tpl.edges.length);
    expect(restored!.targetRps).toBe(120000);
  });

  it('handles corrupted or invalid compressed strings gracefully without throwing', () => {
    expect(deserializeTopology('')).toBeNull();
    expect(deserializeTopology('invalid-base64-random-string!')).toBeNull();
    expect(deserializeTopology('{}')).toBeNull();
  });
});
