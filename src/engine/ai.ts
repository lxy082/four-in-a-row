import { Engine, type Player } from './board';
import { evaluateGrid } from './eval';
import { SIZE } from './lines';
import type { Weights } from './weights';
import type { ProfileData } from './profile';
import { detectThreats } from './threat';
import { softmaxSample } from './random';
import { columnIndex } from './memory';

export interface AiResult {
  move: { x: number; y: number } | null;
  depth: number;
}

export interface AiOptions {
  timeLimitMs?: number;
  hardLimitMs?: number;
  weights?: Weights;
  profile?: ProfileData;
  memoryMoves?: Array<{ x: number; y: number; score: number }>;
  randomSeed?: number;
  randomIntensity?: number;
}

const CENTER_ORDER = Array.from({ length: SIZE }, (_, v) => v).sort(
  (a, b) => Math.abs(a - 2) - Math.abs(b - 2)
);

const orderedMoves = (engine: Engine, profile?: ProfileData) => {
  const moves = engine.getValidMoves();
  moves.sort((a, b) => {
    const ax = Math.abs(a.x - 2) + Math.abs(a.y - 2);
    const bx = Math.abs(b.x - 2) + Math.abs(b.y - 2);
    const profileBias = profile ? (profile.heat[columnIndex(a.x, a.y)] ?? 0) - (profile.heat[columnIndex(b.x, b.y)] ?? 0) : 0;
    return ax - bx - profileBias * 0.02;
  });
  return moves;
};

const findImmediateWin = (engine: Engine, player: Player, profile?: ProfileData) => {
  for (const move of orderedMoves(engine, profile)) {
    const result = engine.makeMove(move.x, move.y, player);
    if (result.ok && result.win) {
      engine.undo();
      return move;
    }
    engine.undo();
  }
  return null;
};

const findImmediateBlock = (engine: Engine, player: Player, profile?: ProfileData) => {
  const opponent: Player = player === 1 ? -1 : 1;
  const threats = [] as Array<{ x: number; y: number }>;
  for (const move of orderedMoves(engine, profile)) {
    const result = engine.makeMove(move.x, move.y, opponent);
    if (result.ok && result.win) {
      threats.push(move);
    }
    engine.undo();
  }
  if (threats.length === 0) {
    return null;
  }
  for (const move of threats) {
    if (engine.getValidMoves().some((m) => m.x === move.x && m.y === move.y)) {
      return move;
    }
  }
  return null;
};

const isSafeMove = (engine: Engine, move: { x: number; y: number }, player: Player) => {
  const opponent: Player = player === 1 ? -1 : 1;
  const result = engine.makeMove(move.x, move.y, player);
  if (!result.ok) {
    return false;
  }
  const opponentWin = findImmediateWin(engine, opponent);
  engine.undo();
  return !opponentWin;
};

const negamax = (
  engine: Engine,
  depth: number,
  alpha: number,
  beta: number,
  player: Player,
  maxPlayer: Player,
  deadline: number,
  weights?: Weights,
  profile?: ProfileData
): number => {
  if (performance.now() > deadline) {
    return evaluateGrid(engine.grid, maxPlayer, weights);
  }

  const winner = engine.checkWinAll();
  if (winner) {
    return winner.player === maxPlayer ? 1000000 - (6 - depth) : -1000000 + (6 - depth);
  }
  if (depth === 0 || engine.moves >= SIZE * SIZE * SIZE) {
    return evaluateGrid(engine.grid, maxPlayer, weights);
  }

  let best = -Infinity;
  const moves = orderedMoves(engine, profile);
  for (const move of moves) {
    const result = engine.makeMove(move.x, move.y, player);
    if (!result.ok) {
      continue;
    }
    const score = -negamax(
      engine,
      depth - 1,
      -beta,
      -alpha,
      (player === 1 ? -1 : 1) as Player,
      maxPlayer,
      deadline,
      weights,
      profile
    );
    engine.undo();
    if (score > best) {
      best = score;
    }
    if (score > alpha) {
      alpha = score;
    }
    if (alpha >= beta) {
      break;
    }
  }
  return best;
};

export const computeBestMove = (engine: Engine, player: Player, options: AiOptions = {}): AiResult => {
  const config = { maxDepth: 6, timeLimit: 1200 };

  const hardLimit = options.hardLimitMs ?? 30000;
  const timeLimit = Math.min(options.timeLimitMs ?? config.timeLimit, hardLimit);

  if (engine.moves === 0) {
    return { move: { x: 2, y: 2 }, depth: 1 };
  }


  const immediate = findImmediateWin(engine, player, options.profile);
  if (immediate) {
    return { move: immediate, depth: 1 };
  }
  const block = findImmediateBlock(engine, player, options.profile);
  if (block) {
    return { move: block, depth: 1 };
  }

  const opponent: Player = player === 1 ? -1 : 1;
  const threats = detectThreats(engine.grid, engine.heights, player, opponent);
  if (threats.mustBlock.length > 0) {
    return { move: threats.mustBlock[0], depth: 1 };
  }
  if (threats.forks.length > 0) {
    return { move: threats.forks[0], depth: 1 };
  }
  if (threats.strongThreats.length > 0) {
    return { move: threats.strongThreats[0], depth: 1 };
  }
  if (threats.opportunities.length > 0) {
    return { move: threats.opportunities[0], depth: 1 };
  }

  if (options.memoryMoves && options.memoryMoves.length > 0) {
    const topMemory = options.memoryMoves.slice(0, 3).map((entry) => ({
      x: entry.x,
      y: entry.y,
      score: entry.score
    }));
    const sampled = softmaxSample(topMemory, 0.6);
    if (sampled) {
      return { move: { x: sampled.x, y: sampled.y }, depth: 1 };
    }
  }

  const deadline = performance.now() + timeLimit;
  let bestMove: { x: number; y: number } | null = null;
  let bestScore = -Infinity;
  let lastCompletedDepth = 0;

  for (let depth = 1; depth <= config.maxDepth; depth += 1) {
    if (performance.now() > deadline) {
      break;
    }
    let localBest: { x: number; y: number } | null = null;
    let localScore = -Infinity;
    const moves = orderedMoves(engine, options.profile);

    for (const move of moves) {
      if (performance.now() > deadline) {
        break;
      }
      const result = engine.makeMove(move.x, move.y, player);
      if (!result.ok) {
        continue;
      }
      const score = -negamax(
        engine,
        depth - 1,
        -Infinity,
        Infinity,
        (player === 1 ? -1 : 1) as Player,
        player,
        deadline,
        options.weights,
        options.profile
      );
      engine.undo();
      if (score > localScore) {
        localScore = score;
        localBest = move;
      }
    }

    if (localBest) {
      bestMove = localBest;
      bestScore = localScore;
      lastCompletedDepth = depth;
    }
  }

  if (!bestMove) {
    const moves = orderedMoves(engine, options.profile);
    bestMove = moves[0] ?? null;
  }

  const randomIntensity = options.randomIntensity ?? 0.4;
  if (bestMove && randomIntensity > 0) {
    const moves = orderedMoves(engine, options.profile);
    const topN = 3;
    const candidates = moves.slice(0, Math.min(topN, moves.length));
    const safe = candidates.filter((move) => isSafeMove(engine, move, player));
    const scored = (safe.length > 0 ? safe : candidates).map((move) => {
      const sim = engine.makeMove(move.x, move.y, player);
      const score = sim.ok ? evaluateGrid(engine.grid, player, options.weights) : -Infinity;
      if (sim.ok) {
        engine.undo();
      }
      return { ...move, score };
    });
    const temperature = 0.7;
    const sampled = softmaxSample(scored, temperature + randomIntensity);
    if (sampled) {
      return { move: { x: sampled.x, y: sampled.y }, depth: lastCompletedDepth };
    }
  }

  return { move: bestMove, depth: lastCompletedDepth };
};

export const suggestCenterMoves = () => {
  const moves: Array<{ x: number; y: number }> = [];
  for (const x of CENTER_ORDER) {
    for (const y of CENTER_ORDER) {
      moves.push({ x, y });
    }
  }
  return moves;
};
