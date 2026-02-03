const STORAGE_KEY = 'g4_weights_v1';

export interface Weights {
  center: number;
  two: number;
  three: number;
  blockTwo: number;
  blockThree: number;
  openTwo: number;
  openThree: number;
  height: number;
}

const defaultWeights: Weights = {
  center: 1,
  two: 6,
  three: 40,
  blockTwo: 8,
  blockThree: 60,
  openTwo: 12,
  openThree: 90,
  height: 0.4
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const loadWeights = (): Weights => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultWeights;
    }
    const parsed = JSON.parse(raw) as Partial<Weights>;
    return { ...defaultWeights, ...parsed };
  } catch {
    return defaultWeights;
  }
};

export const saveWeights = (weights: Weights) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(weights));
};

export const clearWeights = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const adjustWeights = (weights: Weights, outcome: 'win' | 'loss' | 'draw') => {
  const next = { ...weights };
  if (outcome === 'loss') {
    next.blockTwo = clamp(next.blockTwo + 0.5, 4, 20);
    next.blockThree = clamp(next.blockThree + 2, 30, 120);
    next.openTwo = clamp(next.openTwo + 1, 6, 24);
    next.openThree = clamp(next.openThree + 2, 40, 140);
  }
  if (outcome === 'win') {
    next.two = clamp(next.two + 0.2, 2, 12);
    next.three = clamp(next.three + 1, 20, 80);
  }
  return next;
};

export const getDefaultWeights = () => ({ ...defaultWeights });
