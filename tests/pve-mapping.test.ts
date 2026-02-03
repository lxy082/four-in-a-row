import { describe, expect, it } from 'vitest';
import { Engine } from '../src/engine/board';
import { index } from '../src/engine/lines';
import { getPlayerMapping } from '../src/engine/playerMapping';

describe('PVE player mapping', () => {
  it('human-first produces different colors for human and AI moves', () => {
    const mapping = getPlayerMapping('ai', true);
    expect(mapping.human).not.toBe(mapping.ai);

    const engine = new Engine();
    engine.makeMove(2, 2, mapping.human);
    engine.makeMove(3, 2, mapping.ai);

    expect(engine.grid[index(2, 2, 0)]).toBe(mapping.human);
    expect(engine.grid[index(3, 2, 0)]).toBe(mapping.ai);
  });

  it('ai-first uses AI color on the opening move', () => {
    const mapping = getPlayerMapping('ai', false);
    expect(mapping.human).not.toBe(mapping.ai);

    const engine = new Engine();
    engine.makeMove(2, 2, mapping.ai);
    engine.makeMove(2, 3, mapping.human);

    expect(engine.grid[index(2, 2, 0)]).toBe(mapping.ai);
    expect(engine.grid[index(2, 3, 0)]).toBe(mapping.human);
  });
});
