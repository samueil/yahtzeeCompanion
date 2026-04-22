import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber/native';
import type { Group, Object3D } from 'three';
import { EdgesGeometry, Euler, MathUtils } from 'three';
import { RoundedBoxGeometry } from 'three-stdlib';
import type { DieValue } from '../domain/die-value';

interface DieProps {
  value: DieValue;
  isUiBlocked: boolean;
}

type Axis = 'x' | 'y' | 'z';

interface FaceDotsProps {
  value: DieValue;
  axis: Axis;
  dir: 1 | -1;
}

const HALF = 1.4;
const DOT_RADIUS = 0.22;
const SURFACE = 1.41;

export const DOT_POSITIONS: Record<DieValue, [number, number][]> = {
  1: [[0, 0]],
  2: [
    [-0.5, -0.5],
    [0.5, 0.5],
  ],
  3: [
    [-0.5, 0.5],
    [0, 0],
    [0.5, -0.5],
  ],
  4: [
    [-0.5, -0.5],
    [0.5, -0.5],
    [-0.5, 0.5],
    [0.5, 0.5],
  ],
  5: [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0, 0],
    [-0.5, 0.5],
    [0.5, 0.5],
  ],
  6: [
    [-0.5, -0.5],
    [0.5, -0.5],
    [-0.5, 0],
    [0.5, 0],
    [-0.5, 0.5],
    [0.5, 0.5],
  ],
};

const DOT_ROTATIONS: Record<string, [number, number, number]> = {
  'z+1': [0, 0, 0],
  'z-1': [0, Math.PI, 0],
  'x+1': [0, Math.PI / 2, 0],
  'x-1': [0, -Math.PI / 2, 0],
  'y+1': [-Math.PI / 2, 0, 0],
  'y-1': [Math.PI / 2, 0, 0],
};

const FaceDots = ({ value, axis, dir }: FaceDotsProps) => {
  const rotation = DOT_ROTATIONS[`${axis}${dir > 0 ? '+1' : '-1'}`];
  const offset = SURFACE * dir;

  return (
    <>
      {DOT_POSITIONS[value].map(([dx, dy], i) => {
        const pos: [number, number, number] =
          axis === 'z'
            ? [dx * HALF, dy * HALF, offset]
            : axis === 'x'
              ? [offset, dy * HALF, dx * HALF]
              : [dx * HALF, offset, dy * HALF];

        return (
          <mesh key={i} position={pos} rotation={rotation}>
            <circleGeometry args={[DOT_RADIUS, 32]} />
            <meshStandardMaterial
              color="#1a1a1a"
              roughness={0.1}
              metalness={0.3}
            />
          </mesh>
        );
      })}
    </>
  );
};

const applyRotation = (obj: Object3D, value: DieValue) => {
  const target = new Euler();

  switch (value) {
    case 1:
      target.set(0, -Math.PI / 2, 0);
      break;
    case 2:
      target.set(0, Math.PI / 2, 0);
      break;
    case 3:
      target.set(Math.PI / 2, 0, 0);
      break;
    case 4:
      target.set(-Math.PI / 2, 0, 0);
      break;
    case 5:
      target.set(0, 0, 0);
      break;
    case 6:
      target.set(Math.PI, 0, 0);
      break;
    default:
      target.set(0, 0, 0);
  }

  obj.rotation.x = MathUtils.lerp(obj.rotation.x, target.x, 0.15);
  obj.rotation.y = MathUtils.lerp(obj.rotation.y, target.y, 0.15);
  obj.rotation.z = MathUtils.lerp(obj.rotation.z, target.z, 0.15);
};

export const Die = ({ value, isUiBlocked }: DieProps) => {
  const groupRef = useRef<Group>(null);

  const geometry = useMemo(
    () => new RoundedBoxGeometry(2.8, 2.8, 2.8, 6, 0.4),
    [],
  );
  const edges = useMemo(() => new EdgesGeometry(geometry, 15), [geometry]);

  useFrame((_, delta) => {
    if (isUiBlocked && groupRef.current) {
      groupRef.current.rotation.x += delta * 12;
      groupRef.current.rotation.y += delta * 18;
      groupRef.current.rotation.z += delta * 10;
    } else if (groupRef.current) {
      applyRotation(groupRef.current, value);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={geometry}>
        <meshStandardMaterial color="#FFFFFF" roughness={0.1} metalness={0.3} />
      </mesh>

      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#000000" transparent opacity={0.1} />
      </lineSegments>

      <FaceDots value={5} axis="z" dir={1} />
      <FaceDots value={6} axis="z" dir={-1} />
      <FaceDots value={1} axis="x" dir={1} />
      <FaceDots value={2} axis="x" dir={-1} />
      <FaceDots value={3} axis="y" dir={1} />
      <FaceDots value={4} axis="y" dir={-1} />
    </group>
  );
};
