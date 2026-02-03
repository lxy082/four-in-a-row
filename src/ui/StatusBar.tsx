import type { Difficulty } from '../engine/ai';

interface StatusBarProps {
  mode: 'pvp' | 'ai';
  difficulty: Difficulty;
  status: string;
  aiThinking: boolean;
}

const StatusBar = ({ mode, difficulty, status, aiThinking }: StatusBarProps) => {
  return (
    <header className="status-bar">
      <div>
        <strong>模式：</strong>
        {mode === 'pvp' ? 'PVP' : '人机'}
      </div>
      {mode === 'ai' && (
        <div>
          <strong>AI 难度：</strong>
          {difficulty.toUpperCase()}
        </div>
      )}
      <div>
        <strong>状态：</strong>
        {status}
        {aiThinking && <span className="thinking"> · AI 思考中...</span>}
      </div>
    </header>
  );
};

export default StatusBar;
