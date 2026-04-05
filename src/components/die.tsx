import classNames from 'classnames';
import { CheckIcon } from 'lucide-nativewind';
import React from 'react';
import { Pressable, View } from 'react-native';

interface DieProps {
  value: number;
  locked: boolean;
  onClick: () => void;
  disabled: boolean;
  size?: 'large' | 'small';
}

export const Die = ({
  value,
  locked,
  onClick,
  size = 'large',
  disabled,
}: DieProps) => {
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
      accessibilityRole="button"
      accessibilityLabel={`Die with value ${value}${locked ? ', locked' : ''}`}
      onPress={onClick}
      disabled={disabled}
      className={classNames(
        `relative flex-wrap justify-center rounded-lg border bg-white ${dieSize} ${padding}`,
        {
          'border-destructive opacity-90': locked && !disabled,
          'active:bg-gray-100': !locked && !disabled,
          'border-disabled': disabled,
        },
      )}
    >
      <View className="size-full flex-row flex-wrap">
        {[...Array(9)].map((_, i) => (
          <View key={i} className="flex size-1/3 items-center justify-center">
            {shouldShowDot(i, value) && (
              <View
                className={`${disabled ? 'bg-disabled' : 'bg-black'} rounded-full ${dotSize}`}
              />
            )}
          </View>
        ))}
      </View>

      {locked && (
        <View className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 shadow-md">
          <CheckIcon size={12} strokeWidth={3} color="white" />
        </View>
      )}
    </Pressable>
  );
};
