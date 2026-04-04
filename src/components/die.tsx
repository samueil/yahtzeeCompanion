import { Check } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';

interface DieProps {
  value: number;
  locked: boolean;
  onClick: () => void;
  size?: 'large' | 'small';
}

export const Die = ({ value, locked, onClick, size = 'large' }: DieProps) => {
  const shouldShowDot = (index: number, val: number): boolean => {
    const patterns: Record<number, number[]> = {
      1: [4],
      2: [2, 6],
      3: [2, 4, 6],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8],
    };
    return patterns[val]?.includes(index);
  };

  const dieSize = size === 'large' ? 'w-16 h-16' : 'w-8 h-8';
  const dotSize = size === 'large' ? 'w-3 h-3' : 'w-1.5 h-1.5';
  const padding = size === 'large' ? 'p-2' : 'p-1';

  return (
    <Pressable
      onPress={onClick}
      className={`bg-white rounded-lg border-2 border flex-wrap justify-center relative ${dieSize} ${padding} ${
        locked ? 'border-destructive opacity-90' : 'active:bg-gray-100'
      }`}
    >
      <View className="w-full h-full flex-row flex-wrap">
        {[...Array(9)].map((_, i) => (
          <View
            key={i}
            className="w-1/3 h-1/3 flex justify-center items-center"
          >
            {shouldShowDot(i, value) && (
              <View className={`bg-black rounded-full ${dotSize}`} />
            )}
          </View>
        ))}
      </View>

      {locked && (
        <View className="absolute -top-1 -right-1 bg-destructive rounded-full p-0.5 shadow-md">
          <Check size={12} strokeWidth={3} color="white" />
        </View>
      )}
    </Pressable>
  );
};
