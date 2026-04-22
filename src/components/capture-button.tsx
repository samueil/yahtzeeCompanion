import React from 'react';
import classNames from 'classnames';
import { Pressable, Text, View } from 'react-native';

interface CaptureButtonProps {
  onPress: () => void;
  disabled: boolean;
  isReady: boolean;
  label?: string;
}

export const CaptureButton = ({
  onPress,
  disabled,
  isReady,
  label = 'TAP TO CAPTURE',
}: CaptureButtonProps) => (
  <View className="absolute inset-x-0 bottom-10 z-10 items-center justify-center">
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={classNames(
        'size-16 items-center justify-center rounded-full border-4',
        isReady ? 'border-success bg-success/10' : 'border-white/40 bg-white/5',
      )}
    >
      <View
        className={classNames('size-12 rounded-full', {
          'bg-white': isReady,
          'bg-white/20': !isReady,
        })}
      />
    </Pressable>
    <Text
      className={classNames('mt-2.5 font-mono text-xs text-white opacity-70', {
        'font-bold text-success opacity-100': isReady,
      })}
    >
      {isReady ? label : 'Waiting for dice...'}
    </Text>
  </View>
);
