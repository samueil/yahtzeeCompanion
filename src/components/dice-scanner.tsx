import { XIcon } from 'lucide-nativewind';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
import type { DiceDetection } from '../domain/dice-detection';
import { processDiceFrame } from '../lib/dice-processor';
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

  const [containerLayout, setContainerLayout] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      if (!tfliteModel || !containerLayout) return;

      const screenWidth = containerLayout.width;
      const screenHeight = containerLayout.height;

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

          // The native camera sensor on most Android phones is always landscape (e.g. 1920x1080)
          // even if the app is locked to portrait! So `frame.width` is usually the larger number.
          const frameWidth = frame.width;
          const frameHeight = frame.height;
          const isSensorLandscape = frameWidth > frameHeight;

          const cropSize = isSensorLandscape ? frameHeight : frameWidth;
          const cropX = isSensorLandscape ? (frameWidth - cropSize) / 2 : 0;
          const cropY = isSensorLandscape ? 0 : (frameHeight - cropSize) / 2;

          // The sensor is rotated relative to the portrait UI.
          // Rotating 90deg aligns the raw frame perfectly upright for the ML model.
          const rotation = '90deg';
          const resized = resize(frame, {
            scale: { width: expectedWidth, height: expectedHeight },
            crop: { x: cropX, y: cropY, width: cropSize, height: cropSize },
            pixelFormat: 'rgb',
            dataType: requiredDataType,
            rotation,
          });
          const outputs = tfliteModel.runSync([resized]);
          const outputTensor = outputs[0] as Float32Array;
          const outputShape = tfliteModel.outputs[0].shape;

          // The Camera component defaults to `resizeMode="cover"`.
          // On modern phones (e.g. 20:9 aspect ratio), the screen is taller than the 16:9 camera sensor.
          // To cover the whole screen, the Camera component zooms in the video feed, cropping the left and right sides!
          // We must calculate the exact pixel size of the video feed as it is rendered on the screen.

          const portraitVideoWidth = isSensorLandscape
            ? frameHeight
            : frameWidth;
          const portraitVideoHeight = isSensorLandscape
            ? frameWidth
            : frameHeight;

          const screenAspectRatio = screenHeight / screenWidth;
          const videoAspectRatio = portraitVideoHeight / portraitVideoWidth;

          let renderedVideoWidth = screenWidth;
          let renderedVideoHeight = screenHeight;

          if (screenAspectRatio > videoAspectRatio) {
            // Screen is taller than video (e.g. 20:9 screen vs 16:9 video).
            // Video is scaled up to match screen height, so width overflows off-screen.
            const scale = screenHeight / portraitVideoHeight;
            renderedVideoWidth = portraitVideoWidth * scale;
            renderedVideoHeight = screenHeight;
          } else {
            // Screen is wider than video (e.g. iPad).
            // Video is scaled up to match screen width, so height overflows off-screen.
            const scale = screenWidth / portraitVideoWidth;
            renderedVideoWidth = screenWidth;
            renderedVideoHeight = portraitVideoHeight * scale;
          }

          // The Y offset on the screen to the top of our centered square crop
          //  The cropped 1:1 square's size on the screen is exactly equal to the rendered video's shortest side
          // (which is `portraitVideoWidth * scale`, i.e., `renderedVideoWidth`).
          const screenCropY = (renderedVideoHeight - renderedVideoWidth) / 2;

          // Because the video width might overflow off the sides of the screen (resizeMode=cover),
          // we must subtract half the overflow so the X coordinates map correctly to the visible screen!
          const screenOverflowX = (renderedVideoWidth - screenWidth) / 2;

          const finalDetections = processDiceFrame({
            outputTensor,
            outputShape,
            cropY: screenCropY,
            cropSize: renderedVideoWidth, // offsetY
            offsetX: -screenOverflowX, // Shift boxes left by the overflow amount
            confidenceThreshold: 0.15,
          });

          if (finalDetections.length > 0) {
            console.log(
              `[FrameProcessor] Found ${finalDetections.length} dice!`,
            );
            if (finalDetections.length === 1) {
              console.log({ singleDetection: finalDetections[0] });
            }
          } else {
            // Debug log on failure
            const debugLimit = 2;
            console.log(
              `[FrameProcessor] NO DICE FOUND. RAW TENSOR SAMPLE (First ${debugLimit} anchors):`,
            );
            const numAnchors =
              outputShape.length >= 3
                ? outputShape[1] < outputShape[2]
                  ? outputShape[2]
                  : outputShape[1]
                : 8400;
            const numFeatures =
              outputShape.length >= 3
                ? outputShape[1] < outputShape[2]
                  ? outputShape[1]
                  : outputShape[2]
                : 11;
            const isTransposed =
              outputShape.length >= 3 && outputShape[1] < outputShape[2];

            for (let i = 0; i < debugLimit; i++) {
              const vals = [];
              for (let f = 0; f < numFeatures; f++) {
                const val = isTransposed
                  ? outputTensor[f * numAnchors + i]
                  : outputTensor[i * numFeatures + f];
                vals.push(val.toFixed(4));
              }
              console.log(`Anchor ${i}: [${vals.join(', ')}]`);
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
      <View className="absolute inset-0 z-50 bg-black">
        <Text className="flex-1 items-center justify-center text-lg text-white">
          Loading camera...
        </Text>
        <Pressable
          onPress={onClose}
          className="absolute right-5 top-5 z-10 rounded-full bg-white/20 p-2"
        >
          <XIcon size={32} color="white" />
        </Pressable>
      </View>
    );
  if (permissionError)
    return (
      <View className="absolute inset-0 z-50 bg-black">
        <View className="relative flex-1 bg-black">
          <Text className="my-5 text-center text-lg text-destructive">
            Camera permission denied.
          </Text>
          <View className="mt-5 items-center">
            <Pressable
              onPress={handleSimulatedScan}
              className="size-16 items-center justify-center rounded-full border-4 border-white bg-white/10"
            >
              <View className="size-12 rounded-full bg-white/20" />
            </Pressable>
          </View>
          <Text className="mt-2.5 text-center text-sm text-white">
            Please enable camera access in settings to scan real dice.
          </Text>
          <Text className="mt-2.5 text-center text-sm text-white">
            Tap the button above to simulate a roll instead.
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          className="absolute right-5 top-5 z-10 rounded-full bg-white/20 p-2"
        >
          <XIcon size={32} color={'white'} />
        </Pressable>
      </View>
    );

  return (
    <View
      style={StyleSheet.absoluteFill}
      className="z-50 bg-black"
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
        onReady={setIsCameraReady}
      />

      <Pressable
        onPress={onClose}
        className="absolute right-5 top-5 z-10 rounded-full bg-white/20 p-2"
      >
        <XIcon size={32} color={'white'} />
      </Pressable>

      <View className="absolute inset-x-0 bottom-10 z-10 items-center justify-center">
        <Pressable
          onPress={handleSimulatedScan}
          disabled={!isCameraReady}
          className={`size-16 items-center justify-center rounded-full border-4 ${
            isCameraReady
              ? 'border-success bg-success/10'
              : 'border-white/40 bg-white/5'
          }`}
        >
          <View
            className={`size-12 rounded-full ${
              isCameraReady ? 'bg-white' : 'bg-white/20'
            }`}
          />
        </Pressable>
        <Text
          className={`mt-2.5 font-mono text-xs text-white opacity-70 ${
            isCameraReady && 'font-bold text-success opacity-100'
          }`}
        >
          {isCameraReady ? 'TAP TO CAPTURE' : 'Waiting for dice...'}
        </Text>
      </View>
    </View>
  );
};
