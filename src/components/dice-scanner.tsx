import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTensorflowModel } from 'react-native-fast-tflite';
import {
  Camera,
  runAtTargetFps,
  useCameraDevice,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { AROverlay } from './ar-overlay';
import { CaptureButton } from './capture-button';
import { CloseButton } from './close-button';
import type { DiceDetection } from '../domain/dice-detection';
import type { DieValue } from '../domain/die-value';
import { useCameraPermissions } from '../hooks/use-camera-permissions';
import {
  calculateCoordinateMapping,
  CONFIDENCE_THRESHOLD,
  processDiceFrame,
} from '../lib/dice-processor';

interface DiceScannerProps {
  neededCount: number;
  onScanComplete: (diceValues: DieValue[]) => void;
  onClose: () => void;
}

export const DiceScanner = ({
  neededCount,
  onScanComplete,
  onClose,
}: DiceScannerProps) => {
  const device = useCameraDevice('back');
  const { hasPermission, permissionError } = useCameraPermissions();

  const [isDiceDetected, setIsDiceDetected] = useState<boolean>(false);

  // Note: We avoid useSharedValue/runOnJS to fix Reanimated 3+ bridge issues.
  // Instead we directly rely on the built-in Worklet capabilities of VisionCamera.
  const [detections, setDetections] = useState<DiceDetection[]>([]);
  const [finalValues, setFinalValues] = useState<DieValue[]>([]);
  const setDetectionsJS = Worklets.createRunOnJS(setDetections);
  const setFinalValuesJS = Worklets.createRunOnJS(setFinalValues);
  const onScanCompleteJS = Worklets.createRunOnJS(onScanComplete);

  const objectDetection = useTensorflowModel(
    require('../../assets/yolov8-dice.tflite'),
  );

  const { resize } = useResizePlugin();

  // Create a local reference to the loaded model to prevent C++ destruction race conditions
  // inside the worklet when it's accessed dynamically
  const tfliteModel =
    objectDetection.state === 'loaded' ? objectDetection.model : undefined;

  const [containerLayout, setContainerLayout] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      if (!tfliteModel || !containerLayout) return;

      runAtTargetFps(2, () => {
        'worklet';
        try {
          const mapping = calculateCoordinateMapping({
            frameWidth: frame.width,
            frameHeight: frame.height,
            containerWidth: containerLayout.width,
            containerHeight: containerLayout.height,
          });

          // Dynamically determine the size expected by the model
          const inputTensor = tfliteModel.inputs[0];
          const expectedHeight = inputTensor.shape[1] || 640;
          const expectedWidth = inputTensor.shape[2] || 640;
          const requiredDataType =
            inputTensor.dataType === 'uint8' ? 'uint8' : 'float32';

          const resized = resize(frame, {
            scale: { width: expectedWidth, height: expectedHeight },
            crop: {
              x: mapping.sensorCropX,
              y: mapping.sensorCropY,
              width: mapping.sensorCropSize,
              height: mapping.sensorCropSize,
            },
            pixelFormat: 'rgb',
            dataType: requiredDataType,
            rotation: '90deg',
          });

          const outputs = tfliteModel.runSync([resized]);
          const outputTensor = outputs[0] as Float32Array;
          const outputShape = tfliteModel.outputs[0].shape;

          const finalDetections = processDiceFrame({
            outputTensor,
            outputShape,
            cropY: mapping.screenCropY,
            cropSize: mapping.screenCropSize,
            offsetX: mapping.screenOffsetX,
            confidenceThreshold: CONFIDENCE_THRESHOLD,
          });

          setDetectionsJS(finalDetections);

          if (finalDetections.length >= neededCount) {
            setFinalValuesJS(
              finalDetections.slice(0, neededCount).map((d) => d.value),
            );
          }
        } catch (error: any) {
          console.error('Frame processor error:', error?.message || error);
        }
      });
    },
    [tfliteModel, resize, containerLayout, neededCount],
  );

  if ((!device || !hasPermission) && !permissionError)
    return (
      <View className="absolute inset-0 z-50 bg-black">
        <Text className="flex-1 items-center justify-center text-lg text-white">
          Loading camera...
        </Text>
        <CloseButton onPress={onClose} />
      </View>
    );
  if (permissionError)
    return (
      <View className="absolute inset-0 z-50 bg-black">
        <View className="relative flex-1 justify-center bg-black">
          <Text className="my-5 text-center text-lg text-destructive">
            Camera permission denied.
          </Text>
          <Text className="mt-2.5 text-center text-sm text-white">
            Please enable camera access in settings to scan real dice.
          </Text>
          <Pressable
            onPress={() => Linking.openSettings()}
            className="mx-auto mt-6 rounded-lg bg-primary px-6 py-3"
          >
            <Text className="font-bold text-white">Open Settings</Text>
          </Pressable>
        </View>
        <CloseButton onPress={onClose} />
      </View>
    );

  return (
    <View
      className="absolute inset-0 z-50 bg-black"
      onLayout={(e) => {
        setContainerLayout({
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        });
      }}
    >
      <Camera
        style={StyleSheet.absoluteFill}
        device={device!}
        isActive={true}
        pixelFormat="rgb"
        frameProcessor={frameProcessor}
      />
      <AROverlay
        detections={detections}
        targetCount={neededCount}
        onDetectionSatisfied={setIsDiceDetected}
      />

      <CloseButton onPress={onClose} />

      <CaptureButton
        onPress={() => onScanCompleteJS(finalValues)}
        disabled={finalValues.length < neededCount}
        isReady={isDiceDetected && finalValues.length >= neededCount}
      />
    </View>
  );
};
