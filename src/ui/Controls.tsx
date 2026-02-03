import type { Difficulty } from '../engine/ai';

interface ControlsProps {
  mode: 'pvp' | 'ai';
  difficulty: Difficulty;
  humanFirst: boolean;
  onModeChange: (mode: 'pvp' | 'ai') => void;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onHumanFirstChange: (humanFirst: boolean) => void;
  onReset: () => void;
}

const Controls = ({
  mode,
  difficulty,
  humanFirst,
  onModeChange,
  onDifficultyChange,
  onHumanFirstChange,
  onReset
}: ControlsProps) => {
  return (
    <section className="controls">
      <h2>控制面板</h2>
      <div className="control-group">
        <label>模式</label>
        <div className="button-row">
          <button type="button" className={mode === 'pvp' ? 'active' : ''} onClick={() => onModeChange('pvp')}>
            PVP
          </button>
          <button type="button" className={mode === 'ai' ? 'active' : ''} onClick={() => onModeChange('ai')}>
            人机
          </button>
        </div>
      </div>
      {mode === 'ai' && (
        <>
          <div className="control-group">
            <label>AI 难度</label>
            <div className="button-row">
              {(['easy', 'medium', 'hard'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  className={difficulty === level ? 'active' : ''}
                  onClick={() => onDifficultyChange(level)}
                >
                  {level.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="control-group">
            <label>先手</label>
            <div className="button-row">
              <button type="button" className={humanFirst ? 'active' : ''} onClick={() => onHumanFirstChange(true)}>
                人类先手
              </button>
              <button type="button" className={!humanFirst ? 'active' : ''} onClick={() => onHumanFirstChange(false)}>
                AI 先手
              </button>
            </div>
          </div>
        </>
      )}
      <button type="button" className="reset" onClick={onReset}>
        重新开始
      </button>
    </section>
  );
};

export default Controls;
