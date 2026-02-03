import { Engine } from './engine/board';
import { computeBestMove } from './engine/ai';

self.onmessage = (event) => {
  try {
    const { grid, player, difficulty, timeLimitMs } = event.data;
    const engine = new Engine();
    engine.loadPosition(new Int8Array(grid));
    const result = computeBestMove(engine, player, difficulty, { timeLimitMs, hardLimitMs: 25000 });
    const fallbackMoves = engine.getValidMoves();
    fallbackMoves.sort((a, b) => {
      const da = Math.abs(a.x - 2) + Math.abs(a.y - 2);
      const db = Math.abs(b.x - 2) + Math.abs(b.y - 2);
      return da - db;
    });
    const move = result.move ?? fallbackMoves[0] ?? null;
    self.postMessage({ ...result, move });
  } catch (error) {
    console.error('AI worker error:', error);
    self.postMessage({ move: null, depth: 0, error: String(error) });
  }
};
