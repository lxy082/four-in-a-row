import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SIZE, coordsFromIndex } from '../engine/lines';
import type { Player } from '../engine/board';

const spacing = 1.2;
const boardThickness = 0.4;
const boardTop = -2.8;
const boardY = boardTop - boardThickness / 2;
const columnHeight = spacing * 4 + 0.6;
const columnInset = 0.08;
const columnCenterY = boardTop + columnHeight / 2 - columnInset;
const selectThreshold = 6;

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

const BoardScene = ({
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
  const { gl, camera } = useThree();
  const pickMeshes = useRef<Array<THREE.Mesh | null>>([]);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const pointer = useMemo(() => new THREE.Vector2(), []);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const hoverRef = useRef<{ x: number; y: number } | null>(null);

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

  useEffect(() => {
    const dom = gl.domElement;

    const getIntersection = (event: PointerEvent) => {
      const rect = dom.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(pickMeshes.current.filter(Boolean) as THREE.Object3D[], false);
      if (intersects.length === 0) {
        return null;
      }
      const hit = intersects[0].object as THREE.Mesh;
      return hit.userData as { x: number; y: number };
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (locked) {
        return;
      }
      pointerDownRef.current = { x: event.clientX, y: event.clientY };
    };

    const handlePointerMove = (event: PointerEvent) => {
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

    const handlePointerUp = (event: PointerEvent) => {
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

    dom.addEventListener('pointerdown', handlePointerDown);
    dom.addEventListener('pointermove', handlePointerMove);
    dom.addEventListener('pointerup', handlePointerUp);
    dom.addEventListener('pointerleave', handlePointerLeave);
    return () => {
      dom.removeEventListener('pointerdown', handlePointerDown);
      dom.removeEventListener('pointermove', handlePointerMove);
      dom.removeEventListener('pointerup', handlePointerUp);
      dom.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [camera, gl, locked, onHover, onSelect, pointer, raycaster]);

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[6, 10, 6]} intensity={1.2} castShadow />
      <OrbitControls enablePan={false} />
      <group>
        <mesh position={[0, boardY, 0]} receiveShadow>
          <boxGeometry args={[7, boardThickness, 7]} />
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
          const index = column.x + column.y * SIZE;
          return (
            <group key={`column-${column.x}-${column.y}-${version}`} position={[pos.x, 0, pos.z]}>
              <mesh position={[0, columnCenterY, 0]}>
                <cylinderGeometry args={[0.05, 0.05, columnHeight, 12]} />
                <meshStandardMaterial
                  color={isSelected ? '#f59e0b' : isHovered ? '#38bdf8' : '#94a3b8'}
                  transparent
                  opacity={isSelected ? 0.9 : 0.6}
                />
              </mesh>
              <mesh
                ref={(mesh) => {
                  pickMeshes.current[index] = mesh;
                  if (mesh) {
                    mesh.userData = { x: column.x, y: column.y };
                  }
                }}
                position={[0, columnCenterY, 0]}
              >
                <cylinderGeometry args={[0.35, 0.35, columnHeight, 12]} />
                <meshStandardMaterial transparent opacity={0} />
              </mesh>
            </group>
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
    </>
  );
};

const ThreeBoard = (props: ThreeBoardProps) => {
  return (
    <div className="board-container">
      <Canvas shadows camera={{ position: [6, 6, 6], fov: 45 }}>
        <BoardScene {...props} />
      </Canvas>
    </div>
  );
};

export default ThreeBoard;
