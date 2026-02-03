import { describe, expect, it } from 'vitest';
import { Engine } from '../src/engine/board';
import { SIZE, index } from '../src/engine/lines';

const makeGrid = () => new Int8Array(SIZE * SIZE * SIZE);

const place = (grid: Int8Array, x: number, y: number, z: number, player: 1 | -1) => {
  grid[index(x, y, z)] = player;
};

describe('Engine', () => {
  it('drops pieces to the lowest available z', () => {
    const engine = new Engine();
    const move1 = engine.makeMove(2, 2, 1);
    const move2 = engine.makeMove(2, 2, -1);
    expect(move1.ok).toBe(true);
    expect(move1.z).toBe(0);
    expect(move2.ok).toBe(true);
    expect(move2.z).toBe(1);
  });

  it('rejects moves in a full column', () => {
    const engine = new Engine();
    for (let i = 0; i < SIZE; i += 1) {
      engine.makeMove(1, 1, i % 2 === 0 ? 1 : -1);
    }
    const result = engine.makeMove(1, 1, 1);
    expect(result.ok).toBe(false);
  });

  it('detects horizontal wins', () => {
    const engine = new Engine();
    const grid = makeGrid();
    for (let x = 0; x < 4; x += 1) {
      place(grid, x, 0, 0, 1);
    }
    engine.loadPosition(grid);
    const win = engine.checkWinAll();
    expect(win).not.toBeNull();
    expect(win?.player).toBe(1);
  });

  it('detects vertical wins', () => {
    const engine = new Engine();
    const grid = makeGrid();
    for (let z = 0; z < 4; z += 1) {
      place(grid, 2, 2, z, -1);
    }
    engine.loadPosition(grid);
    const win = engine.checkWinAll();
    expect(win).not.toBeNull();
    expect(win?.player).toBe(-1);
  });

  it('detects 3D diagonal wins', () => {
    const engine = new Engine();
    const grid = makeGrid();
    for (let i = 0; i < 4; i += 1) {
      place(grid, i, i, i, 1);
    }
    engine.loadPosition(grid);
    const win = engine.checkWinAll();
    expect(win).not.toBeNull();
    expect(win?.player).toBe(1);
  });

  it('recognizes a full board without a win', () => {
    const engine = new Engine();
    const grid = makeGrid();
    for (let x = 0; x < SIZE; x += 1) {
      for (let y = 0; y < SIZE; y += 1) {
        for (let z = 0; z < SIZE; z += 1) {
          const player = (x + y + z) % 2 === 0 ? 1 : -1;
          place(grid, x, y, z, player);
        }
      }
    }
    engine.loadPosition(grid);
    expect(engine.moves).toBe(SIZE * SIZE * SIZE);
    expect(engine.checkWinAll()).toBeNull();
    expect(engine.getValidMoves()).toHaveLength(0);
  });
});
