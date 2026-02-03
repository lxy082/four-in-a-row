import { ALL_LINES, SIZE, coordsFromIndex } from './lines';
import type { Player } from './board';

export interface ThreatResult {
  mustBlock: Array<{ x: number; y: number }>;
  strongThreats: Array<{ x: number; y: number }>;
  opportunities: Array<{ x: number; y: number }>;
  forks: Array<{ x: number; y: number }>;
}

const indexToColumn = (idx: number) => {
  const { x, y } = coordsFromIndex(idx);
  return { x, y };
};

const isPlayable = (idx: number, heights: Int8Array) => {
  const { x, y, z } = coordsFromIndex(idx);
  const columnIndex = x + y * SIZE;
  return heights[columnIndex] === z;
};

const collectPlayable = (indices: number[], heights: Int8Array) => {
  const result: Array<{ x: number; y: number }> = [];
  indices.forEach((idx) => {
    if (isPlayable(idx, heights)) {
      const { x, y } = indexToColumn(idx);
      result.push({ x, y });
    }
  });
  return result;
};

const addUnique = (list: Array<{ x: number; y: number }>, move: { x: number; y: number }) => {
  if (!list.some((m) => m.x === move.x && m.y === move.y)) {
    list.push(move);
  }
};

export const detectThreats = (
  grid: Int8Array,
  heights: Int8Array,
  player: Player,
  opponent: Player
): ThreatResult => {
  const mustBlock: Array<{ x: number; y: number }> = [];
  const strongThreats: Array<{ x: number; y: number }> = [];
  const opportunities: Array<{ x: number; y: number }> = [];
  const forks: Array<{ x: number; y: number }> = [];

  ALL_LINES.forEach((line) => {
    const cells = line.map((idx) => grid[idx]);
    const playerCount = cells.filter((c) => c === player).length;
    const oppCount = cells.filter((c) => c === opponent).length;
    const emptyIndices = line.filter((_, i) => cells[i] === 0);

    if (oppCount === 3 && playerCount === 0) {
      collectPlayable(emptyIndices, heights).forEach((move) => addUnique(mustBlock, move));
    }

    if (playerCount === 3 && oppCount === 0) {
      collectPlayable(emptyIndices, heights).forEach((move) => addUnique(opportunities, move));
    }

    if (oppCount === 2 && playerCount === 0 && emptyIndices.length === 2) {
      const playable = collectPlayable(emptyIndices, heights);
      if (playable.length > 0) {
        playable.forEach((move) => addUnique(strongThreats, move));
      }
    }

    if (playerCount === 2 && oppCount === 0 && emptyIndices.length === 2) {
      const playable = collectPlayable(emptyIndices, heights);
      if (playable.length > 0) {
        playable.forEach((move) => addUnique(opportunities, move));
      }
    }
  });

  const opponentImmediate = new Map<string, number>();
  const validMoves = getValidMovesFromHeights(heights);
  validMoves.forEach((move) => {
    const simulated = simulateMove(grid, heights, move.x, move.y, opponent);
    const wins = countImmediateWins(simulated.grid, simulated.heights, opponent);
    if (wins >= 2) {
      addUnique(forks, move);
    }
    opponentImmediate.set(`${move.x},${move.y}`, wins);
  });

  return { mustBlock, strongThreats, opportunities, forks };
};

const getValidMovesFromHeights = (heights: Int8Array) => {
  const moves: Array<{ x: number; y: number }> = [];
  for (let x = 0; x < SIZE; x += 1) {
    for (let y = 0; y < SIZE; y += 1) {
      const h = heights[x + y * SIZE];
      if (h < SIZE) {
        moves.push({ x, y });
      }
    }
  }
  return moves;
};

const simulateMove = (grid: Int8Array, heights: Int8Array, x: number, y: number, player: Player) => {
  const columnIndex = x + y * SIZE;
  const z = heights[columnIndex];
  const nextGrid = new Int8Array(grid);
  const nextHeights = new Int8Array(heights);
  if (z >= SIZE) {
    return { grid: nextGrid, heights: nextHeights };
  }
  const idx = x + y * SIZE + z * SIZE * SIZE;
  nextGrid[idx] = player;
  nextHeights[columnIndex] = z + 1;
  return { grid: nextGrid, heights: nextHeights };
};

const countImmediateWins = (grid: Int8Array, heights: Int8Array, player: Player) => {
  let count = 0;
  ALL_LINES.forEach((line) => {
    const cells = line.map((idx) => grid[idx]);
    const playerCount = cells.filter((c) => c === player).length;
    const emptyIndices = line.filter((_, i) => cells[i] === 0);
    if (playerCount === 3 && emptyIndices.length === 1) {
      if (isPlayable(emptyIndices[0], heights)) {
        count += 1;
      }
    }
  });
  return count;
};
