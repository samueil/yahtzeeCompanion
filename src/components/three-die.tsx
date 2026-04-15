/* eslint-disable react/no-unknown-property */
import { useTexture } from '@react-three/drei/native';
import { useFrame } from '@react-three/fiber/native';
import { Asset } from 'expo-asset'; // Import mo ito
import React, { useRef, Suspense } from 'react';
import type { Mesh } from 'three';
import * as THREE from 'three';

interface ThreeDieProps {
  value: number;
  isRolling: boolean;
}

const DieMesh = ({ value, isRolling }: ThreeDieProps) => {
  const meshRef = useRef<Mesh>(null);

  const tex1 = useTexture(
    Asset.fromModule(require('../../assets/dice/die1.png')).uri,
  ) as THREE.Texture;
  const tex2 = useTexture(
    Asset.fromModule(require('../../assets/dice/die2.png')).uri,
  ) as THREE.Texture;
  const tex3 = useTexture(
    Asset.fromModule(require('../../assets/dice/die3.png')).uri,
  ) as THREE.Texture;
  const tex4 = useTexture(
    Asset.fromModule(require('../../assets/dice/die4.png')).uri,
  ) as THREE.Texture;
  const tex5 = useTexture(
    Asset.fromModule(require('../../assets/dice/die5.png')).uri,
  ) as THREE.Texture;
  const tex6 = useTexture(
    Asset.fromModule(require('../../assets/dice/die6.png')).uri,
  ) as THREE.Texture;

  useFrame((_, delta) => {
    if (isRolling && meshRef.current) {
      meshRef.current.rotation.x += delta * 12;
      meshRef.current.rotation.y += delta * 18;
      meshRef.current.rotation.z += delta * 10;
    } else if (meshRef.current) {
      applyRotation(meshRef.current, value);
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[2.8, 2.8, 2.8]} />
      <meshStandardMaterial attach="material-0" map={tex1} />
      <meshStandardMaterial attach="material-1" map={tex2} />
      <meshStandardMaterial attach="material-2" map={tex3} />
      <meshStandardMaterial attach="material-3" map={tex4} />
      <meshStandardMaterial attach="material-4" map={tex5} />
      <meshStandardMaterial attach="material-5" map={tex6} />
    </mesh>
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
    case 1:
      targetRotation.set(0, Math.PI / 2, 0);
      break;
    case 2:
      targetRotation.set(0, -Math.PI / 2, 0);
      break;
    case 3:
      targetRotation.set(-Math.PI / 2, 0, 0);
      break;
    case 4:
      targetRotation.set(Math.PI / 2, 0, 0);
      break;
    case 5:
      targetRotation.set(0, 0, 0);
      break;
    case 6:
      targetRotation.set(Math.PI, 0, 0);
      break;
    default:
      targetRotation.set(0, 0, 0);
  }
  mesh.rotation.x = THREE.MathUtils.lerp(
    mesh.rotation.x,
    targetRotation.x,
    0.15,
  );
  mesh.rotation.y = THREE.MathUtils.lerp(
    mesh.rotation.y,
    targetRotation.y,
    0.15,
  );
  mesh.rotation.z = THREE.MathUtils.lerp(
    mesh.rotation.z,
    targetRotation.z,
    0.15,
  );
};
