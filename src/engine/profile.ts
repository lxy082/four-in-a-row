import type { Player } from './board';
import { SIZE } from './lines';

const STORAGE_KEY = 'g4_profile_v1';

export interface ProfileData {
  version: 1;
  games: number;
  moves: number;
  heat: number[];
  stats: {
    centerMoves: number;
    edgeMoves: number;
    totalMoves: number;
    totalZ: number;
    sameColumnStreaks: number;
    lastColumn: number | null;
  };
  updatedAt: number;
}

const defaultProfile = (): ProfileData => ({
  version: 1,
  games: 0,
  moves: 0,
  heat: Array.from({ length: SIZE * SIZE }, () => 0),
  stats: {
    centerMoves: 0,
    edgeMoves: 0,
    totalMoves: 0,
    totalZ: 0,
    sameColumnStreaks: 0,
    lastColumn: null
  },
  updatedAt: Date.now()
});

export const loadProfile = (): ProfileData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultProfile();
    }
    const parsed = JSON.parse(raw) as ProfileData;
    if (parsed.version !== 1) {
      return defaultProfile();
    }
    return parsed;
  } catch {
    return defaultProfile();
  }
};

export const saveProfile = (profile: ProfileData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
};

export const clearProfile = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const updateProfileMove = (
  profile: ProfileData,
  move: { x: number; y: number; z: number },
  player: Player,
  humanPlayer: Player
) => {
  if (player !== humanPlayer) {
    return profile;
  }
  const columnIndex = move.x + move.y * SIZE;
  const next = { ...profile };
  next.moves += 1;
  next.heat = [...profile.heat];
  next.heat[columnIndex] = (next.heat[columnIndex] ?? 0) + 1;
  const dx = Math.abs(move.x - 2);
  const dy = Math.abs(move.y - 2);
  const isCenter = dx <= 1 && dy <= 1;
  const isEdge = move.x === 0 || move.x === 4 || move.y === 0 || move.y === 4;
  next.stats = { ...profile.stats };
  next.stats.totalMoves += 1;
  next.stats.totalZ += move.z;
  if (isCenter) {
    next.stats.centerMoves += 1;
  }
  if (isEdge) {
    next.stats.edgeMoves += 1;
  }
  if (next.stats.lastColumn === columnIndex) {
    next.stats.sameColumnStreaks += 1;
  }
  next.stats.lastColumn = columnIndex;
  next.updatedAt = Date.now();
  return next;
};

export const updateProfileGame = (profile: ProfileData, played: boolean) => {
  if (!played) {
    return profile;
  }
  const next = { ...profile };
  next.games += 1;
  next.updatedAt = Date.now();
  return next;
};

export const getProfileSummary = (profile: ProfileData) => {
  const total = Math.max(profile.stats.totalMoves, 1);
  const centerBias = profile.stats.centerMoves / total;
  const edgeBias = profile.stats.edgeMoves / total;
  const avgZ = profile.stats.totalZ / total;
  return {
    centerBias,
    edgeBias,
    avgZ,
    moves: profile.moves,
    games: profile.games
  };
};
