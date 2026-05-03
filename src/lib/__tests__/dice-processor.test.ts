import {
  calculateCoordinateMapping,
  processDiceFrame,
} from '../dice-processor';

describe('dice-processor', () => {
  it('should parse an 11-feature YOLOv8 tensor with explicit objectness (transposed: [1, 11, 8400])', () => {
    const numAnchors = 8400;
    const numFeatures = 11;
    // Mock tensor array of size 11 * 8400
    const tensor = new Float32Array(numFeatures * numAnchors);

    // Let's create a fake anchor at index 0 that represents a '6' dice
    // The format we discovered is: x, y, w, h, c1, c2, c3, c4, c5, c6, padding

    // [cx, cy, w, h] -> Normalized format
    tensor[0 * numAnchors + 0] = 0.5; // cx
    tensor[1 * numAnchors + 0] = 0.5; // cy
    tensor[2 * numAnchors + 0] = 0.1; // w
    tensor[3 * numAnchors + 0] = 0.1; // h

    // Class probabilities (Dice 1-6) starting at index 4
    tensor[4 * numAnchors + 0] = 0.1; // 1
    tensor[5 * numAnchors + 0] = 0.05; // 2
    tensor[6 * numAnchors + 0] = 0.1; // 3
    tensor[7 * numAnchors + 0] = 0.0; // 4
    tensor[8 * numAnchors + 0] = 0.0; // 5
    tensor[9 * numAnchors + 0] = 0.95; // 6
    tensor[10 * numAnchors + 0] = 0.99; // Padding/background (should be ignored)

    const results = processDiceFrame({
      outputTensor: tensor,
      outputShape: [1, 11, 8400],
      cropY: 420, // (1920 - 1080) / 2
      cropSize: 1080, // width
      confidenceThreshold: 0.15,
    });

    expect(results).toHaveLength(1);
    expect(results[0].value).toBe(6); // The class we set highest

    expect(results[0].confidence).toBeCloseTo(0.95);

    // Coordinate scaling
    // w: 0.1 * cropSize = 108
    // cx: 0.5 * cropSize = 540
    // x = 540 - 54 = 486
    expect(results[0].x).toBeCloseTo(486, 0);
  });

  it('should parse an 11-feature YOLOv8 tensor in standard format (non-transposed: [1, 8400, 11])', () => {
    const numAnchors = 8400;
    const numFeatures = 11;
    const tensor = new Float32Array(numFeatures * numAnchors);

    // Anchor at index 100: [cx, cy, w, h, c1...c6, padding]
    const off = 100 * numFeatures;
    tensor[off + 0] = 0.2; // cx
    tensor[off + 1] = 0.3; // cy
    tensor[off + 2] = 0.05; // w
    tensor[off + 3] = 0.05; // h
    tensor[off + 4 + 2] = 0.8; // Class 3 (index 2)

    const results = processDiceFrame({
      outputTensor: tensor,
      outputShape: [1, 8400, 11],
      cropY: 0,
      cropSize: 1000,
      confidenceThreshold: 0.5,
    });

    expect(results).toHaveLength(1);
    expect(results[0].value).toBe(3);
    expect(results[0].confidence).toBeCloseTo(0.8);
    // x = (0.2 * 1000) - (0.05 * 1000 / 2) = 200 - 25 = 175
    expect(results[0].x).toBeCloseTo(175, 1);
  });

  it('should apply Non-Maximum Suppression (NMS) to remove duplicates', () => {
    const numAnchors = 8400;
    const numFeatures = 11;
    const tensor = new Float32Array(numFeatures * numAnchors);

    // Anchor 0: A high-confidence detection
    tensor[0 * numAnchors + 0] = 0.5;
    tensor[1 * numAnchors + 0] = 0.5;
    tensor[2 * numAnchors + 0] = 0.1;
    tensor[3 * numAnchors + 0] = 0.1;
    tensor[9 * numAnchors + 0] = 0.9; // Value 6

    // Anchor 1: A lower-confidence detection at almost the same spot
    tensor[0 * numAnchors + 1] = 0.501;
    tensor[1 * numAnchors + 1] = 0.501;
    tensor[2 * numAnchors + 1] = 0.1;
    tensor[3 * numAnchors + 1] = 0.1;
    tensor[9 * numAnchors + 1] = 0.8; // Value 6

    // Anchor 2: A detection far away (should not be suppressed)
    tensor[0 * numAnchors + 2] = 0.1;
    tensor[1 * numAnchors + 2] = 0.1;
    tensor[2 * numAnchors + 2] = 0.1;
    tensor[3 * numAnchors + 2] = 0.1;
    tensor[4 * numAnchors + 2] = 0.7; // Value 1

    const results = processDiceFrame({
      outputTensor: tensor,
      outputShape: [1, 11, 8400],
      cropY: 0,
      cropSize: 1000,
      confidenceThreshold: 0.5,
    });

    // Should have 2 detections, not 3 (one was suppressed)
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.value)).toContain(6);
    expect(results.map((r) => r.value)).toContain(1);
    // The high confidence 6 should be the one that remained
    const die6 = results.find((r) => r.value === 6);
    expect(die6?.confidence).toBeCloseTo(0.9);
  });
});

describe('calculateCoordinateMapping', () => {
  it('correctly maps coordinates for a standard phone (taller than camera aspect ratio)', () => {
    // These values are from the real-world device logs provided
    const config = {
      containerHeight: 705,
      containerWidth: 360,
      frameHeight: 480,
      frameWidth: 640,
    };

    const result = calculateCoordinateMapping(config);

    expect(result).toEqual({
      sensorCropSize: 480,
      sensorCropX: 80,
      sensorCropY: 0,
      screenCropSize: 528.75,
      screenCropY: 88.125,
      screenOffsetX: -84.375,
    });
  });

  it('correctly maps coordinates for a square container (perfect 1:1 match)', () => {
    const config = {
      containerHeight: 500,
      containerWidth: 500,
      frameHeight: 480,
      frameWidth: 640,
    };

    expect(calculateCoordinateMapping(config)).toEqual({
      sensorCropSize: 480,
      sensorCropX: 80,
      sensorCropY: 0,
      screenCropSize: expect.closeTo(500, 4),
      screenCropY: expect.closeTo(0, 4),
      screenOffsetX: expect.closeTo(0, 4),
    });
  });
});
