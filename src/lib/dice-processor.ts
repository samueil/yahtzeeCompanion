import { DiceDetection } from '../domain/dice-detection';

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

  // 1. Determine sensor orientation
  // The native camera sensor on most Android phones is always landscape (e.g. 1920x1080)
  const isSensorLandscape = frameWidth > frameHeight;
  const portraitVideoWidth = isSensorLandscape ? frameHeight : frameWidth;
  const portraitVideoHeight = isSensorLandscape ? frameWidth : frameHeight;

  // 2. Calculate "cover" scaling
  // We scale to fill the screen, picking the maximum scale factor required
  const scale = Math.max(
    containerWidth / portraitVideoWidth,
    containerHeight / portraitVideoHeight,
  );

  // 3. Scaled video dimensions
  const scaledVideoWidth = portraitVideoWidth * scale;
  const scaledVideoHeight = portraitVideoHeight * scale;

  // 4. Video offsets relative to screen (centered in container due to resizeMode="cover")
  // These will be negative if the video is larger than the screen
  const videoOffsetX = (containerWidth - scaledVideoWidth) / 2;
  const videoOffsetY = (containerHeight - scaledVideoHeight) / 2;

  // 5. Sensor crop size (1:1 square from the center of the raw frame)
  const sensorCropSize = Math.min(frameWidth, frameHeight);
  const sensorCropX = (frameWidth - sensorCropSize) / 2;
  const sensorCropY = (frameHeight - sensorCropSize) / 2;

  // 6. Crop properties relative to the rotated portrait video
  const portraitCropX = (portraitVideoWidth - sensorCropSize) / 2;
  const portraitCropY = (portraitVideoHeight - sensorCropSize) / 2;

  // 7. Final crop bounding box on the UI screen
  // screenOffsetX/Y is the absolute coordinate on the phone screen
  const screenCropSize = sensorCropSize * scale;
  const screenOffsetX = videoOffsetX + portraitCropX * scale;
  const screenCropY = videoOffsetY + portraitCropY * scale;

  return {
    isSensorLandscape,
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
