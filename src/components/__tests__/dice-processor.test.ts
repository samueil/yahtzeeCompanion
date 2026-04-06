import { DiceDetection } from '../../domain/dice-detection';
import { processDiceFrame } from '../dice-processor';

describe('dice-processor', () => {
  it('should parse an 11-feature YOLOv8 tensor with explicit objectness (transposed: [1, 11, 8400])', () => {
    const numAnchors = 8400;
    const numFeatures = 11;
    // Mock tensor array of size 11 * 8400
    const tensor = new Float32Array(numFeatures * numAnchors);

    // Let's create a fake anchor at index 0 that represents a '6' dice
    // The format is: x, y, w, h, objectness, c1, c2, c3, c4, c5, c6

    // [cx, cy, w, h] -> Normalized format
    tensor[0 * numAnchors + 0] = 0.5; // cx
    tensor[1 * numAnchors + 0] = 0.5; // cy
    tensor[2 * numAnchors + 0] = 0.1; // w
    tensor[3 * numAnchors + 0] = 0.1; // h

    // Objectness score
    tensor[4 * numAnchors + 0] = 0.9;

    // Class probabilities (Dice 1-6)
    tensor[5 * numAnchors + 0] = 0.1; // 1
    tensor[6 * numAnchors + 0] = 0.05; // 2
    tensor[7 * numAnchors + 0] = 0.1; // 3
    tensor[8 * numAnchors + 0] = 0.0; // 4
    tensor[9 * numAnchors + 0] = 0.0; // 5
    tensor[10 * numAnchors + 0] = 0.95; // 6 (index 5)

    const results = processDiceFrame({
      outputTensor: tensor,
      outputShape: [1, 11, 8400],
      screenWidth: 1080,
      screenHeight: 1920,
      expectedWidth: 640,
      expectedHeight: 640,
      confidenceThreshold: 0.15,
    });

    expect(results).toHaveLength(1);
    expect(results[0].value).toBe(6); // The class we set highest

    expect(results[0].confidence).toBeCloseTo(0.95);

    // Coordinate scaling
    // w: 0.1 * 640 = 64
    // cx: 0.5 * 640 = 320
    // x = (cx - w/2) * scaleX = (320 - 32) * (1080/640) = 288 * 1.6875 = 486
    expect(results[0].x).toBeCloseTo(486, 0);
  });
});
