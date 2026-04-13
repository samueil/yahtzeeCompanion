import { XIcon } from 'lucide-nativewind';
import React from 'react';
import { Pressable } from 'react-native';

interface CloseButtonProps {
  onPress: () => void;
}

export const CloseButton = ({ onPress }: CloseButtonProps) => (
  <Pressable
    onPress={onPress}
    className="absolute right-5 top-5 z-10 rounded-full bg-white/20 p-2"
  >
    <XIcon size={32} color="white" />
  </Pressable>
);
