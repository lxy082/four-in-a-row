// src/main.tsx
import ReactDOM from "react-dom/client";

// src/App.tsx
import { useEffect as useEffect2, useMemo as useMemo2, useRef as useRef2, useState } from "react";

// src/engine/lines.ts
var SIZE = 5;
var CONNECT = 4;
var directions = [
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
var index = (x, y, z) => x + y * SIZE + z * SIZE * SIZE;
var coordsFromIndex = (idx) => {
  const z = Math.floor(idx / (SIZE * SIZE));
  const rem = idx % (SIZE * SIZE);
  const y = Math.floor(rem / SIZE);
  const x = rem % SIZE;
  return { x, y, z };
};
var generateLines = () => {
  const lines = [];
  for (let x = 0;x < SIZE; x += 1) {
    for (let y = 0;y < SIZE; y += 1) {
      for (let z = 0;z < SIZE; z += 1) {
        for (const [dx, dy, dz] of directions) {
          const endX = x + dx * (CONNECT - 1);
          const endY = y + dy * (CONNECT - 1);
          const endZ = z + dz * (CONNECT - 1);
          if (endX < 0 || endX >= SIZE || endY < 0 || endY >= SIZE || endZ < 0 || endZ >= SIZE) {
            continue;
          }
          const line = [];
          for (let step = 0;step < CONNECT; step += 1) {
            line.push(index(x + dx * step, y + dy * step, z + dz * step));
          }
          lines.push(line);
        }
      }
    }
  }
  return lines;
};
var ALL_LINES = generateLines();
var buildLineIndex = () => {
  const cellLines = Array.from({ length: SIZE * SIZE * SIZE }, () => []);
  ALL_LINES.forEach((line, lineIndex) => {
    line.forEach((cell) => cellLines[cell].push(lineIndex));
  });
  return cellLines;
};
var CELL_LINES = buildLineIndex();

// src/engine/board.ts
class Engine {
  grid;
  heights;
  history;
  moves;
  constructor() {
    this.grid = new Int8Array(SIZE * SIZE * SIZE);
    this.heights = new Int8Array(SIZE * SIZE);
    this.history = [];
    this.moves = 0;
  }
  clone() {
    const copy = new Engine;
    copy.grid = new Int8Array(this.grid);
    copy.heights = new Int8Array(this.heights);
    copy.history = this.history.map((move) => ({ ...move }));
    copy.moves = this.moves;
    return copy;
  }
  getCell(x, y, z) {
    return this.grid[index(x, y, z)];
  }
  getValidMoves() {
    const moves = [];
    for (let x = 0;x < SIZE; x += 1) {
      for (let y = 0;y < SIZE; y += 1) {
        const h = this.heights[x + y * SIZE];
        if (h < SIZE) {
          moves.push({ x, y });
        }
      }
    }
    return moves;
  }
  makeMove(x, y, player) {
    const columnIndex = x + y * SIZE;
    const z = this.heights[columnIndex];
    if (z >= SIZE) {
      return { ok: false, win: false, draw: false, message: "该位置已满，请重新选择" };
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
  checkWinFromCell(cellIndex, player) {
    const lineIndices = CELL_LINES[cellIndex];
    const winLines = [];
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
      for (let i = 1;i < line.length; i += 1) {
        if (this.grid[line[i]] !== first) {
          same = false;
          break;
        }
      }
      if (same) {
        return { player: first, line };
      }
    }
    return null;
  }
  loadPosition(grid) {
    if (grid.length !== SIZE * SIZE * SIZE) {
      throw new Error("Invalid grid length");
    }
    this.grid = new Int8Array(grid);
    this.heights = new Int8Array(SIZE * SIZE);
    for (let x = 0;x < SIZE; x += 1) {
      for (let y = 0;y < SIZE; y += 1) {
        let height = 0;
        for (let z = 0;z < SIZE; z += 1) {
          if (this.grid[index(x, y, z)] !== 0) {
            height = z + 1;
          }
        }
        this.heights[x + y * SIZE] = height;
      }
    }
    this.moves = Array.from(this.grid).filter((cell) => cell !== 0).length;
  }
  getWinLineCoords(lines) {
    return lines.map((line) => line.map((idx) => coordsFromIndex(idx)));
  }
}

// src/ui/Controls.tsx
import { jsxDEV } from "react/jsx-dev-runtime";
var Controls = ({
  mode,
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
}) => {
  const selectedText = selectedMove ? `已选择柱子：(${selectedMove.x}, ${selectedMove.y})` : "未选择柱子";
  const heightText = selectedMove && selectedHeight !== null ? isSelectedFull ? "该柱已满" : `预计落点高度 z = ${selectedHeight}` : "请选择柱子";
  const hoverText = hoveredMove && hoveredHeight !== null ? `悬停柱子：(${hoveredMove.x}, ${hoveredMove.y})，预计落点 z = ${hoveredHeight >= 5 ? "满" : hoveredHeight}` : "悬停提示：移动到柱子查看落点";
  return /* @__PURE__ */ jsxDEV("section", {
    className: "controls",
    children: [
      /* @__PURE__ */ jsxDEV("h2", {
        children: "控制面板"
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsxDEV("div", {
        className: "selection-info",
        children: [
          /* @__PURE__ */ jsxDEV("p", {
            className: "selection-title",
            children: selectedText
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsxDEV("p", {
            className: isSelectedFull ? "selection-warning" : "selection-detail",
            children: heightText
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsxDEV("p", {
            className: "selection-detail",
            children: hoverText
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsxDEV("button", {
            type: "button",
            className: "confirm",
            onClick: onConfirmMove,
            disabled: !canConfirm,
            children: isAnimating ? "落子动画中..." : "落子"
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsxDEV("div", {
        className: "control-group",
        children: [
          /* @__PURE__ */ jsxDEV("label", {
            children: "模式"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsxDEV("div", {
            className: "button-row",
            children: [
              /* @__PURE__ */ jsxDEV("button", {
                type: "button",
                className: mode === "pvp" ? "active" : "",
                onClick: () => onModeChange("pvp"),
                children: "PVP"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsxDEV("button", {
                type: "button",
                className: mode === "ai" ? "active" : "",
                onClick: () => onModeChange("ai"),
                children: "人机"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsxDEV("div", {
            className: "selection-detail",
            children: [
              "随机强度：",
              randomIntensity.toFixed(2)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsxDEV("input", {
            type: "range",
            min: "0",
            max: "1",
            step: "0.05",
            value: randomIntensity,
            onChange: (event) => onRandomIntensityChange(Number(event.target.value))
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsxDEV("div", {
            className: "selection-detail",
            children: [
              "随机种子：",
              randomSeed
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsxDEV("input", {
            type: "number",
            value: randomSeed,
            onChange: (event) => onRandomSeedChange(Number(event.target.value) || 0)
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      mode === "ai" && /* @__PURE__ */ jsxDEV("div", {
        className: "control-group",
        children: [
          /* @__PURE__ */ jsxDEV("label", {
            children: "先手"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsxDEV("div", {
            className: "button-row",
            children: [
              /* @__PURE__ */ jsxDEV("button", {
                type: "button",
                className: humanFirst ? "active" : "",
                onClick: () => onHumanFirstChange(true),
                children: "人类先手"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsxDEV("button", {
                type: "button",
                className: !humanFirst ? "active" : "",
                onClick: () => onHumanFirstChange(false),
                children: "AI 先手"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsxDEV("div", {
        className: "control-group",
        children: [
          /* @__PURE__ */ jsxDEV("label", {
            children: "计时模式"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsxDEV("div", {
            className: "button-row",
            children: [
              { value: "off", label: "OFF" },
              { value: "30", label: "30s/步" },
              { value: "60", label: "60s/步" }
            ].map((option) => /* @__PURE__ */ jsxDEV("button", {
              type: "button",
              className: timeControl === option.value ? "active" : "",
              onClick: () => onTimeControlChange(option.value),
              children: option.label
            }, option.value, false, undefined, this))
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsxDEV("div", {
        className: "control-group",
        children: [
          /* @__PURE__ */ jsxDEV("label", {
            children: "学习模式"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsxDEV("div", {
            className: "button-row",
            children: [
              /* @__PURE__ */ jsxDEV("button", {
                type: "button",
                className: learningEnabled ? "active" : "",
                onClick: () => onLearningToggle(true),
                children: "开启"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsxDEV("button", {
                type: "button",
                className: !learningEnabled ? "active" : "",
                onClick: () => onLearningToggle(false),
                children: "关闭"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsxDEV("div", {
            className: "selection-detail",
            children: [
              "已学习对局：",
              profileSummary?.games ?? 0,
              "，累计落子：",
              profileSummary?.moves ?? 0
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsxDEV("div", {
            className: "button-row",
            children: [
              /* @__PURE__ */ jsxDEV("button", {
                type: "button",
                onClick: onClearProfile,
                children: "清空学习"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsxDEV("button", {
                type: "button",
                onClick: onClearMemory,
                children: "清空经验库"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsxDEV("button", {
                type: "button",
                onClick: onResetWeights,
                children: "重置权重"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsxDEV("button", {
        type: "button",
        className: "reset",
        onClick: onReset,
        children: "重新开始"
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
};
var Controls_default = Controls;

// src/ui/StatusBar.tsx
import { jsxDEV as jsxDEV2 } from "react/jsx-dev-runtime";
var StatusBar = ({ mode, difficultyLabel, status, aiThinking, timeControl, timeLeft }) => {
  return /* @__PURE__ */ jsxDEV2("header", {
    className: "status-bar",
    children: [
      /* @__PURE__ */ jsxDEV2("div", {
        children: [
          /* @__PURE__ */ jsxDEV2("strong", {
            children: "模式："
          }, undefined, false, undefined, this),
          mode === "pvp" ? "PVP" : "人机"
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsxDEV2("div", {
        children: [
          /* @__PURE__ */ jsxDEV2("strong", {
            children: "计时："
          }, undefined, false, undefined, this),
          timeControl === "off" ? "OFF" : `${timeControl}s/步`,
          "（剩余 ",
          timeLeft,
          "）"
        ]
      }, undefined, true, undefined, this),
      mode === "ai" && /* @__PURE__ */ jsxDEV2("div", {
        children: [
          /* @__PURE__ */ jsxDEV2("strong", {
            children: "AI 难度："
          }, undefined, false, undefined, this),
          difficultyLabel
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsxDEV2("div", {
        children: [
          /* @__PURE__ */ jsxDEV2("strong", {
            children: "状态："
          }, undefined, false, undefined, this),
          status,
          aiThinking && /* @__PURE__ */ jsxDEV2("span", {
            className: "thinking",
            children: " · AI 思考中..."
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
};
var StatusBar_default = StatusBar;

// src/ui/ThreeBoard.tsx
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { jsxDEV as jsxDEV3, Fragment } from "react/jsx-dev-runtime";
var spacing = 1.2;
var boardThickness = 0.4;
var boardTop = -2.8;
var boardY = boardTop - boardThickness / 2;
var columnHeight = spacing * 4 + 0.6;
var columnInset = 0.08;
var columnCenterY = boardTop + columnHeight / 2 - columnInset;
var selectThreshold = 6;
var toWorld = (x, y, z) => {
  return {
    x: (x - 2) * spacing,
    y: (z - 2) * spacing,
    z: (y - 2) * spacing
  };
};
var Piece = ({
  x,
  y,
  z,
  player,
  highlight,
  animate
}) => {
  const ref = useRef(null);
  const target = toWorld(x, y, z);
  const startY = animate ? target.y + 4 : target.y;
  const currentY = useRef(startY);
  useFrame((_, delta) => {
    if (!ref.current) {
      return;
    }
    if (currentY.current > target.y) {
      currentY.current = Math.max(target.y, currentY.current - delta * 6);
      ref.current.position.y = currentY.current;
    }
  });
  const color = player === 1 ? "#ef4444" : "#2563eb";
  const emissive = highlight ? new THREE.Color("#f5e663") : new THREE.Color("#000000");
  return /* @__PURE__ */ jsxDEV3("mesh", {
    ref,
    position: [target.x, startY, target.z],
    castShadow: true,
    children: [
      /* @__PURE__ */ jsxDEV3("sphereGeometry", {
        args: [0.42, 32, 32]
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsxDEV3("meshStandardMaterial", {
        color,
        emissive,
        emissiveIntensity: highlight ? 0.8 : 0.2
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
};
var BoardScene = ({
  grid,
  heights,
  hovered,
  onHover,
  selected,
  onSelect,
  lastMove,
  winIndices,
  locked,
  version
}) => {
  const { gl, camera } = useThree();
  const pickMeshes = useRef([]);
  const raycaster = useMemo(() => new THREE.Raycaster, []);
  const pointer = useMemo(() => new THREE.Vector2, []);
  const pointerDownRef = useRef(null);
  const hoverRef = useRef(null);
  const columns = useMemo(() => {
    const cells = [];
    for (let x = 0;x < SIZE; x += 1) {
      for (let y = 0;y < SIZE; y += 1) {
        cells.push({ x, y });
      }
    }
    return cells;
  }, []);
  const hoverHeight = hovered ? heights[hovered.x + hovered.y * SIZE] : null;
  const hoverPosition = hovered && hoverHeight !== null && hoverHeight < SIZE ? toWorld(hovered.x, hovered.y, hoverHeight) : null;
  useEffect(() => {
    const dom = gl.domElement;
    const getIntersection = (event) => {
      const rect = dom.getBoundingClientRect();
      pointer.x = (event.clientX - rect.left) / rect.width * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(pickMeshes.current.filter(Boolean), false);
      if (intersects.length === 0) {
        return null;
      }
      const hit = intersects[0].object;
      return hit.userData;
    };
    const handlePointerDown = (event) => {
      if (locked) {
        return;
      }
      pointerDownRef.current = { x: event.clientX, y: event.clientY };
    };
    const handlePointerMove = (event) => {
      if (locked) {
        if (hoverRef.current) {
          hoverRef.current = null;
          onHover(null);
        }
        return;
      }
      const hit = getIntersection(event);
      if (!hit) {
        if (hoverRef.current) {
          hoverRef.current = null;
          onHover(null);
        }
        return;
      }
      if (!hoverRef.current || hoverRef.current.x !== hit.x || hoverRef.current.y !== hit.y) {
        hoverRef.current = hit;
        onHover(hit);
      }
    };
    const handlePointerUp = (event) => {
      if (locked) {
        pointerDownRef.current = null;
        return;
      }
      const start = pointerDownRef.current;
      pointerDownRef.current = null;
      if (!start) {
        return;
      }
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.hypot(dx, dy) > selectThreshold) {
        return;
      }
      const hit = getIntersection(event);
      if (hit) {
        onSelect(hit);
      }
    };
    const handlePointerLeave = () => {
      pointerDownRef.current = null;
      if (hoverRef.current) {
        hoverRef.current = null;
        onHover(null);
      }
    };
    dom.addEventListener("pointerdown", handlePointerDown);
    dom.addEventListener("pointermove", handlePointerMove);
    dom.addEventListener("pointerup", handlePointerUp);
    dom.addEventListener("pointerleave", handlePointerLeave);
    return () => {
      dom.removeEventListener("pointerdown", handlePointerDown);
      dom.removeEventListener("pointermove", handlePointerMove);
      dom.removeEventListener("pointerup", handlePointerUp);
      dom.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [camera, gl, locked, onHover, onSelect, pointer, raycaster]);
  return /* @__PURE__ */ jsxDEV3(Fragment, {
    children: [
      /* @__PURE__ */ jsxDEV3("ambientLight", {
        intensity: 0.9
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsxDEV3("directionalLight", {
        position: [6, 10, 6],
        intensity: 1.2,
        castShadow: true
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsxDEV3(OrbitControls, {
        enablePan: false
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsxDEV3("group", {
        children: [
          /* @__PURE__ */ jsxDEV3("mesh", {
            position: [0, boardY, 0],
            receiveShadow: true,
            children: [
              /* @__PURE__ */ jsxDEV3("boxGeometry", {
                args: [7, boardThickness, 7]
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsxDEV3("meshStandardMaterial", {
                color: "#f8fafc"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsxDEV3("lineSegments", {
            children: [
              /* @__PURE__ */ jsxDEV3("edgesGeometry", {
                args: [new THREE.BoxGeometry(6, 6, 6)]
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsxDEV3("lineBasicMaterial", {
                color: "#cbd5f5"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          columns.map((column) => {
            const isHovered = hovered?.x === column.x && hovered?.y === column.y;
            const isSelected = selected?.x === column.x && selected?.y === column.y;
            const pos = toWorld(column.x, column.y, 2);
            const index2 = column.x + column.y * SIZE;
            return /* @__PURE__ */ jsxDEV3("group", {
              position: [pos.x, 0, pos.z],
              children: [
                /* @__PURE__ */ jsxDEV3("mesh", {
                  position: [0, columnCenterY, 0],
                  children: [
                    /* @__PURE__ */ jsxDEV3("cylinderGeometry", {
                      args: [0.05, 0.05, columnHeight, 12]
                    }, undefined, false, undefined, this),
                    /* @__PURE__ */ jsxDEV3("meshStandardMaterial", {
                      color: isSelected ? "#f59e0b" : isHovered ? "#38bdf8" : "#94a3b8",
                      transparent: true,
                      opacity: isSelected ? 0.9 : 0.6
                    }, undefined, false, undefined, this)
                  ]
                }, undefined, true, undefined, this),
                /* @__PURE__ */ jsxDEV3("mesh", {
                  ref: (mesh) => {
                    pickMeshes.current[index2] = mesh;
                    if (mesh) {
                      mesh.userData = { x: column.x, y: column.y };
                    }
                  },
                  position: [0, columnCenterY, 0],
                  children: [
                    /* @__PURE__ */ jsxDEV3("cylinderGeometry", {
                      args: [0.35, 0.35, columnHeight, 12]
                    }, undefined, false, undefined, this),
                    /* @__PURE__ */ jsxDEV3("meshStandardMaterial", {
                      transparent: true,
                      opacity: 0
                    }, undefined, false, undefined, this)
                  ]
                }, undefined, true, undefined, this)
              ]
            }, `column-${column.x}-${column.y}-${version}`, true, undefined, this);
          }),
          hoverPosition && /* @__PURE__ */ jsxDEV3("mesh", {
            position: [hoverPosition.x, hoverPosition.y, hoverPosition.z],
            children: [
              /* @__PURE__ */ jsxDEV3("sphereGeometry", {
                args: [0.3, 16, 16]
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsxDEV3("meshStandardMaterial", {
                color: "#ffffff",
                transparent: true,
                opacity: 0.5
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          Array.from(grid.entries()).map(([cellIndex, value]) => {
            if (value === 0) {
              return null;
            }
            const { x, y, z } = coordsFromIndex(cellIndex);
            const animate = Boolean(lastMove && lastMove.x === x && lastMove.y === y && lastMove.z === z);
            return /* @__PURE__ */ jsxDEV3(Piece, {
              x,
              y,
              z,
              player: value,
              highlight: winIndices.has(cellIndex),
              animate
            }, `piece-${cellIndex}`, false, undefined, this);
          })
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
};
var ThreeBoard = (props) => {
  return /* @__PURE__ */ jsxDEV3("div", {
    className: "board-container",
    children: /* @__PURE__ */ jsxDEV3(Canvas, {
      shadows: true,
      camera: { position: [6, 6, 6], fov: 45 },
      children: /* @__PURE__ */ jsxDEV3(BoardScene, {
        ...props
      }, undefined, false, undefined, this)
    }, undefined, false, undefined, this)
  }, undefined, false, undefined, this);
};
var ThreeBoard_default = ThreeBoard;

// src/engine/playerMapping.ts
var getPlayerMapping = (mode, humanFirst) => {
  if (mode === "ai") {
    const human = humanFirst ? 1 : -1;
    const ai = humanFirst ? -1 : 1;
    const firstTurn = humanFirst ? human : ai;
    return { human, ai, firstTurn };
  }
  return { human: 1, ai: -1, firstTurn: 1 };
};

// src/engine/profile.ts
var STORAGE_KEY = "g4_profile_v1";
var defaultProfile = () => ({
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
var loadProfile = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultProfile();
    }
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1) {
      return defaultProfile();
    }
    return parsed;
  } catch {
    return defaultProfile();
  }
};
var saveProfile = (profile) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
};
var clearProfile = () => {
  localStorage.removeItem(STORAGE_KEY);
};
var updateProfileMove = (profile, move, player, humanPlayer) => {
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
var updateProfileGame = (profile, played) => {
  if (!played) {
    return profile;
  }
  const next = { ...profile };
  next.games += 1;
  next.updatedAt = Date.now();
  return next;
};
var getProfileSummary = (profile) => {
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

// src/engine/memory.ts
var STORAGE_KEY2 = "g4_memory_v1";
var defaultMemory = () => ({
  version: 1,
  entries: {},
  order: [],
  cap: 5000
});
var loadMemory = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY2);
    if (!raw) {
      return defaultMemory();
    }
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1) {
      return defaultMemory();
    }
    return parsed;
  } catch {
    return defaultMemory();
  }
};
var saveMemory = (memory) => {
  localStorage.setItem(STORAGE_KEY2, JSON.stringify(memory));
};
var clearMemory = () => {
  localStorage.removeItem(STORAGE_KEY2);
};
var encodeState = (grid, turn) => {
  let out = "";
  for (let i = 0;i < grid.length; i += 1) {
    const value = grid[i];
    out += value === 0 ? "0" : value === 1 ? "1" : "2";
  }
  return `${out}|${turn}`;
};
var scoreMove = (move) => move.wins - move.losses + move.draws * 0.2;
var pickMemoryMoves = (memory, key) => {
  const moves = memory.entries[key];
  if (!moves) {
    return [];
  }
  return [...moves].sort((a, b) => scoreMove(b) - scoreMove(a));
};
var updateMemory = (memory, key, move, result) => {
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
    if (result === "win")
      existing.wins += 1;
    if (result === "loss")
      existing.losses += 1;
    if (result === "draw")
      existing.draws += 1;
    existing.lastSeen = now;
  } else {
    list.push({
      x: move.x,
      y: move.y,
      wins: result === "win" ? 1 : 0,
      losses: result === "loss" ? 1 : 0,
      draws: result === "draw" ? 1 : 0,
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
var captureRecentStates = (history, limit) => {
  return history.slice(Math.max(0, history.length - limit));
};

// src/engine/weights.ts
var STORAGE_KEY3 = "g4_weights_v1";
var defaultWeights = {
  center: 1,
  two: 6,
  three: 40,
  blockTwo: 8,
  blockThree: 60,
  openTwo: 12,
  openThree: 90,
  height: 0.4
};
var clamp = (value, min, max) => Math.max(min, Math.min(max, value));
var loadWeights = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY3);
    if (!raw) {
      return defaultWeights;
    }
    const parsed = JSON.parse(raw);
    return { ...defaultWeights, ...parsed };
  } catch {
    return defaultWeights;
  }
};
var saveWeights = (weights) => {
  localStorage.setItem(STORAGE_KEY3, JSON.stringify(weights));
};
var clearWeights = () => {
  localStorage.removeItem(STORAGE_KEY3);
};
var adjustWeights = (weights, outcome) => {
  const next = { ...weights };
  if (outcome === "loss") {
    next.blockTwo = clamp(next.blockTwo + 0.5, 4, 20);
    next.blockThree = clamp(next.blockThree + 2, 30, 120);
    next.openTwo = clamp(next.openTwo + 1, 6, 24);
    next.openThree = clamp(next.openThree + 2, 40, 140);
  }
  if (outcome === "win") {
    next.two = clamp(next.two + 0.2, 2, 12);
    next.three = clamp(next.three + 1, 20, 80);
  }
  return next;
};
var getDefaultWeights = () => ({ ...defaultWeights });

// src/App.tsx
import { jsxDEV as jsxDEV4 } from "react/jsx-dev-runtime";
var playerLabel = (player) => player === 1 ? "红方" : "蓝方";
var App = () => {
  const engineRef = useRef2(new Engine);
  const workerRef = useRef2(null);
  const [version, setVersion] = useState(0);
  const [currentTurn, setCurrentTurn] = useState(1);
  const [mode, setMode] = useState("pvp");
  const aiDifficultyLabel = "HARD";
  const [humanFirst, setHumanFirst] = useState(true);
  const [humanPlayer, setHumanPlayer] = useState(1);
  const [aiPlayer, setAiPlayer] = useState(-1);
  const [learningEnabled, setLearningEnabled] = useState(true);
  const [profile, setProfile] = useState(loadProfile());
  const [weights, setWeights] = useState(loadWeights());
  const [memory, setMemory] = useState(loadMemory());
  const [randomIntensity, setRandomIntensity] = useState(0.6);
  const [randomSeed, setRandomSeed] = useState(1);
  const [timeControl, setTimeControl] = useState("off");
  const [timeLeftMs, setTimeLeftMs] = useState(null);
  const [gameStatus, setGameStatus] = useState("playing");
  const [winner, setWinner] = useState(null);
  const [winLines, setWinLines] = useState([]);
  const [hovered, setHovered] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedMove, setSelectedMove] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const winnerRef = useRef2(null);
  const gameStatusRef = useRef2("playing");
  const moveInProgressRef = useRef2(false);
  const aiRequestRef = useRef2(false);
  const turnDeadlineRef = useRef2(null);
  const aiTimeoutRef = useRef2(null);
  const humanPlayerRef = useRef2(1);
  const aiPlayerRef = useRef2(-1);
  const aiRequestTurnRef = useRef2(null);
  const historyRef = useRef2([]);
  useEffect2(() => {
    workerRef.current = new Worker(new URL("./aiWorker.js", import.meta.url), { type: "module" });
    workerRef.current.onmessage = (event) => {
      const move = event.data?.move;
      setAiThinking(false);
      aiRequestRef.current = false;
      if (aiTimeoutRef.current) {
        window.clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
      if (winnerRef.current || gameStatusRef.current !== "playing") {
        return;
      }
      if (aiRequestTurnRef.current !== currentTurn || currentTurn !== aiPlayerRef.current) {
        aiRequestTurnRef.current = null;
        return;
      }
      const nextMove = move ?? pickFallbackMove();
      if (!nextMove) {
        return;
      }
      applyMove(nextMove.x, nextMove.y, aiPlayerRef.current, true);
    };
    workerRef.current.onerror = (error) => {
      console.error("AI worker failed:", error);
      setAiThinking(false);
      aiRequestRef.current = false;
      const fallback = pickFallbackMove();
      if (fallback && gameStatusRef.current === "playing" && aiRequestTurnRef.current === currentTurn && currentTurn === aiPlayerRef.current) {
        applyMove(fallback.x, fallback.y, aiPlayerRef.current, true);
      }
    };
    return () => workerRef.current?.terminate();
  }, []);
  useEffect2(() => {
    saveProfile(profile);
  }, [profile]);
  useEffect2(() => {
    saveMemory(memory);
  }, [memory]);
  useEffect2(() => {
    saveWeights(weights);
  }, [weights]);
  useEffect2(() => {
    resetGame();
  }, [mode, humanFirst]);
  useEffect2(() => {
    if (mode === "ai" && gameStatus === "playing" && currentTurn === aiPlayer && !aiThinking && !isAnimating && !moveInProgressRef.current) {
      requestAiMove();
    }
  }, [mode, gameStatus, currentTurn, aiPlayer, aiThinking, isAnimating, timeLeftMs]);
  useEffect2(() => {
    if (gameStatus !== "playing") {
      turnDeadlineRef.current = null;
      setTimeLeftMs(null);
      return;
    }
    if (timeControl === "off") {
      turnDeadlineRef.current = null;
      setTimeLeftMs(null);
      return;
    }
    const baseMs = timeControl === "30" ? 30000 : 60000;
    const deadline = performance.now() + baseMs;
    turnDeadlineRef.current = deadline;
    setTimeLeftMs(baseMs);
  }, [currentTurn, gameStatus, timeControl]);
  useEffect2(() => {
    if (gameStatus !== "playing" || timeControl === "off") {
      return;
    }
    const interval = window.setInterval(() => {
      if (!turnDeadlineRef.current) {
        return;
      }
      const remaining = Math.max(0, Math.ceil(turnDeadlineRef.current - performance.now()));
      setTimeLeftMs(remaining);
      if (remaining <= 0) {
        const loser = currentTurn;
        const winnerPlayer = loser === 1 ? -1 : 1;
        setWinner(winnerPlayer);
        setGameStatus("won");
        setSelectedMove(null);
        setAiThinking(false);
        aiRequestRef.current = false;
        moveInProgressRef.current = false;
      }
    }, 200);
    return () => window.clearInterval(interval);
  }, [currentTurn, gameStatus, timeControl]);
  useEffect2(() => {
    winnerRef.current = winner;
  }, [winner]);
  useEffect2(() => {
    gameStatusRef.current = gameStatus;
  }, [gameStatus]);
  useEffect2(() => {
    if (gameStatus !== "playing") {
      setAiThinking(false);
      aiRequestRef.current = false;
      aiRequestTurnRef.current = null;
      if (aiTimeoutRef.current) {
        window.clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
    }
  }, [gameStatus]);
  useEffect2(() => {
    if (gameStatus === "won" || gameStatus === "draw") {
      if (!learningEnabled) {
        return;
      }
      const outcome = gameStatus === "draw" ? "draw" : winner === aiPlayer ? "win" : "loss";
      const recent = captureRecentStates(historyRef.current, 10);
      let nextMemory = memory;
      recent.forEach((state) => {
        const key = encodeState(state.grid, state.turn);
        nextMemory = updateMemory(nextMemory, key, state.move, outcome);
      });
      setMemory(nextMemory);
      setWeights(adjustWeights(weights, outcome));
      setProfile((prev) => updateProfileGame(prev, true));
    }
  }, [gameStatus, learningEnabled, winner, aiPlayer, memory, weights]);
  const resetGame = () => {
    engineRef.current = new Engine;
    setVersion((v) => v + 1);
    const mapping = getPlayerMapping(mode, humanFirst);
    if (mode === "ai" && mapping.human === mapping.ai) {
      console.error("Invalid player mapping: human and AI players are identical.");
    }
    setHumanPlayer(mapping.human);
    setAiPlayer(mapping.ai);
    humanPlayerRef.current = mapping.human;
    aiPlayerRef.current = mapping.ai;
    setCurrentTurn(mapping.firstTurn);
    setWinner(null);
    setGameStatus("playing");
    setWinLines([]);
    setLastMove(null);
    setHovered(null);
    setAiThinking(false);
    setSelectedMove(null);
    setIsAnimating(false);
    setTimeLeftMs(null);
    turnDeadlineRef.current = null;
    moveInProgressRef.current = false;
    historyRef.current = [];
    if (aiTimeoutRef.current) {
      window.clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }
    aiRequestTurnRef.current = null;
  };
  const pickFallbackMove = () => {
    const moves = engineRef.current.getValidMoves();
    moves.sort((a, b) => {
      const da = Math.abs(a.x - 2) + Math.abs(a.y - 2);
      const db = Math.abs(b.x - 2) + Math.abs(b.y - 2);
      return da - db;
    });
    return moves[0] ?? null;
  };
  const requestAiMove = () => {
    if (!workerRef.current) {
      return;
    }
    if (aiThinking || aiRequestRef.current || gameStatus !== "playing" || isAnimating || currentTurn !== aiPlayerRef.current) {
      return;
    }
    const baseLimit = 30000;
    const remaining = timeLeftMs ?? null;
    const timeLimitMs = remaining ? Math.max(200, Math.min(baseLimit, remaining - 50)) : baseLimit;
    aiRequestRef.current = true;
    aiRequestTurnRef.current = currentTurn;
    setAiThinking(true);
    if (aiTimeoutRef.current) {
      window.clearTimeout(aiTimeoutRef.current);
    }
    aiTimeoutRef.current = window.setTimeout(() => {
      if (aiRequestRef.current && gameStatusRef.current === "playing" && aiRequestTurnRef.current === currentTurn && currentTurn === aiPlayerRef.current) {
        console.warn("AI timeout reached, using fallback move.");
        aiRequestRef.current = false;
        setAiThinking(false);
        const fallback = pickFallbackMove();
        if (fallback) {
          applyMove(fallback.x, fallback.y, aiPlayerRef.current, true);
        }
      }
    }, timeLimitMs + 100);
    const memoryKey = encodeState(engineRef.current.grid, currentTurn);
    const memoryMoves = pickMemoryMoves(memory, memoryKey).map((entry) => ({
      x: entry.x,
      y: entry.y,
      score: entry.wins - entry.losses + entry.draws * 0.2
    }));
    workerRef.current.postMessage({
      grid: Array.from(engineRef.current.grid),
      heights: Array.from(engineRef.current.heights),
      moves: engineRef.current.moves,
      player: aiPlayerRef.current,
      timeLimitMs,
      weights,
      profile,
      memoryMoves,
      randomSeed,
      randomIntensity
    });
  };
  const applyMove = (x, y, player, fromAi = false) => {
    if (gameStatus !== "playing" || aiThinking || isAnimating) {
      return;
    }
    if (moveInProgressRef.current) {
      return;
    }
    if (player !== currentTurn) {
      console.error("Move rejected: player does not match current turn.", { player, currentTurn });
      return;
    }
    if (mode === "ai" && fromAi && player !== aiPlayer) {
      console.error("Move rejected: AI attempted to play human color.", { player, aiPlayer });
      return;
    }
    if (mode === "ai" && !fromAi && player !== humanPlayer) {
      console.error("Move rejected: Human attempted to play AI color.", { player, humanPlayer });
      return;
    }
    moveInProgressRef.current = true;
    const result = engineRef.current.makeMove(x, y, player);
    if (!result.ok) {
      setToast(result.message ?? "该位置已满，请重新选择");
      setTimeout(() => setToast(null), 1200);
      moveInProgressRef.current = false;
      return;
    }
    historyRef.current = [
      ...historyRef.current,
      { grid: new Int8Array(engineRef.current.grid), move: { x, y }, turn: currentTurn }
    ];
    if (learningEnabled) {
      setProfile((prev) => updateProfileMove(prev, { x, y, z: result.z }, player, humanPlayer));
    }
    setLastMove({ x, y, z: result.z, player });
    setVersion((v) => v + 1);
    setSelectedMove(null);
    setIsAnimating(true);
    window.setTimeout(() => {
      setIsAnimating(false);
      moveInProgressRef.current = false;
    }, 500);
    if (result.win) {
      setWinner(player);
      setWinLines(result.winLines ?? []);
      setGameStatus("won");
      return;
    }
    if (result.draw) {
      setGameStatus("draw");
      return;
    }
    setCurrentTurn((prev) => prev === 1 ? -1 : 1);
  };
  const grid = engineRef.current.grid;
  const heights = engineRef.current.heights;
  const winIndices = useMemo2(() => {
    const set = new Set;
    winLines.forEach((line) => line.forEach((idx) => set.add(idx)));
    return set;
  }, [winLines]);
  const statusText = winner ? `胜者：${playerLabel(winner)}` : gameStatus === "draw" ? "平局：棋盘已满" : `当前回合：${playerLabel(currentTurn)}`;
  const timeLeftDisplay = timeLeftMs === null ? "未开启" : `${Math.ceil(timeLeftMs / 1000)}s`;
  const selectedHeight = selectedMove ? engineRef.current.heights[selectedMove.x + selectedMove.y * SIZE] : null;
  const hoveredHeight = hovered ? engineRef.current.heights[hovered.x + hovered.y * SIZE] : null;
  const isSelectedFull = selectedHeight !== null && selectedHeight >= SIZE;
  const canConfirmMove = gameStatus === "playing" && !isAnimating && !aiThinking && Boolean(selectedMove) && !isSelectedFull && (mode === "pvp" || currentTurn === humanPlayer);
  return /* @__PURE__ */ jsxDEV4("div", {
    className: "app",
    children: [
      /* @__PURE__ */ jsxDEV4(StatusBar_default, {
        mode,
        difficultyLabel: aiDifficultyLabel,
        status: statusText,
        aiThinking,
        timeControl,
        timeLeft: timeLeftDisplay
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsxDEV4("div", {
        className: "layout",
        children: [
          /* @__PURE__ */ jsxDEV4("div", {
            className: "board-panel",
            children: [
              /* @__PURE__ */ jsxDEV4(ThreeBoard_default, {
                grid,
                heights,
                hovered,
                onHover: setHovered,
                selected: selectedMove,
                onSelect: setSelectedMove,
                lastMove,
                winIndices,
                locked: gameStatus !== "playing" || aiThinking || isAnimating,
                version
              }, undefined, false, undefined, this),
              toast && /* @__PURE__ */ jsxDEV4("div", {
                className: "toast",
                children: toast
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsxDEV4("div", {
            className: "sidebar",
            children: [
              /* @__PURE__ */ jsxDEV4(Controls_default, {
                mode,
                humanFirst,
                timeControl,
                learningEnabled,
                profileSummary: getProfileSummary(profile),
                randomIntensity,
                randomSeed,
                selectedMove,
                selectedHeight,
                hoveredMove: hovered,
                hoveredHeight,
                isSelectedFull,
                canConfirm: canConfirmMove,
                isAnimating,
                onModeChange: (next) => {
                  setMode(next);
                },
                onHumanFirstChange: (value) => {
                  setHumanFirst(value);
                },
                onTimeControlChange: (value) => {
                  setTimeControl(value);
                  resetGame();
                },
                onLearningToggle: (value) => setLearningEnabled(value),
                onClearProfile: () => {
                  clearProfile();
                  setProfile(loadProfile());
                },
                onClearMemory: () => {
                  clearMemory();
                  setMemory(loadMemory());
                },
                onResetWeights: () => {
                  clearWeights();
                  setWeights(getDefaultWeights());
                },
                onRandomIntensityChange: setRandomIntensity,
                onRandomSeedChange: setRandomSeed,
                onReset: resetGame,
                onConfirmMove: () => {
                  if (selectedMove) {
                    applyMove(selectedMove.x, selectedMove.y, currentTurn);
                  }
                }
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsxDEV4("section", {
                className: "rules",
                children: [
                  /* @__PURE__ */ jsxDEV4("h2", {
                    children: "规则说明"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsxDEV4("ul", {
                    children: [
                      /* @__PURE__ */ jsxDEV4("li", {
                        children: "棋盘为 5×5×5 的三维立方体，坐标 (x,y,z)，z=0 为最底层。"
                      }, undefined, false, undefined, this),
                      /* @__PURE__ */ jsxDEV4("li", {
                        children: "重力方向固定向 -z，玩家只选择柱子 (x,y)，棋子自动落到最低空位。"
                      }, undefined, false, undefined, this),
                      /* @__PURE__ */ jsxDEV4("li", {
                        children: "先点击柱子进行选择，再点击“落子”按钮确认，才会真正下棋。"
                      }, undefined, false, undefined, this),
                      /* @__PURE__ */ jsxDEV4("li", {
                        children: "若该柱子 5 个高度已满，该步非法且需要重新选择。"
                      }, undefined, false, undefined, this),
                      /* @__PURE__ */ jsxDEV4("li", {
                        children: "任意方向连续 4 子即胜（轴向、平面斜线、三维斜线均有效）。"
                      }, undefined, false, undefined, this),
                      /* @__PURE__ */ jsxDEV4("li", {
                        children: "棋盘 125 格填满且无人胜出则平局。"
                      }, undefined, false, undefined, this)
                    ]
                  }, undefined, true, undefined, this)
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
};
var App_default = App;

// src/main.tsx
import { jsxDEV as jsxDEV5 } from "react/jsx-dev-runtime";
ReactDOM.createRoot(document.getElementById("root")).render(/* @__PURE__ */ jsxDEV5(App_default, {}, undefined, false, undefined, this));
