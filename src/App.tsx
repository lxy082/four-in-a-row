import { useEffect, useMemo, useRef, useState } from 'react';
import { Engine, type Player } from './engine/board';
import type { Difficulty } from './engine/ai';
import Controls from './ui/Controls';
import StatusBar from './ui/StatusBar';
import ThreeBoard from './ui/ThreeBoard';

const playerLabel = (player: Player) => (player === 1 ? '红方' : '蓝方');

const App = () => {
  const engineRef = useRef(new Engine());
  const workerRef = useRef<Worker | null>(null);
  const [version, setVersion] = useState(0);
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [mode, setMode] = useState<'pvp' | 'ai'>('pvp');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [humanFirst, setHumanFirst] = useState(true);
  const [winner, setWinner] = useState<Player | null>(null);
  const [draw, setDraw] = useState(false);
  const [winLines, setWinLines] = useState<number[][]>([]);
  const [hovered, setHovered] = useState<{ x: number; y: number } | null>(null);
  const [lastMove, setLastMove] = useState<{ x: number; y: number; z: number; player: Player } | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const winnerRef = useRef<Player | null>(null);
  const drawRef = useRef(false);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./aiWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current.onmessage = (event) => {
      const move = event.data?.move as { x: number; y: number } | null;
      setAiThinking(false);
      if (!move || winnerRef.current || drawRef.current) {
        return;
      }
      handleMove(move.x, move.y, true);
    };
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    if (mode === 'ai') {
      if (currentPlayer === (humanFirst ? -1 : 1) && !winner && !draw) {
        requestAiMove();
      }
    }
  }, [mode, currentPlayer, humanFirst, difficulty, winner, draw]);

  useEffect(() => {
    winnerRef.current = winner;
  }, [winner]);

  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);


  const resetGame = () => {
    engineRef.current = new Engine();
    setVersion((v) => v + 1);
    setCurrentPlayer(1);
    setWinner(null);
    setDraw(false);
    setWinLines([]);
    setLastMove(null);
    setHovered(null);
    setAiThinking(false);
  };

  const requestAiMove = () => {
    if (!workerRef.current) {
      return;
    }
    setAiThinking(true);
    workerRef.current.postMessage({
      grid: Array.from(engineRef.current.grid),
      heights: Array.from(engineRef.current.heights),
      moves: engineRef.current.moves,
      player: currentPlayer,
      difficulty
    });
  };

  const handleMove = (x: number, y: number, fromAi = false) => {
    if (winner || draw || aiThinking) {
      return;
    }
    if (mode === 'ai' && !fromAi) {
      const humanPlayer: Player = humanFirst ? 1 : -1;
      if (currentPlayer !== humanPlayer) {
        return;
      }
    }
    const result = engineRef.current.makeMove(x, y, currentPlayer);
    if (!result.ok) {
      setToast(result.message ?? '该位置已满，请重新选择');
      setTimeout(() => setToast(null), 1200);
      return;
    }
    setLastMove({ x, y, z: result.z!, player: currentPlayer });
    setVersion((v) => v + 1);
    if (result.win) {
      setWinner(currentPlayer);
      setWinLines(result.winLines ?? []);
      return;
    }
    if (result.draw) {
      setDraw(true);
      return;
    }
    setCurrentPlayer((prev) => (prev === 1 ? -1 : 1));
  };

  const grid = engineRef.current.grid;
  const heights = engineRef.current.heights;

  const winIndices = useMemo(() => {
    const set = new Set<number>();
    winLines.forEach((line) => line.forEach((idx) => set.add(idx)));
    return set;
  }, [winLines]);

  const statusText = winner
    ? `胜者：${playerLabel(winner)}`
    : draw
    ? '平局：棋盘已满'
    : `当前回合：${playerLabel(currentPlayer)}`;

  return (
    <div className="app">
      <StatusBar
        mode={mode}
        difficulty={difficulty}
        status={statusText}
        aiThinking={aiThinking}
      />
      <div className="layout">
        <div className="board-panel">
          <ThreeBoard
            grid={grid}
            heights={heights}
            hovered={hovered}
            onHover={setHovered}
            onColumnClick={handleMove}
            lastMove={lastMove}
            winIndices={winIndices}
            locked={Boolean(winner || draw || aiThinking)}
            version={version}
          />
          {toast && <div className="toast">{toast}</div>}
        </div>
        <div className="sidebar">
          <Controls
            mode={mode}
            difficulty={difficulty}
            humanFirst={humanFirst}
            onModeChange={(next) => {
              setMode(next);
              resetGame();
            }}
            onDifficultyChange={setDifficulty}
            onHumanFirstChange={(value) => {
              setHumanFirst(value);
              resetGame();
            }}
            onReset={resetGame}
          />
          <section className="rules">
            <h2>规则说明</h2>
            <ul>
              <li>棋盘为 5×5×5 的三维立方体，坐标 (x,y,z)，z=0 为最底层。</li>
              <li>重力方向固定向 -z，玩家只选择柱子 (x,y)，棋子自动落到最低空位。</li>
              <li>若该柱子 5 个高度已满，该步非法且需要重新选择。</li>
              <li>任意方向连续 4 子即胜（轴向、平面斜线、三维斜线均有效）。</li>
              <li>棋盘 125 格填满且无人胜出则平局。</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default App;
