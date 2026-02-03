import { ALL_LINES, SIZE, coordsFromIndex } from './lines';
import type { Player } from './board';

const LINE_SCORES = [0, 1, 5, 25, 100000];

const centerWeight = (x: number, y: number, z: number) => {
  const dx = Math.abs(x - 2);
  const dy = Math.abs(y - 2);
  const dz = Math.abs(z - 2);
  return 6 - (dx + dy + dz);
};

const CENTER_WEIGHTS = Array.from({ length: SIZE * SIZE * SIZE }, (_, idx) => {
  const { x, y, z } = coordsFromIndex(idx);
  return centerWeight(x, y, z);
});

export const evaluateGrid = (grid: Int8Array, player: Player) => {
  let score = 0;
  const opponent: Player = player === 1 ? -1 : 1;

  for (let i = 0; i < grid.length; i += 1) {
    const cell = grid[i];
    if (cell === player) {
      score += CENTER_WEIGHTS[i];
    } else if (cell === opponent) {
      score -= CENTER_WEIGHTS[i];
    }
  }

  for (const line of ALL_LINES) {
    let playerCount = 0;
    let opponentCount = 0;
    for (const cell of line) {
      if (grid[cell] === player) {
        playerCount += 1;
      } else if (grid[cell] === opponent) {
        opponentCount += 1;
      }
    }
    if (playerCount > 0 && opponentCount > 0) {
      continue;
    }
    if (playerCount > 0) {
      score += LINE_SCORES[playerCount];
    } else if (opponentCount > 0) {
      score -= LINE_SCORES[opponentCount];
    }
  }

  return score;
};
