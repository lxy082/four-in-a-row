import { ALL_LINES, SIZE, coordsFromIndex } from './lines';
import type { Player } from './board';
import type { Weights } from './weights';

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

export const evaluateGrid = (grid: Int8Array, player: Player, weights?: Weights) => {
  let score = 0;
  const opponent: Player = player === 1 ? -1 : 1;
  const localWeights = weights ?? {
    center: 1,
    two: 6,
    three: 40,
    blockTwo: 8,
    blockThree: 60,
    openTwo: 12,
    openThree: 90,
    height: 0.4
  };

  for (let i = 0; i < grid.length; i += 1) {
    const cell = grid[i];
    if (cell === player) {
      score += CENTER_WEIGHTS[i] * localWeights.center;
    } else if (cell === opponent) {
      score -= CENTER_WEIGHTS[i] * localWeights.center;
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
      if (playerCount === 2) {
        score += localWeights.two;
      } else if (playerCount === 3) {
        score += localWeights.three;
      } else {
        score += LINE_SCORES[playerCount];
      }
      if (playerCount === 2 && opponentCount === 0 && line.filter((cell) => grid[cell] === 0).length === 2) {
        score += localWeights.openTwo;
      }
      if (playerCount === 3 && opponentCount === 0 && line.filter((cell) => grid[cell] === 0).length === 1) {
        score += localWeights.openThree;
      }
    } else if (opponentCount > 0) {
      if (opponentCount === 2) {
        score -= localWeights.blockTwo;
      } else if (opponentCount === 3) {
        score -= localWeights.blockThree;
      } else {
        score -= LINE_SCORES[opponentCount];
      }
      if (opponentCount === 2 && playerCount === 0 && line.filter((cell) => grid[cell] === 0).length === 2) {
        score -= localWeights.openTwo;
      }
      if (opponentCount === 3 && playerCount === 0 && line.filter((cell) => grid[cell] === 0).length === 1) {
        score -= localWeights.openThree;
      }
    }
  }

  return score;
};
