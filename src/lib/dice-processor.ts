import type { DiceDetection } from '../domain/dice-detection';
import type { DieValue } from '../domain/die-value';

export const CONFIDENCE_THRESHOLD = 0.25;

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

  const anchorStride = isTransposed ? 1 : numFeatures;
  const featureStride = isTransposed ? numAnchors : 1;

  const detectionsArr: DiceDetection[] = [];

  const classOffset = 4;
  const numClasses = 6;

  for (let i = 0; i < numAnchors; i++) {
    const anchorOff = i * anchorStride;
    let maxProb = 0;
    let classIdx = -1;

    // Check dice classes
    for (let c = 0; c < numClasses; c++) {
      const prob = outputTensor[anchorOff + (classOffset + c) * featureStride];
      if (prob > maxProb) {
        maxProb = prob;
        classIdx = c;
      }
    }

    if (maxProb > confidenceThreshold) {
      const cx = outputTensor[anchorOff + 0 * featureStride];
      const cy = outputTensor[anchorOff + 1 * featureStride];
      const w = outputTensor[anchorOff + 2 * featureStride];
      const h = outputTensor[anchorOff + 3 * featureStride];

      const realW = w * cropSize;
      const realH = h * cropSize;
      const realCx = cx * cropSize + offsetX;
      const realCy = cy * cropSize + cropY;

      detectionsArr.push({
        x: realCx - realW / 2,
        y: realCy - realH / 2,
        width: realW,
        height: realH,
        value: (classIdx + 1) as DieValue,
        confidence: maxProb,
      });
    }
  }

  // Non-Maximum Suppression (NMS)
  detectionsArr.sort((a, b) => b.confidence - a.confidence);
  const finalDetections: DiceDetection[] = [];

  for (const det of detectionsArr) {
    let isDuplicate = false;
    const detCx = det.x + det.width / 2;
    const detCy = det.y + det.height / 2;

    for (const finalDet of finalDetections) {
      const finalDetCx = finalDet.x + finalDet.width / 2;
      const finalDetCy = finalDet.y + finalDet.height / 2;

      const dx = Math.abs(detCx - finalDetCx);
      const dy = Math.abs(detCy - finalDetCy);

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
