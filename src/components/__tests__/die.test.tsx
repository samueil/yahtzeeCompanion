import React from 'react';
import ReactTestRenderer from '@react-three/test-renderer';
import { Object3D } from 'three';
import { DOT_POSITIONS, DOT_ROTATIONS, applyRotation, Die } from '../die';

describe('Die', () => {
  describe('DOT_POSITIONS', () => {
    it('defines entries for every valid face value 1–6', () => {
      expect(
        Object.keys(DOT_POSITIONS)
          .map(Number)
          .sort((a, b) => a - b),
      ).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('each position is a two-element tuple of numbers', () => {
      for (const positions of Object.values(DOT_POSITIONS)) {
        for (const pos of positions) {
          expect(pos).toEqual([expect.any(Number), expect.any(Number)]);
        }
      }
    });
  });

  describe('DOT_ROTATIONS', () => {
    it('defines correct rotations for each axis and direction', () => {
      expect(DOT_ROTATIONS['z+1']).toEqual([0, 0, 0]);
      expect(DOT_ROTATIONS['z-1']).toEqual([0, Math.PI, 0]);
      expect(DOT_ROTATIONS['x+1']).toEqual([0, Math.PI / 2, 0]);
      expect(DOT_ROTATIONS['x-1']).toEqual([0, -Math.PI / 2, 0]);
      expect(DOT_ROTATIONS['y+1']).toEqual([-Math.PI / 2, 0, 0]);
      expect(DOT_ROTATIONS['y-1']).toEqual([Math.PI / 2, 0, 0]);
    });
  });

  describe('applyRotation', () => {
    it('applies rotation towards target euler angles based on value', () => {
      const obj = new Object3D();

      // Value 1 rotates towards y: -Math.PI / 2
      applyRotation(obj, 1);
      expect(obj.rotation.y).toBeLessThan(0);

      // Value 2 rotates towards y: Math.PI / 2
      obj.rotation.set(0, 0, 0);
      applyRotation(obj, 2);
      expect(obj.rotation.y).toBeGreaterThan(0);
    });
  });

  describe('3D Component', () => {
    it('renders the complete 3D structure including body, edges, and 21 dots', async () => {
      const renderer = await ReactTestRenderer.create(
        <Die value={1} isUiBlocked={false} />,
      );

      // Get the root group node
      const rootGroup = renderer.toTree()![0];
      expect(rootGroup.type).toBe('group');

      // Filter children to find the specific parts
      const mainBody = rootGroup.children.filter(
        (node: any) =>
          node.type === 'mesh' &&
          node.children.some(
            (child: any) => child.type === 'meshStandardMaterial',
          ) &&
          !node.children.some((child: any) => child.type === 'circleGeometry'),
      );
      expect(mainBody).toHaveLength(1);

      const edges = rootGroup.children.filter(
        (node: any) => node.type === 'lineSegments',
      );
      expect(edges).toHaveLength(1);

      // The dots are meshes with a circleGeometry child
      const dots = rootGroup.children.filter(
        (node: any) =>
          node.type === 'mesh' &&
          node.children.some((child: any) => child.type === 'circleGeometry'),
      );

      // 1 + 2 + 3 + 4 + 5 + 6 = 21 dots total across all faces
      expect(dots).toHaveLength(21);
    });
  });
});
