import { DiceDetection } from '../domain/dice-detection';

export const CONFIDENCE_THRESHOLD = 0.15;

export interface ProcessDiceFrameOptions {
  outputTensor: Float32Array;
  outputShape: number[];
  cropY: number;
  cropSize: number;
  offsetX?: number;
  confidenceThreshold: number;
}

export interface FrameLayoutConfig {
  frameWidth: number;
  frameHeight: number;
  containerWidth: number;
  containerHeight: number;
}

export function calculateCoordinateMapping(config: FrameLayoutConfig) {
  'worklet';
  const { frameWidth, frameHeight, containerWidth, containerHeight } = config;

  // Since the app is locked to portrait, the camera frame is displayed upright.
  // The shorter dimension of the raw frame becomes the physical width of the video.
  const videoWidth = Math.min(frameWidth, frameHeight);
  const videoHeight = Math.max(frameWidth, frameHeight);

  // 1. Calculate "cover" scaling
  const scale = Math.max(
    containerWidth / videoWidth,
    containerHeight / videoHeight,
  );

  // 2. Scaled video dimensions
  const scaledVideoWidth = videoWidth * scale;
  const scaledVideoHeight = videoHeight * scale;

  // 3. Video offsets relative to screen
  const videoOffsetX = (containerWidth - scaledVideoWidth) / 2;
  const videoOffsetY = (containerHeight - scaledVideoHeight) / 2;

  // 4. Sensor crop size (1:1 square from the center of the raw frame)
  const sensorCropSize = videoWidth;
  const sensorCropX = (frameWidth - sensorCropSize) / 2;
  const sensorCropY = (frameHeight - sensorCropSize) / 2;

  // 5. Final crop bounding box on the UI screen
  // Since the crop is bounded by the smaller dimension (videoWidth),
  // its local X offset within the upright video is always 0.
  // Its local Y offset is the difference between video height and the crop size.
  const videoCropY = (videoHeight - sensorCropSize) / 2;

  const screenCropSize = sensorCropSize * scale;
  const screenOffsetX = videoOffsetX;
  const screenCropY = videoOffsetY + videoCropY * scale;

  return {
    sensorCropSize,
    sensorCropX,
    sensorCropY,
    screenCropY,
    screenCropSize,
    screenOffsetX,
  };
}

export function processDiceFrame({
  outputTensor,
  outputShape,
  cropY,
  cropSize,
  offsetX = 0,
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
      // Since we cropped the camera feed into a perfect 1:1 square before passing it
      // to the model, `cx`, `cy`, `w`, and `h` are percentages of that cropped square!

      const realW = w * cropSize;
      const realH = h * cropSize;
      const realCx = cx * cropSize + offsetX; // Apply horizontal offset if the Camera component overflows the screen width
      const realCy = cy * cropSize + cropY; // Push the Y down because the crop was centered vertically

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
