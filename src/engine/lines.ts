export const SIZE = 5;
export const CONNECT = 4;

export type Line = number[];

export const directions: Array<[number, number, number]> = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
  [1, 1, 0],
  [1, -1, 0],
  [1, 0, 1],
  [1, 0, -1],
  [0, 1, 1],
  [0, 1, -1],
  [1, 1, 1],
  [1, 1, -1],
  [1, -1, 1],
  [1, -1, -1]
];

export const index = (x: number, y: number, z: number) => x + y * SIZE + z * SIZE * SIZE;

export const coordsFromIndex = (idx: number) => {
  const z = Math.floor(idx / (SIZE * SIZE));
  const rem = idx % (SIZE * SIZE);
  const y = Math.floor(rem / SIZE);
  const x = rem % SIZE;
  return { x, y, z };
};

export const generateLines = () => {
  const lines: Line[] = [];
  for (let x = 0; x < SIZE; x += 1) {
    for (let y = 0; y < SIZE; y += 1) {
      for (let z = 0; z < SIZE; z += 1) {
        for (const [dx, dy, dz] of directions) {
          const endX = x + dx * (CONNECT - 1);
          const endY = y + dy * (CONNECT - 1);
          const endZ = z + dz * (CONNECT - 1);
          if (endX < 0 || endX >= SIZE || endY < 0 || endY >= SIZE || endZ < 0 || endZ >= SIZE) {
            continue;
          }
          const line: number[] = [];
          for (let step = 0; step < CONNECT; step += 1) {
            line.push(index(x + dx * step, y + dy * step, z + dz * step));
          }
          lines.push(line);
        }
      }
    }
  }
  return lines;
};

export const ALL_LINES = generateLines();

export const buildLineIndex = () => {
  const cellLines: number[][] = Array.from({ length: SIZE * SIZE * SIZE }, () => []);
  ALL_LINES.forEach((line, lineIndex) => {
    line.forEach((cell) => cellLines[cell].push(lineIndex));
  });
  return cellLines;
};

export const CELL_LINES = buildLineIndex();
