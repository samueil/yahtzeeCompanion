import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import type { DiceDetection } from '../domain/dice-detection';
import { CONFIDENCE_THRESHOLD } from '../lib/dice-processor';
import { IS_PRE_RELEASE } from '../lib/app-info';

const isDebugBuild = __DEV__ || IS_PRE_RELEASE;

interface AROverlayProps {
  detections: DiceDetection[];
  targetCount: number;
  onDetectionSatisfied: (isSatisfied: boolean) => void;
}

const getConfidenceColor = (confidence: number) => {
  // Normalize confidence (threshold is 0.15, max is ~1.0) to a 0 to 1 range
  // so we use the full color spectrum from the threshold upwards.
  const normalized = Math.max(0, Math.min(1, (confidence - 0.15) / 0.85));

  // Mathematical Red -> Yellow -> Green transition:
  // Red stays high until 50%, then drops.
  const r = Math.round(255 * Math.min(1, 2 * (1 - normalized)));
  // Green rises to max by 50%, then stays high.
  const g = Math.round(255 * Math.min(1, 2 * normalized));
  // Blue stays low to keep colors vibrant, not washed out.
  const b = 30;

  return {
    border: `rgba(${r}, ${g}, ${b}, 0.8)`,
    bg: `rgba(${r}, ${g}, ${b}, 0.2)`,
  };
};

export const AROverlay = ({
  detections,
  targetCount,
  onDetectionSatisfied,
}: AROverlayProps) => {
  useEffect(() => {
    // Simple logic to determine if the overlay is "ready" based on detections
    // We consider it ready if we have detected at least the target number of dice
    // with a reasonable confidence.
    const suitableDetections = detections.filter(
      (d) => d.confidence > CONFIDENCE_THRESHOLD,
    );
    if (suitableDetections.length >= targetCount) {
      onDetectionSatisfied(true);
    } else {
      onDetectionSatisfied(false);
    }
  }, [detections, targetCount, onDetectionSatisfied]);

  return (
    <View className="absolute inset-0">
      {detections.map((det, index) => {
        const colors = getConfidenceColor(det.confidence);

        return (
          <View
            key={det.id ?? index}
            testID={`detection-box-${det.id ?? index}`}
            className="absolute items-center justify-center border-2"
            style={{
              left: det.x,
              top: det.y,
              width: det.width,
              height: det.height,
              borderColor: colors.border,
              backgroundColor: colors.bg,
            }}
          >
            <Text className="text-xs font-bold text-white">{det.value}</Text>
            {isDebugBuild && det.id && (
              <View className="absolute -bottom-5 -right-2 rounded bg-black/60 px-1 py-0.5">
                <Text className="text-[10px] text-white">
                  #{det.id.replace('die-', '')} [{det.historyLength}/10]
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};
