import type { Difficulty } from '../engine/ai';

interface ControlsProps {
  mode: 'pvp' | 'ai';
  difficulty: Difficulty;
  humanFirst: boolean;
  selectedMove: { x: number; y: number } | null;
  selectedHeight: number | null;
  isSelectedFull: boolean;
  canConfirm: boolean;
  isAnimating: boolean;
  onModeChange: (mode: 'pvp' | 'ai') => void;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onHumanFirstChange: (humanFirst: boolean) => void;
  onReset: () => void;
  onConfirmMove: () => void;
}

const Controls = ({
  mode,
  difficulty,
  humanFirst,
  selectedMove,
  selectedHeight,
  isSelectedFull,
  canConfirm,
  isAnimating,
  onModeChange,
  onDifficultyChange,
  onHumanFirstChange,
  onReset,
  onConfirmMove
}: ControlsProps) => {
  const selectedText = selectedMove ? `已选择柱子：(${selectedMove.x}, ${selectedMove.y})` : '未选择柱子';
  const heightText =
    selectedMove && selectedHeight !== null
      ? isSelectedFull
        ? '该柱已满'
        : `预计落点高度 z = ${selectedHeight}`
      : '请选择柱子';

  return (
    <section className="controls">
      <h2>控制面板</h2>
      <div className="selection-info">
        <p className="selection-title">{selectedText}</p>
        <p className={isSelectedFull ? 'selection-warning' : 'selection-detail'}>{heightText}</p>
        <button type="button" className="confirm" onClick={onConfirmMove} disabled={!canConfirm}>
          {isAnimating ? '落子动画中...' : '落子'}
        </button>
      </div>
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
