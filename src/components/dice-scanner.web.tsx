import { X } from 'lucide-react-native';
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
    <View className="absolute inset-0 bg-black z-50">
      <View className="flex-1 justify-center items-center bg-slate-800">
        <Text className="text-muted text-lg font-bold mb-2">
          [ Camera not available on Web ]
        </Text>
        <Text className="text-muted text-sm">Using simulated dice rolls.</Text>
      </View>

      <Pressable
        onPress={onClose}
        className="absolute top-5 right-5 z-10 p-2 bg-white/20 rounded-full"
      >
        <X size={32} color={'white'} />
      </Pressable>

      <View className="absolute bottom-10 left-0 right-0 items-center justify-center z-10">
        <Pressable
          onPress={handleSimulatedScan}
          disabled={!isCameraReady}
          className={`w-16 h-16 rounded-full border-4 justify-center items-center ${
            isCameraReady
              ? 'border-success bg-success/10'
              : 'border-white/40 bg-white/5'
          }`}
        >
          <View
            className={`w-12 h-12 rounded-full ${
              isCameraReady ? 'bg-white' : 'bg-white/20'
            }`}
          />
        </Pressable>
        <Text
          className={`text-xs font-mono mt-2.5 text-white opacity-70 ${
            isCameraReady && 'text-success opacity-100 font-bold'
          }`}
        >
          {isCameraReady ? 'TAP TO SIMULATE' : 'Waiting for dice...'}
        </Text>
      </View>
    </View>
  );
};
