// src/components/AROverlay.tsx
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { DiceDetection } from '../domain/dice-tetection';

// Props for the AROverlay component
interface AROverlayProps {
  detections: DiceDetection[];
  targetCount: number;
  onReady: (isReady: boolean) => void;
}

export const AROverlay = ({
  detections,
  targetCount,
  onReady,
}: AROverlayProps) => {
  useEffect(() => {
    // Simple logic to determine if the overlay is "ready" based on detections
    // We consider it ready if we have detected at least the target number of dice
    // with a reasonable confidence.
    const suitableDetections = detections.filter((d) => d.confidence > 0.7); // Example confidence threshold
    if (suitableDetections.length >= targetCount) {
      onReady(true);
    } else {
      onReady(false);
    }
  }, [detections, targetCount, onReady]);

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Render bounding boxes and dice values here */}
      {detections.map((det, index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            left: det.x,
            top: det.y,
            width: det.width,
            height: det.height,
            borderWidth: 2,
            borderColor: 'rgba(0, 255, 0, 0.7)', // Green bounding box
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 255, 0, 0.1)', // Semi-transparent overlay
          }}
        >
          <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
            {det.value}
          </Text>
        </View>
      ))}
    </View>
  );
};
