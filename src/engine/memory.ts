import { SIZE } from './lines';
import type { Player } from './board';

const STORAGE_KEY = 'g4_memory_v1';

export interface MemoryMove {
  x: number;
  y: number;
  wins: number;
  losses: number;
  draws: number;
  lastSeen: number;
}

export interface MemoryData {
  version: 1;
  entries: Record<string, MemoryMove[]>;
  order: string[];
  cap: number;
}

const defaultMemory = (): MemoryData => ({
  version: 1,
  entries: {},
  order: [],
  cap: 5000
});

export const loadMemory = (): MemoryData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultMemory();
    }
    const parsed = JSON.parse(raw) as MemoryData;
    if (parsed.version !== 1) {
      return defaultMemory();
    }
    return parsed;
  } catch {
    return defaultMemory();
  }
};

export const saveMemory = (memory: MemoryData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
};

export const clearMemory = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const encodeState = (grid: Int8Array, turn: Player) => {
  let out = '';
  for (let i = 0; i < grid.length; i += 1) {
    const value = grid[i];
    out += value === 0 ? '0' : value === 1 ? '1' : '2';
  }
  return `${out}|${turn}`;
};

const scoreMove = (move: MemoryMove) => move.wins - move.losses + move.draws * 0.2;

export const pickMemoryMoves = (memory: MemoryData, key: string) => {
  const moves = memory.entries[key];
  if (!moves) {
    return [];
  }
  return [...moves].sort((a, b) => scoreMove(b) - scoreMove(a));
};

export const updateMemory = (
  memory: MemoryData,
  key: string,
  move: { x: number; y: number },
  result: 'win' | 'loss' | 'draw'
) => {
  const now = Date.now();
  const next = { ...memory };
  next.entries = { ...memory.entries };
  next.order = [...memory.order];
  if (!next.entries[key]) {
    next.entries[key] = [];
    next.order.push(key);
  }
  const list = [...next.entries[key]];
  const existing = list.find((entry) => entry.x === move.x && entry.y === move.y);
  if (existing) {
    if (result === 'win') existing.wins += 1;
    if (result === 'loss') existing.losses += 1;
    if (result === 'draw') existing.draws += 1;
    existing.lastSeen = now;
  } else {
    list.push({
      x: move.x,
      y: move.y,
      wins: result === 'win' ? 1 : 0,
      losses: result === 'loss' ? 1 : 0,
      draws: result === 'draw' ? 1 : 0,
      lastSeen: now
    });
  }
  next.entries[key] = list;

  if (next.order.length > next.cap) {
    const removeKey = next.order.shift();
    if (removeKey) {
      delete next.entries[removeKey];
    }
  }
  return next;
};

export const captureRecentStates = (
  history: Array<{ grid: Int8Array; move: { x: number; y: number }; turn: Player }>,
  limit: number
) => {
  return history.slice(Math.max(0, history.length - limit));
};

export const columnIndex = (x: number, y: number) => x + y * SIZE;
