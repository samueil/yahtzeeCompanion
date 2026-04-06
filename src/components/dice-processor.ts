import { DiceDetection } from '../domain/dice-detection';

export interface ProcessDiceFrameOptions {
  outputTensor: Float32Array;
  outputShape: number[];
  screenWidth: number;
  screenHeight: number;
  expectedWidth: number;
  expectedHeight: number;
  confidenceThreshold: number;
}

export function processDiceFrame({
  outputTensor,
  outputShape,
  screenWidth,
  screenHeight,
  expectedWidth,
  expectedHeight,
  confidenceThreshold,
}: ProcessDiceFrameOptions): DiceDetection[] {
  'worklet';
  let numFeatures = 10;
  let numAnchors = 8400;
  let isTransposed = false;

  if (outputShape.length >= 3) {
    if (outputShape[1] < outputShape[2]) {
      numFeatures = outputShape[1];
      numAnchors = outputShape[2];
      isTransposed = true; // e.g. [1, 11, 8400]
    } else {
      numAnchors = outputShape[1];
      numFeatures = outputShape[2];
      isTransposed = false; // e.g. [1, 8400, 11]
    }
  }

  const scaleX = screenWidth / expectedWidth;
  const scaleY = screenHeight / expectedHeight;
  const detectionsArr: DiceDetection[] = [];

  for (let i = 0; i < numAnchors; i++) {
    let maxProb = 0;
    let classIdx = -1;

    // For an 11-feature YOLOv8 model, usually [x, y, w, h] are indices 0-3.
    // The next 6 are the classes (indices 4-9).
    // The 11th feature is likely an empty padding class to align memory or an objectness score we ignore.
    const classOffset = 4;
    const numClasses = 6;

    for (let c = 0; c < numClasses; c++) {
      const prob = isTransposed
        ? outputTensor[(classOffset + c) * numAnchors + i]
        : outputTensor[i * numFeatures + (classOffset + c)];

      if (prob > maxProb) {
        maxProb = prob;
        classIdx = c;
      }
    }

    if (maxProb > confidenceThreshold) {
      // Normalized coordinates
      let cx = isTransposed
        ? outputTensor[0 * numAnchors + i]
        : outputTensor[i * numFeatures + 0];
      let cy = isTransposed
        ? outputTensor[1 * numAnchors + i]
        : outputTensor[i * numFeatures + 1];
      let w = isTransposed
        ? outputTensor[2 * numAnchors + i]
        : outputTensor[i * numFeatures + 2];
      let h = isTransposed
        ? outputTensor[3 * numAnchors + i]
        : outputTensor[i * numFeatures + 3];

      // Assuming normalized outputs (0.0 - 1.0)
      // Since the model was trained on 640x640, it outputs coordinates relative to that square.
      // But the camera feed is 16:9 (e.g. 1080x1920).
      // The image was squished during `resize`.
      // So cx/cy/w/h are percentages of the squished 640x640 frame.
      // We multiply them by the full screen dimensions to map them back to the UI.
      const realCx = cx * screenWidth;
      const realCy = cy * screenHeight;
      const realW = w * screenWidth;
      const realH = h * screenHeight;

      detectionsArr.push({
        x: realCx - realW / 2,
        y: realCy - realH / 2,
        width: realW,
        height: realH,
        value: classIdx + 1,
        confidence: maxProb,
      });
    }
  }

  // Non-Maximum Suppression (NMS)
  detectionsArr.sort((a, b) => b.confidence - a.confidence);
  const finalDetections: DiceDetection[] = [];

  for (const det of detectionsArr) {
    let isDuplicate = false;
    for (const finalDet of finalDetections) {
      const dx = Math.abs(det.x - finalDet.x);
      const dy = Math.abs(det.y - finalDet.y);
      if (dx < 30 && dy < 30) {
        isDuplicate = true;
        break;
      }
    }
    if (!isDuplicate) {
      finalDetections.push(det);
    }
  }

  return finalDetections;
}
