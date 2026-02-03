import type { Difficulty } from '../engine/ai';

interface ControlsProps {
  mode: 'pvp' | 'ai';
  difficulty: Difficulty;
  humanFirst: boolean;
  timeControl: 'off' | '30' | '60';
  learningEnabled: boolean;
  profileSummary: { games: number; moves: number } | null;
  randomIntensity: number;
  randomSeed: number;
  selectedMove: { x: number; y: number } | null;
  selectedHeight: number | null;
  hoveredMove: { x: number; y: number } | null;
  hoveredHeight: number | null;
  isSelectedFull: boolean;
  canConfirm: boolean;
  isAnimating: boolean;
  onModeChange: (mode: 'pvp' | 'ai') => void;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onHumanFirstChange: (humanFirst: boolean) => void;
  onTimeControlChange: (value: 'off' | '30' | '60') => void;
  onLearningToggle: (value: boolean) => void;
  onClearProfile: () => void;
  onClearMemory: () => void;
  onResetWeights: () => void;
  onRandomIntensityChange: (value: number) => void;
  onRandomSeedChange: (value: number) => void;
  onReset: () => void;
  onConfirmMove: () => void;
}

const Controls = ({
  mode,
  difficulty,
  humanFirst,
  timeControl,
  learningEnabled,
  profileSummary,
  randomIntensity,
  randomSeed,
  selectedMove,
  selectedHeight,
  hoveredMove,
  hoveredHeight,
  isSelectedFull,
  canConfirm,
  isAnimating,
  onModeChange,
  onDifficultyChange,
  onHumanFirstChange,
  onTimeControlChange,
  onLearningToggle,
  onClearProfile,
  onClearMemory,
  onResetWeights,
  onRandomIntensityChange,
  onRandomSeedChange,
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
  const hoverText =
    hoveredMove && hoveredHeight !== null
      ? `悬停柱子：(${hoveredMove.x}, ${hoveredMove.y})，预计落点 z = ${hoveredHeight >= 5 ? '满' : hoveredHeight}`
      : '悬停提示：移动到柱子查看落点';

  return (
    <section className="controls">
      <h2>控制面板</h2>
      <div className="selection-info">
        <p className="selection-title">{selectedText}</p>
        <p className={isSelectedFull ? 'selection-warning' : 'selection-detail'}>{heightText}</p>
        <p className="selection-detail">{hoverText}</p>
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
        <div className="selection-detail">随机强度：{randomIntensity.toFixed(2)}</div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={randomIntensity}
          onChange={(event) => onRandomIntensityChange(Number(event.target.value))}
        />
        <div className="selection-detail">随机种子：{randomSeed}</div>
        <input
          type="number"
          value={randomSeed}
          onChange={(event) => onRandomSeedChange(Number(event.target.value) || 0)}
        />
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
      <div className="control-group">
        <label>计时模式</label>
        <div className="button-row">
          {[
            { value: 'off', label: 'OFF' },
            { value: '30', label: '30s/步' },
            { value: '60', label: '60s/步' }
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              className={timeControl === option.value ? 'active' : ''}
              onClick={() => onTimeControlChange(option.value as 'off' | '30' | '60')}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="control-group">
        <label>学习模式</label>
        <div className="button-row">
          <button
            type="button"
            className={learningEnabled ? 'active' : ''}
            onClick={() => onLearningToggle(true)}
          >
            开启
          </button>
          <button
            type="button"
            className={!learningEnabled ? 'active' : ''}
            onClick={() => onLearningToggle(false)}
          >
            关闭
          </button>
        </div>
        <div className="selection-detail">
          已学习对局：{profileSummary?.games ?? 0}，累计落子：{profileSummary?.moves ?? 0}
        </div>
        <div className="button-row">
          <button type="button" onClick={onClearProfile}>
            清空学习
          </button>
          <button type="button" onClick={onClearMemory}>
            清空经验库
          </button>
          <button type="button" onClick={onResetWeights}>
            重置权重
          </button>
        </div>
      </div>
      <button type="button" className="reset" onClick={onReset}>
        重新开始
      </button>
    </section>
  );
};

export default Controls;
