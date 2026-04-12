import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { DiceDetection } from '../domain/dice-detection';

const CONFIDENCE_THRESHOLD = 0.15;

interface AROverlayProps {
  detections: DiceDetection[];
  targetCount: number;
  onReady: (isReady: boolean) => void;
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
  onReady,
}: AROverlayProps) => {
  useEffect(() => {
    // Simple logic to determine if the overlay is "ready" based on detections
    // We consider it ready if we have detected at least the target number of dice
    // with a reasonable confidence.
    const suitableDetections = detections.filter(
      (d) => d.confidence > CONFIDENCE_THRESHOLD,
    );
    if (suitableDetections.length >= targetCount) {
      onReady(true);
    } else {
      onReady(false);
    }
  }, [detections, targetCount, onReady]);

  return (
    <View style={StyleSheet.absoluteFill}>
      {detections.map((det, index) => {
        const colors = getConfidenceColor(det.confidence);
        return (
          <View
            key={index}
            testID={`detection-box-${index}`}
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
          </View>
        );
      })}
    </View>
  );
};
