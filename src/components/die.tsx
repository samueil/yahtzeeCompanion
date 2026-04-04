import { Check } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

interface DieProps {
  value: number;
  locked: boolean;
  onClick: () => void;
  size?: 'large' | 'small';
}

export const Die = ({ value, locked, onClick, size = 'large' }: DieProps) => {
  // Dot positions and styles based on value
  const dotStyles: Record<number, Array<object>> = {
    1: [{ justifyContent: 'center', alignItems: 'center' }],
    2: [
      { justifyContent: 'flex-start', alignItems: 'flex-start' },
      { justifyContent: 'flex-end', alignItems: 'flex-end' },
    ],
    3: [
      { justifyContent: 'flex-start', alignItems: 'flex-start' },
      { justifyContent: 'center', alignItems: 'center' },
      { justifyContent: 'flex-end', alignItems: 'flex-end' },
    ],
    4: [
      { justifyContent: 'flex-start', alignItems: 'flex-start' },
      { justifyContent: 'flex-end', alignItems: 'flex-start' },
      { justifyContent: 'flex-start', alignItems: 'flex-end' },
      { justifyContent: 'flex-end', alignItems: 'flex-end' },
    ],
    5: [
      { justifyContent: 'flex-start', alignItems: 'flex-start' },
      { justifyContent: 'flex-end', alignItems: 'flex-start' },
      { justifyContent: 'center', alignItems: 'center' },
      { justifyContent: 'flex-start', alignItems: 'flex-end' },
      { justifyContent: 'flex-end', alignItems: 'flex-end' },
    ],
    6: [
      { justifyContent: 'flex-start', alignItems: 'flex-start' },
      { justifyContent: 'flex-end', alignItems: 'flex-start' },
      { justifyContent: 'flex-start', alignItems: 'center' },
      { justifyContent: 'flex-end', alignItems: 'center' },
      { justifyContent: 'flex-start', alignItems: 'flex-end' },
      { justifyContent: 'flex-end', alignItems: 'flex-end' },
    ],
  };

  const baseSizeStyle = size === 'large' ? styles.largeDie : styles.smallDie;
  const dotSizeStyle = size === 'large' ? styles.largeDot : styles.smallDot;
  const paddingStyle =
    size === 'large' ? styles.largePadding : styles.smallPadding;

  const shouldShowDot = (index: number, val: number): boolean => {
    if (val === 1) return index === 4;
    if (val === 2) return index === 0 || index === 8;
    if (val === 3) return index === 0 || index === 4 || index === 8;
    if (val === 4)
      return index === 0 || index === 2 || index === 6 || index === 8;
    if (val === 5)
      return (
        index === 0 || index === 2 || index === 4 || index === 6 || index === 8
      );
    if (val === 6)
      return (
        index === 0 ||
        index === 2 ||
        index === 3 ||
        index === 5 ||
        index === 6 ||
        index === 8
      );
    return false;
  };

  return (
    <Pressable
      onPress={onClick}
      style={({ pressed }) => [
        styles.dieBase,
        baseSizeStyle,
        paddingStyle,
        locked
          ? styles.lockedDie
          : pressed
            ? styles.dieHover
            : styles.dieDefault,
      ]}
    >
      <View style={styles.dotGrid}>
        {[...Array(9)].map((_, i) => (
          <View key={i} style={[styles.dotContainer, dotStyles[value]?.[i]]}>
            {shouldShowDot(i, value) && (
              <View style={[styles.dot, dotSizeStyle]} />
            )}
          </View>
        ))}
      </View>

      {locked && (
        <View style={styles.lockIconContainer}>
          <Check size={12} strokeWidth={3} color="white" />
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  dieBase: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb', // gray-200
    flexWrap: 'wrap',
    justifyContent: 'center',
    position: 'relative',
  },
  largeDie: {
    width: 64,
    height: 64,
  },
  smallDie: {
    width: 32,
    height: 32,
  },
  largePadding: {
    padding: 8,
  },
  smallPadding: {
    padding: 4,
  },
  dieDefault: {},
  dieHover: {},
  lockedDie: {
    borderColor: '#ef4444', // red-500
    borderWidth: 2,
    opacity: 0.9,
  },
  dotContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotGrid: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  dot: {
    backgroundColor: 'black',
    borderRadius: 9999, // rounded-full
  },
  largeDot: { width: 12, height: 12 },
  smallDot: { width: 6, height: 6 },
  lockIconContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444', // red-500
    borderRadius: 9999, // rounded-full
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2, // for Android
  },
});
