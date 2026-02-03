import { ALL_LINES, CELL_LINES, CONNECT, SIZE, coordsFromIndex, index } from './lines';

export type Player = 1 | -1;

export interface MoveResult {
  ok: boolean;
  x?: number;
  y?: number;
  z?: number;
  win: boolean;
  draw: boolean;
  winLines?: number[][];
  message?: string;
}

export interface MoveRecord {
  x: number;
  y: number;
  z: number;
  player: Player;
}

export class Engine {
  grid: Int8Array;
  heights: Int8Array;
  history: MoveRecord[];
  moves: number;

  constructor() {
    this.grid = new Int8Array(SIZE * SIZE * SIZE);
    this.heights = new Int8Array(SIZE * SIZE);
    this.history = [];
    this.moves = 0;
  }

  clone() {
    const copy = new Engine();
    copy.grid = new Int8Array(this.grid);
    copy.heights = new Int8Array(this.heights);
    copy.history = this.history.map((move) => ({ ...move }));
    copy.moves = this.moves;
    return copy;
  }

  getCell(x: number, y: number, z: number) {
    return this.grid[index(x, y, z)];
  }

  getValidMoves() {
    const moves: Array<{ x: number; y: number }> = [];
    for (let x = 0; x < SIZE; x += 1) {
      for (let y = 0; y < SIZE; y += 1) {
        const h = this.heights[x + y * SIZE];
        if (h < SIZE) {
          moves.push({ x, y });
        }
      }
    }
    return moves;
  }

  makeMove(x: number, y: number, player: Player): MoveResult {
    const columnIndex = x + y * SIZE;
    const z = this.heights[columnIndex];
    if (z >= SIZE) {
      return { ok: false, win: false, draw: false, message: '该位置已满，请重新选择' };
    }
    const cellIndex = index(x, y, z);
    this.grid[cellIndex] = player;
    this.heights[columnIndex] = z + 1;
    this.history.push({ x, y, z, player });
    this.moves += 1;

    const winLines = this.checkWinFromCell(cellIndex, player);
    const win = winLines.length > 0;
    const draw = !win && this.moves >= SIZE * SIZE * SIZE;
    return { ok: true, x, y, z, win, draw, winLines };
  }

  undo() {
    const last = this.history.pop();
    if (!last) {
      return;
    }
    const cellIndex = index(last.x, last.y, last.z);
    this.grid[cellIndex] = 0;
    const columnIndex = last.x + last.y * SIZE;
    this.heights[columnIndex] = last.z;
    this.moves -= 1;
  }

  checkWinFromCell(cellIndex: number, player: Player) {
    const lineIndices = CELL_LINES[cellIndex];
    const winLines: number[][] = [];
    for (const lineIndex of lineIndices) {
      const line = ALL_LINES[lineIndex];
      let count = 0;
      for (const cell of line) {
        if (this.grid[cell] === player) {
          count += 1;
        }
      }
      if (count === CONNECT) {
        winLines.push(line);
      }
    }
    return winLines;
  }

  checkWinAll() {
    for (const line of ALL_LINES) {
      const first = this.grid[line[0]];
      if (first === 0) {
        continue;
      }
      let same = true;
      for (let i = 1; i < line.length; i += 1) {
        if (this.grid[line[i]] !== first) {
          same = false;
          break;
        }
      }
      if (same) {
        return { player: first as Player, line };
      }
    }
    return null;
  }

  loadPosition(grid: Int8Array) {
    if (grid.length !== SIZE * SIZE * SIZE) {
      throw new Error('Invalid grid length');
    }
    this.grid = new Int8Array(grid);
    this.heights = new Int8Array(SIZE * SIZE);
    for (let x = 0; x < SIZE; x += 1) {
      for (let y = 0; y < SIZE; y += 1) {
        let height = 0;
        for (let z = 0; z < SIZE; z += 1) {
          if (this.grid[index(x, y, z)] !== 0) {
            height = z + 1;
          }
        }
        this.heights[x + y * SIZE] = height;
      }
    }
    this.moves = Array.from(this.grid).filter((cell) => cell !== 0).length;
  }

  getWinLineCoords(lines: number[][]) {
    return lines.map((line) => line.map((idx) => coordsFromIndex(idx)));
  }
}
