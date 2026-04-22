import React from 'react';
import { Text, View } from 'react-native';
import { CaptureButton } from './capture-button';
import { CloseButton } from './close-button';
import type { DieValue } from '../domain/die-value';

const IS_CAMERA_READY = true;

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
  const handleSimulatedScan = () => {
    const mockResult = Array.from(
      { length: neededCount },
      () => Math.ceil(Math.random() * 6) as DieValue,
    );
    onScanComplete(mockResult);
  };

  return (
    <View className="absolute inset-0 z-50 bg-black">
      <View className="flex-1 items-center justify-center bg-slate-800">
        <Text className="mb-2 text-lg font-bold text-muted">
          [ Camera not available on Web ]
        </Text>
        <Text className="text-sm text-muted">Using simulated dice rolls.</Text>
      </View>

      <CloseButton onPress={onClose} />

      <CaptureButton
        onPress={handleSimulatedScan}
        disabled={!IS_CAMERA_READY}
        isReady={IS_CAMERA_READY}
        label="TAP TO SIMULATE"
      />
    </View>
  );
};
