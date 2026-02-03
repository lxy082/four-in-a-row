export const softmaxSample = (moves: Array<{ x: number; y: number; score: number }>, temperature: number) => {
  if (moves.length === 0) {
    return null;
  }
  const maxScore = Math.max(...moves.map((m) => m.score));
  const scaled = moves.map((move) => Math.exp((move.score - maxScore) / Math.max(temperature, 0.0001)));
  const total = scaled.reduce((sum, value) => sum + value, 0);
  let threshold = Math.random() * total;
  for (let i = 0; i < moves.length; i += 1) {
    threshold -= scaled[i];
    if (threshold <= 0) {
      return moves[i];
    }
  }
  return moves[moves.length - 1];
};
