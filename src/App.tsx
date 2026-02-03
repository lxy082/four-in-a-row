import { useEffect, useMemo, useRef, useState } from 'react';
import { Engine, type Player } from './engine/board';
import type { Difficulty } from './engine/ai';
import Controls from './ui/Controls';
import StatusBar from './ui/StatusBar';
import ThreeBoard from './ui/ThreeBoard';
import { SIZE } from './engine/lines';
import { getPlayerMapping } from './engine/playerMapping';

const playerLabel = (player: Player) => (player === 1 ? '红方' : '蓝方');

const App = () => {
  const engineRef = useRef(new Engine());
  const workerRef = useRef<Worker | null>(null);
  const [version, setVersion] = useState(0);
  const [currentTurn, setCurrentTurn] = useState<Player>(1);
  const [mode, setMode] = useState<'pvp' | 'ai'>('pvp');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [humanFirst, setHumanFirst] = useState(true);
  const [humanPlayer, setHumanPlayer] = useState<Player>(1);
  const [aiPlayer, setAiPlayer] = useState<Player>(-1);
  const [timeControl, setTimeControl] = useState<'off' | '30' | '60'>('off');
  const [timeLeftMs, setTimeLeftMs] = useState<number | null>(null);
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'draw'>('playing');
  const [winner, setWinner] = useState<Player | null>(null);
  const [winLines, setWinLines] = useState<number[][]>([]);
  const [hovered, setHovered] = useState<{ x: number; y: number } | null>(null);
  const [lastMove, setLastMove] = useState<{ x: number; y: number; z: number; player: Player } | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedMove, setSelectedMove] = useState<{ x: number; y: number } | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const winnerRef = useRef<Player | null>(null);
  const gameStatusRef = useRef<'playing' | 'won' | 'draw'>('playing');
  const moveInProgressRef = useRef(false);
  const aiRequestRef = useRef(false);
  const turnDeadlineRef = useRef<number | null>(null);
  const aiTimeoutRef = useRef<number | null>(null);
  const humanPlayerRef = useRef<Player>(1);
  const aiPlayerRef = useRef<Player>(-1);
  const aiRequestTurnRef = useRef<Player | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./aiWorker.js', import.meta.url), { type: 'module' });
    workerRef.current.onmessage = (event) => {
      const move = event.data?.move as { x: number; y: number } | null;
      setAiThinking(false);
      aiRequestRef.current = false;
      if (aiTimeoutRef.current) {
        window.clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
      if (winnerRef.current || gameStatusRef.current !== 'playing') {
        return;
      }
      if (aiRequestTurnRef.current !== currentTurn || currentTurn !== aiPlayerRef.current) {
        aiRequestTurnRef.current = null;
        return;
      }
      const nextMove = move ?? pickFallbackMove();
      if (!nextMove) {
        return;
      }
      applyMove(nextMove.x, nextMove.y, aiPlayerRef.current, true);
    };
    workerRef.current.onerror = (error) => {
      console.error('AI worker failed:', error);
      setAiThinking(false);
      aiRequestRef.current = false;
      const fallback = pickFallbackMove();
      if (
        fallback &&
        gameStatusRef.current === 'playing' &&
        aiRequestTurnRef.current === currentTurn &&
        currentTurn === aiPlayerRef.current
      ) {
        applyMove(fallback.x, fallback.y, aiPlayerRef.current, true);
      }
    };
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    resetGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, humanFirst]);

  useEffect(() => {
    if (
      mode === 'ai' &&
      gameStatus === 'playing' &&
      currentTurn === aiPlayer &&
      !aiThinking &&
      !isAnimating &&
      !moveInProgressRef.current
    ) {
      requestAiMove();
    }
  }, [mode, gameStatus, currentTurn, aiPlayer, aiThinking, isAnimating, timeLeftMs]);

  useEffect(() => {
    if (gameStatus !== 'playing') {
      turnDeadlineRef.current = null;
      setTimeLeftMs(null);
      return;
    }
    if (timeControl === 'off') {
      turnDeadlineRef.current = null;
      setTimeLeftMs(null);
      return;
    }
    const baseMs = timeControl === '30' ? 30000 : 60000;
    const deadline = performance.now() + baseMs;
    turnDeadlineRef.current = deadline;
    setTimeLeftMs(baseMs);
  }, [currentTurn, gameStatus, timeControl]);

  useEffect(() => {
    if (gameStatus !== 'playing' || timeControl === 'off') {
      return;
    }
    const interval = window.setInterval(() => {
      if (!turnDeadlineRef.current) {
        return;
      }
      const remaining = Math.max(0, Math.ceil(turnDeadlineRef.current - performance.now()));
      setTimeLeftMs(remaining);
      if (remaining <= 0) {
        const loser = currentTurn;
        const winnerPlayer: Player = loser === 1 ? -1 : 1;
        setWinner(winnerPlayer);
        setGameStatus('won');
        setSelectedMove(null);
        setAiThinking(false);
        aiRequestRef.current = false;
        moveInProgressRef.current = false;
      }
    }, 200);
    return () => window.clearInterval(interval);
  }, [currentTurn, gameStatus, timeControl]);

  useEffect(() => {
    winnerRef.current = winner;
  }, [winner]);

  useEffect(() => {
    gameStatusRef.current = gameStatus;
  }, [gameStatus]);

  useEffect(() => {
    if (gameStatus !== 'playing') {
      setAiThinking(false);
      aiRequestRef.current = false;
      aiRequestTurnRef.current = null;
      if (aiTimeoutRef.current) {
        window.clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
    }
  }, [gameStatus]);


  const resetGame = () => {
    engineRef.current = new Engine();
    setVersion((v) => v + 1);
    const mapping = getPlayerMapping(mode, humanFirst);
    if (mode === 'ai' && mapping.human === mapping.ai) {
      console.error('Invalid player mapping: human and AI players are identical.');
    }
    setHumanPlayer(mapping.human);
    setAiPlayer(mapping.ai);
    humanPlayerRef.current = mapping.human;
    aiPlayerRef.current = mapping.ai;
    setCurrentTurn(mapping.firstTurn);
    setWinner(null);
    setGameStatus('playing');
    setWinLines([]);
    setLastMove(null);
    setHovered(null);
    setAiThinking(false);
    setSelectedMove(null);
    setIsAnimating(false);
    setTimeLeftMs(null);
    turnDeadlineRef.current = null;
    moveInProgressRef.current = false;
    if (aiTimeoutRef.current) {
      window.clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }
    aiRequestTurnRef.current = null;
  };

  const pickFallbackMove = () => {
    const moves = engineRef.current.getValidMoves();
    moves.sort((a, b) => {
      const da = Math.abs(a.x - 2) + Math.abs(a.y - 2);
      const db = Math.abs(b.x - 2) + Math.abs(b.y - 2);
      return da - db;
    });
    return moves[0] ?? null;
  };

  const requestAiMove = () => {
    if (!workerRef.current) {
      return;
    }
    if (
      aiThinking ||
      aiRequestRef.current ||
      gameStatus !== 'playing' ||
      isAnimating ||
      currentTurn !== aiPlayerRef.current
    ) {
      return;
    }
    const difficultyLimits = { easy: 200, medium: 1500, hard: 6000 } as const;
    const baseLimit = difficultyLimits[difficulty];
    const remaining = timeLeftMs ?? null;
    const timeLimitMs = remaining ? Math.max(200, Math.min(baseLimit, remaining - 50)) : baseLimit;
    aiRequestRef.current = true;
    aiRequestTurnRef.current = currentTurn;
    setAiThinking(true);
    if (aiTimeoutRef.current) {
      window.clearTimeout(aiTimeoutRef.current);
    }
    aiTimeoutRef.current = window.setTimeout(() => {
      if (
        aiRequestRef.current &&
        gameStatusRef.current === 'playing' &&
        aiRequestTurnRef.current === currentTurn &&
        currentTurn === aiPlayerRef.current
      ) {
        console.warn('AI timeout reached, using fallback move.');
        aiRequestRef.current = false;
        setAiThinking(false);
        const fallback = pickFallbackMove();
        if (fallback) {
          applyMove(fallback.x, fallback.y, aiPlayerRef.current, true);
        }
      }
    }, timeLimitMs + 100);
    workerRef.current.postMessage({
      grid: Array.from(engineRef.current.grid),
      heights: Array.from(engineRef.current.heights),
      moves: engineRef.current.moves,
      player: aiPlayerRef.current,
      difficulty,
      timeLimitMs
    });
  };

  const applyMove = (x: number, y: number, player: Player, fromAi = false) => {
    if (gameStatus !== 'playing' || aiThinking || isAnimating) {
      return;
    }
    if (moveInProgressRef.current) {
      return;
    }
    if (player !== currentTurn) {
      console.error('Move rejected: player does not match current turn.', { player, currentTurn });
      return;
    }
    if (mode === 'ai' && fromAi && player !== aiPlayer) {
      console.error('Move rejected: AI attempted to play human color.', { player, aiPlayer });
      return;
    }
    if (mode === 'ai' && !fromAi && player !== humanPlayer) {
      console.error('Move rejected: Human attempted to play AI color.', { player, humanPlayer });
      return;
    }
    moveInProgressRef.current = true;
    const result = engineRef.current.makeMove(x, y, player);
    if (!result.ok) {
      setToast(result.message ?? '该位置已满，请重新选择');
      setTimeout(() => setToast(null), 1200);
      moveInProgressRef.current = false;
      return;
    }
    setLastMove({ x, y, z: result.z!, player });
    setVersion((v) => v + 1);
    setSelectedMove(null);
    setIsAnimating(true);
    window.setTimeout(() => {
      setIsAnimating(false);
      moveInProgressRef.current = false;
    }, 500);
    if (result.win) {
      setWinner(player);
      setWinLines(result.winLines ?? []);
      setGameStatus('won');
      return;
    }
    if (result.draw) {
      setGameStatus('draw');
      return;
    }
    setCurrentTurn((prev) => (prev === 1 ? -1 : 1));
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
    : gameStatus === 'draw'
    ? '平局：棋盘已满'
    : `当前回合：${playerLabel(currentTurn)}`;

  const timeLeftDisplay =
    timeLeftMs === null ? '未开启' : `${Math.ceil(timeLeftMs / 1000)}s`;

  const selectedHeight = selectedMove
    ? engineRef.current.heights[selectedMove.x + selectedMove.y * SIZE]
    : null;
  const hoveredHeight = hovered ? engineRef.current.heights[hovered.x + hovered.y * SIZE] : null;
  const isSelectedFull = selectedHeight !== null && selectedHeight >= SIZE;
  const canConfirmMove =
    gameStatus === 'playing' &&
    !isAnimating &&
    !aiThinking &&
    Boolean(selectedMove) &&
    !isSelectedFull &&
    (mode === 'pvp' || currentTurn === humanPlayer);

  return (
    <div className="app">
      <StatusBar
        mode={mode}
        difficulty={difficulty}
        status={statusText}
        aiThinking={aiThinking}
        timeControl={timeControl}
        timeLeft={timeLeftDisplay}
      />
      <div className="layout">
        <div className="board-panel">
          <ThreeBoard
            grid={grid}
            heights={heights}
            hovered={hovered}
            onHover={setHovered}
            selected={selectedMove}
            onSelect={setSelectedMove}
            lastMove={lastMove}
            winIndices={winIndices}
            locked={gameStatus !== 'playing' || aiThinking || isAnimating}
            version={version}
          />
          {toast && <div className="toast">{toast}</div>}
        </div>
        <div className="sidebar">
          <Controls
            mode={mode}
            difficulty={difficulty}
            humanFirst={humanFirst}
            timeControl={timeControl}
            selectedMove={selectedMove}
            selectedHeight={selectedHeight}
            hoveredMove={hovered}
            hoveredHeight={hoveredHeight}
            isSelectedFull={isSelectedFull}
            canConfirm={canConfirmMove}
            isAnimating={isAnimating}
            onModeChange={(next) => {
              setMode(next);
            }}
            onDifficultyChange={setDifficulty}
            onHumanFirstChange={(value) => {
              setHumanFirst(value);
            }}
            onTimeControlChange={(value) => {
              setTimeControl(value);
              resetGame();
            }}
            onReset={resetGame}
            onConfirmMove={() => {
              if (selectedMove) {
                applyMove(selectedMove.x, selectedMove.y, currentTurn);
              }
            }}
          />
          <section className="rules">
            <h2>规则说明</h2>
            <ul>
              <li>棋盘为 5×5×5 的三维立方体，坐标 (x,y,z)，z=0 为最底层。</li>
              <li>重力方向固定向 -z，玩家只选择柱子 (x,y)，棋子自动落到最低空位。</li>
              <li>先点击柱子进行选择，再点击“落子”按钮确认，才会真正下棋。</li>
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
