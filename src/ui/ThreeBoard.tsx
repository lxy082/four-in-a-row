import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SIZE, coordsFromIndex } from '../engine/lines';
import type { Player } from '../engine/board';

const spacing = 1.2;

const toWorld = (x: number, y: number, z: number) => {
  return {
    x: (x - 2) * spacing,
    y: (z - 2) * spacing,
    z: (y - 2) * spacing
  };
};

const Piece = ({
  x,
  y,
  z,
  player,
  highlight,
  animate
}: {
  x: number;
  y: number;
  z: number;
  player: Player;
  highlight: boolean;
  animate: boolean;
}) => {
  const ref = useRef<THREE.Mesh>(null!);
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

  const color = player === 1 ? '#ef4444' : '#2563eb';
  const emissive = highlight ? new THREE.Color('#f5e663') : new THREE.Color('#000000');

  return (
    <mesh ref={ref} position={[target.x, startY, target.z]} castShadow>
      <sphereGeometry args={[0.42, 32, 32]} />
      <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={highlight ? 0.8 : 0.2} />
    </mesh>
  );
};

interface ThreeBoardProps {
  grid: Int8Array;
  heights: Int8Array;
  hovered: { x: number; y: number } | null;
  onHover: (value: { x: number; y: number } | null) => void;
  selected: { x: number; y: number } | null;
  onSelect: (value: { x: number; y: number } | null) => void;
  lastMove: { x: number; y: number; z: number; player: Player } | null;
  winIndices: Set<number>;
  locked: boolean;
  version: number;
}

const ThreeBoard = ({
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
}: ThreeBoardProps) => {
  const columns = useMemo(() => {
    const cells: Array<{ x: number; y: number }> = [];
    for (let x = 0; x < SIZE; x += 1) {
      for (let y = 0; y < SIZE; y += 1) {
        cells.push({ x, y });
      }
    }
    return cells;
  }, []);

  const hoverHeight = hovered ? heights[hovered.x + hovered.y * SIZE] : null;
  const hoverPosition = hovered && hoverHeight !== null && hoverHeight < SIZE ? toWorld(hovered.x, hovered.y, hoverHeight) : null;

  return (
    <div className="board-container">
      <Canvas shadows camera={{ position: [6, 6, 6], fov: 45 }}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[6, 10, 6]} intensity={1.2} castShadow />
        <OrbitControls enablePan={false} />
        <group>
          <mesh position={[0, -3.2, 0]} receiveShadow>
            <boxGeometry args={[7, 0.3, 7]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(6, 6, 6)]} />
            <lineBasicMaterial color="#cbd5f5" />
          </lineSegments>
          {columns.map((column) => {
            const isHovered = hovered?.x === column.x && hovered?.y === column.y;
            const isSelected = selected?.x === column.x && selected?.y === column.y;
            const pos = toWorld(column.x, column.y, 2);
            return (
              <mesh
                key={`column-${column.x}-${column.y}-${version}`}
                position={[pos.x, pos.y, pos.z]}
                onPointerOver={() => !locked && onHover(column)}
                onPointerOut={() => !locked && onHover(null)}
                onClick={() => !locked && onSelect(column)}
              >
                <boxGeometry args={[0.9, 6, 0.9]} />
                <meshStandardMaterial
                  color={isSelected ? '#ffd36a' : isHovered ? '#7fdad1' : '#93a1bd'}
                  transparent
                  opacity={isSelected ? 0.35 : isHovered ? 0.25 : 0.12}
                />
              </mesh>
            );
          })}
          {hoverPosition && (
            <mesh position={[hoverPosition.x, hoverPosition.y, hoverPosition.z]}>
              <sphereGeometry args={[0.3, 16, 16]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.5} />
            </mesh>
          )}
          {Array.from(grid.entries()).map(([cellIndex, value]) => {
            if (value === 0) {
              return null;
            }
            const { x, y, z } = coordsFromIndex(cellIndex);
            const animate = Boolean(lastMove && lastMove.x === x && lastMove.y === y && lastMove.z === z);
            return (
              <Piece
                key={`piece-${cellIndex}`}
                x={x}
                y={y}
                z={z}
                player={value as Player}
                highlight={winIndices.has(cellIndex)}
                animate={animate}
              />
            );
          })}
        </group>
      </Canvas>
    </div>
  );
};

export default ThreeBoard;
