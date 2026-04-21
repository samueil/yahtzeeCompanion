/* eslint-disable react/no-unknown-property */
import { useFrame } from '@react-three/fiber/native';
import React, { useRef, useMemo, Suspense } from 'react';
import type { Mesh } from 'three';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three-stdlib';

interface ThreeDieProps {
  value: number;
  isUiBlocked: boolean;
}

const createDiceTexture = (value: number) => {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#1a1a1a';
    const dotRadius = 45;
    const padding = 125;
    const center = size / 2;
    const low = padding;
    const high = size - padding;

    const dotPositions: Record<number, [number, number][]> = {
      1: [[center, center]],
      2: [[low, low], [high, high]],
      3: [[low, low], [center, center], [high, high]],
      4: [[low, low], [high, low], [low, high], [high, high]],
      5: [[low, low], [high, low], [center, center], [low, high], [high, high]],
      6: [[low, low], [high, low], [low, center], [high, center], [low, high], [high, high]],
    };

    dotPositions[value]?.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  return texture;
};

const DieMesh = ({ value, isUiBlocked }: ThreeDieProps) => {
  const meshRef = useRef<Mesh>(null);
  const borderRef = useRef<THREE.LineSegments>(null);

  const geometry = useMemo(() => new RoundedBoxGeometry(2.8, 2.8, 2.8, 6, 0.4), []);
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry, 15), [geometry]);
  const textures = useMemo(() => [1, 2, 3, 4, 5, 6].map(v => createDiceTexture(v)), []);

  useFrame((_, delta) => {
    if (isUiBlocked && meshRef.current) {
      meshRef.current.rotation.x += delta * 12;
      meshRef.current.rotation.y += delta * 18;
      meshRef.current.rotation.z += delta * 10;
      
      if (borderRef.current) {
        borderRef.current.rotation.copy(meshRef.current.rotation);
      }
    } else if (meshRef.current) {
      applyRotation(meshRef.current, value);

      if (borderRef.current) {
        borderRef.current.rotation.copy(meshRef.current.rotation);
      }
    }
  });

  return (
    <group>
      <mesh ref={meshRef} geometry={geometry}>
        {textures.map((tex, i) => (
          <meshStandardMaterial 
            key={i} 
            attach={`material-${i}`} 
            map={tex} 
            roughness={0.1}
            metalness={0.3}
          />
        ))}
      </mesh>

      <lineSegments ref={borderRef} geometry={edges}>
        <lineBasicMaterial 
          color="#000000" 
          transparent 
          opacity={0.1} 
        />
      </lineSegments>
    </group>
  );
};

export const ThreeDie = (props: ThreeDieProps) => {
  return (
    <Suspense fallback={null}>
      <DieMesh {...props} />
    </Suspense>
  );
};

const applyRotation = (mesh: Mesh, value: number) => {
  const targetRotation = new THREE.Euler();
  
  switch (value) {
    case 1: targetRotation.set(0, -Math.PI / 2, 0); break; 
    case 2: targetRotation.set(0, Math.PI / 2, 0); break;  
    case 3: targetRotation.set(Math.PI / 2, 0, 0); break;  
    case 4: targetRotation.set(-Math.PI / 2, 0, 0); break; 
    case 5: targetRotation.set(0, 0, 0); break;
    case 6: targetRotation.set(Math.PI, 0, 0); break;
    default: targetRotation.set(0, 0, 0);
  }
  
  mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, targetRotation.x, 0.15);
  mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, targetRotation.y, 0.15);
  mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, targetRotation.z, 0.15);
};