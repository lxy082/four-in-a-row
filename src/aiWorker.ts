import { Engine, type Player } from './engine/board';
import { computeBestMove, type Difficulty } from './engine/ai';

interface AiRequest {
  grid: number[];
  heights: number[];
  moves: number;
  player: Player;
  difficulty: Difficulty;
}

self.onmessage = (event: MessageEvent<AiRequest>) => {
  const { grid, player, difficulty } = event.data;
  const engine = new Engine();
  engine.loadPosition(new Int8Array(grid));
  const result = computeBestMove(engine, player, difficulty);
  (self as DedicatedWorkerGlobalScope).postMessage(result);
};
