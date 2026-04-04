import { X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTensorflowModel } from 'react-native-fast-tflite';
import {
  Camera,
  runAtTargetFps,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import type { DiceDetection } from '../domain/dice-tetection';
import { AROverlay } from './ar-overlay';

interface DiceScannerProps {
  neededCount: number;
  onScanComplete: (diceValues: number[]) => void;
  onClose: () => void;
}

export const DiceScanner = ({
  neededCount,
  onScanComplete,
  onClose,
}: DiceScannerProps) => {
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const [permissionError, setPermissionError] = useState<boolean>(false);
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);

  // Note: We avoid useSharedValue/runOnJS to fix Reanimated 3+ bridge issues.
  // Instead we directly rely on the built-in Worklet capabilities of VisionCamera.
  const [detections, setDetections] = useState<DiceDetection[]>([]);
  const setDetectionsJS = Worklets.createRunOnJS(setDetections);
  const onScanCompleteJS = Worklets.createRunOnJS(onScanComplete);

  const objectDetection = useTensorflowModel(
    require('../../assets/yolov8-dice.tflite'),
  );

  useEffect(() => {
    const handlePermissions = async () => {
      if (!hasPermission) {
        const isGranted = await requestPermission();
        if (!isGranted) {
          setPermissionError(true);
        }
      }
    };
    handlePermissions();
  }, [hasPermission, requestPermission]);

  const { resize } = useResizePlugin();

  // Create a local reference to the loaded model to prevent C++ destruction race conditions
  // inside the worklet when it's accessed dynamically
  const tfliteModel =
    objectDetection.state === 'loaded' ? objectDetection.model : undefined;

  useEffect(() => {
    if (tfliteModel) {
      console.log(
        'TFLite Model Inputs:',
        tfliteModel.inputs.map((i) => `${i.name}: ${i.dataType} [${i.shape}]`),
      );
      console.log(
        'TFLite Model Outputs:',
        tfliteModel.outputs.map((o) => `${o.name}: ${o.dataType} [${o.shape}]`),
      );
    }
  }, [tfliteModel]);

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      if (!tfliteModel) return;

      runAtTargetFps(2, () => {
        'worklet';
        try {
          // Dynamically determine the size expected by the model to prevent SIGSEGV
          const inputTensor = tfliteModel.inputs[0];
          // Usually YOLO shape is [1, width, height, 3] or [1, height, width, 3] (e.g. 640x640)
          const expectedHeight = inputTensor.shape[1] || 640;
          const expectedWidth = inputTensor.shape[2] || 640;
          const requiredDataType =
            inputTensor.dataType === 'uint8' ? 'uint8' : 'float32';

          const scaleX = screenWidth / expectedWidth;
          const scaleY = screenHeight / expectedHeight;

          console.log(
            `[FrameProcessor] Resizing to ${expectedWidth}x${expectedHeight} ${requiredDataType}`,
          );
          const resized = resize(frame, {
            scale: { width: expectedWidth, height: expectedHeight },
            pixelFormat: 'rgb',
            dataType: requiredDataType,
          });

          console.log(
            `[FrameProcessor] Resized! Array length: ${resized.length}. Running model...`,
          );
          // Run model synchronously on this background thread
          const outputs = tfliteModel.runSync([resized]);

          console.log(
            `[FrameProcessor] Model ran! Output arrays: ${outputs.length}`,
          );

          if (outputs.length > 0) {
            console.log(
              `[FrameProcessor] Output 0 length: ${outputs[0].length}`,
            );
          }

          // TFLite YOLOv8 output parsing
          // For a 640x640 model with 6 classes (dice 1-6), the output shape is usually [1, 10, 8400]
          // where 10 = 4 (x, y, w, h) + 6 class probabilities.
          // 8400 is the number of anchor boxes predicted.
          const outputTensor = outputs[0] as Float32Array;
          const outputShape = tfliteModel.outputs[0].shape; // e.g. [1, 10, 8400] or [1, 8400, 10]

          let numFeatures = 10;
          let numAnchors = 8400;
          let isTransposed = false;

          // Dynamically detect YOLO format shape
          if (outputShape.length >= 3) {
            if (outputShape[1] === 10) {
              numFeatures = outputShape[1];
              numAnchors = outputShape[2];
              isTransposed = true; // [1, 10, 8400]
            } else {
              numAnchors = outputShape[1];
              numFeatures = outputShape[2];
              isTransposed = false; // [1, 8400, 10]
            }
          }

          const detectionsArr: DiceDetection[] = [];

          for (let i = 0; i < numAnchors; i++) {
            let maxProb = 0;
            let classIdx = -1;

            // Extract the 6 class probabilities
            for (let c = 0; c < 6; c++) {
              const prob = isTransposed
                ? outputTensor[(4 + c) * numAnchors + i]
                : outputTensor[i * numFeatures + (4 + c)];
              if (prob > maxProb) {
                maxProb = prob;
                classIdx = c;
              }
            }

            // Lowered confidence threshold for testing
            if (maxProb > 0.4) {
              const cx = isTransposed
                ? outputTensor[0 * numAnchors + i]
                : outputTensor[i * numFeatures + 0];
              const cy = isTransposed
                ? outputTensor[1 * numAnchors + i]
                : outputTensor[i * numFeatures + 1];
              const w = isTransposed
                ? outputTensor[2 * numAnchors + i]
                : outputTensor[i * numFeatures + 2];
              const h = isTransposed
                ? outputTensor[3 * numAnchors + i]
                : outputTensor[i * numFeatures + 3];

              detectionsArr.push({
                x: (cx - w / 2) * scaleX,
                y: (cy - h / 2) * scaleY,
                width: w * scaleX,
                height: h * scaleY,
                value: classIdx + 1,
                confidence: maxProb,
              });
            }
          }

          // Apply Non-Maximum Suppression (NMS) to remove duplicate boxes
          // (Simplified NMS just sorting by confidence and taking top results)
          detectionsArr.sort((a, b) => b.confidence - a.confidence);
          const finalDetections: DiceDetection[] = [];

          for (const det of detectionsArr) {
            let isDuplicate = false;
            for (const finalDet of finalDetections) {
              // Simple Intersection over Union (IoU) approximation check
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

          setDetectionsJS(finalDetections);

          if (finalDetections.length === neededCount) {
            const finalValues = finalDetections.map((d) => d.value);
            onScanCompleteJS(finalValues);
          }
        } catch (error: any) {
          console.error('Frame processor error:', error?.message || error);
        }
      });
    },
    [tfliteModel, resize],
  );

  const handleSimulatedScan = () => {
    const mockResult = Array.from({ length: neededCount }, () =>
      Math.ceil(Math.random() * 6),
    );
    onScanComplete(mockResult);
  };

  if (!device && !permissionError)
    return (
      <View style={styles.scannerContainer}>
        <Text style={styles.centerText}>Loading camera...</Text>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <X size={32} color={'white'} />
        </Pressable>
      </View>
    );
  if (permissionError)
    return (
      <View style={styles.scannerContainer}>
        <View style={styles.container}>
          <Text style={styles.errorText}>Camera permission denied.</Text>
          <View style={{ alignItems: 'center', marginTop: 20 }}>
            <Pressable
              onPress={handleSimulatedScan}
              style={styles.captureButton}
            >
              <View style={styles.captureInnerButton} />
            </Pressable>
          </View>
          <Text style={styles.hintText}>
            Please enable camera access in settings to scan real dice.
          </Text>
          <Text style={styles.hintText}>
            Tap the button above to simulate a roll instead.
          </Text>
        </View>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <X size={32} color={'white'} />
        </Pressable>
      </View>
    );

  return (
    <View style={styles.scannerContainer}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        pixelFormat="rgb"
        frameProcessor={frameProcessor}
      />
      <AROverlay
        detections={detections}
        targetCount={neededCount}
        onReady={setIsCameraReady}
      />

      <Pressable onPress={onClose} style={styles.closeButton}>
        <X size={32} color={'white'} />
      </Pressable>

      <View style={styles.captureArea}>
        <Pressable
          onPress={handleSimulatedScan}
          disabled={!isCameraReady}
          style={[
            styles.captureButton,
            isCameraReady
              ? styles.captureButtonActive
              : styles.captureButtonDisabled,
          ]}
        >
          <View
            style={[
              styles.captureInnerButton,
              isCameraReady && styles.captureInnerButtonActive,
            ]}
          />
        </Pressable>
        <Text
          style={[
            styles.captureHint,
            isCameraReady && styles.captureHintActive,
          ]}
        >
          {isCameraReady ? 'TAP TO CAPTURE' : 'Waiting for dice...'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    position: 'relative',
  },
  centerText: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    color: 'white',
    fontSize: 18,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    fontSize: 18,
    marginVertical: 20,
  },
  hintText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 10,
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 32,
  },
  captureArea: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  captureButtonActive: {
    borderColor: '#00FF00',
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
  },
  captureButtonDisabled: {
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  captureInnerButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  captureInnerButtonActive: {
    backgroundColor: 'white',
  },
  captureHint: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginTop: 10,
    color: 'white',
    opacity: 0.7,
  },
  captureHintActive: {
    color: '#00FF00',
    opacity: 1,
    fontWeight: 'bold',
  },
  scannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
    zIndex: 50,
  },
});
