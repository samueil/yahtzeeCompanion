import { XIcon } from 'lucide-nativewind';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

interface DiceScannerProps {
  neededCount: number;
  onScanComplete: (diceValues: number[]) => void;
  onClose: () => void;
}

// We only mock the camera, so isCameraReady is always true
const isCameraReady = true;

export const DiceScanner = ({
  neededCount,
  onScanComplete,
  onClose,
}: DiceScannerProps) => {
  const handleSimulatedScan = () => {
    const mockResult = Array.from({ length: neededCount }, () =>
      Math.ceil(Math.random() * 6),
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
          {isCameraReady ? 'TAP TO SIMULATE' : 'Waiting for dice...'}
        </Text>
      </View>
    </View>
  );
};
