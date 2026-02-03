import type { Player } from './board';

type Mode = 'pvp' | 'ai';

export const getPlayerMapping = (mode: Mode, humanFirst: boolean) => {
  if (mode === 'ai') {
    const human: Player = humanFirst ? 1 : -1;
    const ai: Player = humanFirst ? -1 : 1;
    const firstTurn: Player = humanFirst ? human : ai;
    return { human, ai, firstTurn };
  }
  return { human: 1 as Player, ai: -1 as Player, firstTurn: 1 as Player };
};
