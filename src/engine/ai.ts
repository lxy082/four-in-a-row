import { Engine, type Player } from './board';
import { evaluateGrid } from './eval';
import { SIZE } from './lines';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface AiResult {
  move: { x: number; y: number } | null;
  depth: number;
}

export interface AiOptions {
  timeLimitMs?: number;
  hardLimitMs?: number;
}

const CENTER_ORDER = Array.from({ length: SIZE }, (_, v) => v).sort(
  (a, b) => Math.abs(a - 2) - Math.abs(b - 2)
);

const orderedMoves = (engine: Engine) => {
  const moves = engine.getValidMoves();
  moves.sort((a, b) => {
    const ax = Math.abs(a.x - 2) + Math.abs(a.y - 2);
    const bx = Math.abs(b.x - 2) + Math.abs(b.y - 2);
    return ax - bx;
  });
  return moves;
};

const findImmediateWin = (engine: Engine, player: Player) => {
  for (const move of orderedMoves(engine)) {
    const result = engine.makeMove(move.x, move.y, player);
    if (result.ok && result.win) {
      engine.undo();
      return move;
    }
    engine.undo();
  }
  return null;
};

const findImmediateBlock = (engine: Engine, player: Player) => {
  const opponent: Player = player === 1 ? -1 : 1;
  const threats = [] as Array<{ x: number; y: number }>;
  for (const move of orderedMoves(engine)) {
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

const chooseRandomTop = (moves: Array<{ x: number; y: number }>, k: number) => {
  if (moves.length === 0) {
    return null;
  }
  const slice = moves.slice(0, Math.min(k, moves.length));
  return slice[Math.floor(Math.random() * slice.length)];
};

const negamax = (
  engine: Engine,
  depth: number,
  alpha: number,
  beta: number,
  player: Player,
  maxPlayer: Player,
  deadline: number
): number => {
  if (performance.now() > deadline) {
    return evaluateGrid(engine.grid, maxPlayer);
  }

  const winner = engine.checkWinAll();
  if (winner) {
    return winner.player === maxPlayer ? 1000000 - (6 - depth) : -1000000 + (6 - depth);
  }
  if (depth === 0 || engine.moves >= SIZE * SIZE * SIZE) {
    return evaluateGrid(engine.grid, maxPlayer);
  }

  let best = -Infinity;
  const moves = orderedMoves(engine);
  for (const move of moves) {
    const result = engine.makeMove(move.x, move.y, player);
    if (!result.ok) {
      continue;
    }
    const score = -negamax(engine, depth - 1, -beta, -alpha, (player === 1 ? -1 : 1) as Player, maxPlayer, deadline);
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

export const computeBestMove = (
  engine: Engine,
  player: Player,
  difficulty: Difficulty,
  options: AiOptions = {}
): AiResult => {
  const config =
    difficulty === 'easy'
      ? { maxDepth: 1, timeLimit: 80 }
      : difficulty === 'medium'
      ? { maxDepth: 4, timeLimit: 500 }
      : { maxDepth: 6, timeLimit: 1200 };

  const hardLimit = options.hardLimitMs ?? 25000;
  const timeLimit = Math.min(options.timeLimitMs ?? config.timeLimit, hardLimit);

  if (engine.moves === 0) {
    return { move: { x: 2, y: 2 }, depth: 1 };
  }

  const immediate = findImmediateWin(engine, player);
  if (immediate) {
    return { move: immediate, depth: 1 };
  }
  const block = findImmediateBlock(engine, player);
  if (block) {
    return { move: block, depth: 1 };
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
    const moves = orderedMoves(engine);

    for (const move of moves) {
      if (performance.now() > deadline) {
        break;
      }
      const result = engine.makeMove(move.x, move.y, player);
      if (!result.ok) {
        continue;
      }
      const score = -negamax(engine, depth - 1, -Infinity, Infinity, (player === 1 ? -1 : 1) as Player, player, deadline);
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

  if (difficulty === 'easy') {
    const moves = orderedMoves(engine);
    const randomMove = chooseRandomTop(moves, 4);
    if (randomMove) {
      return { move: randomMove, depth: 1 };
    }
  }

  if (!bestMove) {
    const moves = orderedMoves(engine);
    bestMove = moves[0] ?? null;
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
