/* eslint-disable react/no-unknown-property */
import { Canvas } from '@react-three/fiber/native';
import {
  CalculatorIcon,
  CameraIcon,
  DicesIcon,
  Edit2Icon,
  RotateCcwIcon,
} from 'lucide-nativewind';
import React, { useEffect, useState, Suspense } from 'react';
import { Pressable, ScrollView, Text, View, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import './global.css';
import { DiceScanner, ThreeDie } from './src/components';
import { CATEGORIES } from './src/constants/categories';
import type { Category } from './src/domain/category';
import { calculatePotentialScore } from './src/lib/scoring';
import { colors } from './src/theme/colors';

export const App = () => {
  const [dice, setDice] = useState<number[]>([1, 1, 1, 1, 1]);
  const [locked, setLocked] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false,
  ]);
  const [diceRolled, setDiceRolled] = useState<boolean>(false);
  const [rollsLeft, setRollsLeft] = useState<number>(3);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const [gameState, setGameState] = useState<'playing' | 'finished'>('playing');
  const [turn, setTurn] = useState<number>(1);
  const [inputMode, setInputMode] = useState<'camera' | 'dice'>(
    Platform.OS === 'web' ? 'dice' : 'camera',
  );

  // State for 3D animation control
  const [isRolling, setIsRolling] = useState<boolean>(false);

  const handleDieClick = (index: number) => {
    if (rollsLeft === 3 || isRolling) return;
    toggleLock(index);
  };

  const toggleLock = (index: number) => {
    const newLocked = [...locked];
    newLocked[index] = !newLocked[index];
    setLocked(newLocked);
  };

  const cycleDieValue = (index: number) => {
    if (isRolling) return;
    const newDice = [...dice];
    newDice[index] = newDice[index] === 6 ? 1 : newDice[index] + 1;
    setDice(newDice);
  };

  const handleScanComplete = (detectedValues: number[]) => {
    const newDice = [...dice];
    let detectionIndex = 0;
    newDice.forEach((_, idx) => {
      if (!locked[idx]) {
        if (detectedValues[detectionIndex] !== undefined) {
          newDice[idx] = detectedValues[detectionIndex];
          detectionIndex++;
        }
      }
    });
    setDice(newDice);
    setDiceRolled(true);
    setRollsLeft((prev) => prev - 1);
    setShowScanner(false);
  };

  const handleRandomRoll = () => {
    if (rollsLeft === 0 || isRolling) return;

    setIsRolling(true);

    // Syncing the animation duration (1s) with the state update
    setTimeout(() => {
      const newDice = dice.map((val, idx) => {
        if (locked[idx]) return val;

        return Math.floor(Math.random() * 6) + 1;
      });

      setDice(newDice);
      setDiceRolled(true);
      setRollsLeft((prev) => prev - 1);
      setIsRolling(false);
    }, 1000);
  };

  const selectCategory = (cat: Category) => {
    if (rollsLeft === 3 || scores[cat.id] !== undefined || isRolling) return;
    const score = calculatePotentialScore(dice, cat);
    setScores((prev) => ({ ...prev, [cat.id]: score }));
    setDice([1, 1, 1, 1, 1]);
    setLocked([false, false, false, false, false]);
    setDiceRolled(false);
    setRollsLeft(3);
    setTurn((prev) => prev + 1);
  };

  const upperScore = CATEGORIES.UPPER.reduce(
    (acc, cat) => acc + (scores[cat.id] || 0),
    0,
  );
  const bonus = upperScore >= 63 ? 35 : 0;
  const lowerScore = CATEGORIES.LOWER.reduce(
    (acc, cat) => acc + (scores[cat.id] || 0),
    0,
  );
  const totalScore = upperScore + bonus + lowerScore;

  useEffect(() => {
    if (Object.keys(scores).length === 13) {
      setGameState('finished');
    }
  }, [scores]);

  const handleResetGame = () => {
    setScores({});
    setRollsLeft(3);
    setTurn(1);
    setGameState('playing');
    setDice([1, 1, 1, 1, 1]);
    setLocked([false, false, false, false, false]);
  };

  const neededDiceCount = locked.filter((l) => !l).length;

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 overflow-hidden">
          {/* Header Section */}
          <View className="z-10 flex-row items-center justify-between bg-primary-dark p-4 shadow-lg">
            <View>
              <View className="flex-row items-center">
                <CalculatorIcon
                  size={20}
                  color={colors['primary-light']}
                  className="mr-2"
                />
                <Text className="ml-2 text-xl font-bold text-primary-light">
                  Yahtzee Companion
                </Text>
              </View>
              <Text className="text-xs text-muted">Turn {turn}/13</Text>
            </View>

            <View className="flex-row items-center gap-4">
              <Pressable
                onPress={() =>
                  setInputMode((prev) =>
                    prev === 'camera' ? 'dice' : 'camera',
                  )
                }
                className="items-center justify-center rounded-full bg-white/10 p-2"
              >
                {inputMode === 'camera' ? (
                  <CameraIcon size={20} color={colors['primary-light']} />
                ) : (
                  <DicesIcon size={20} color={colors['primary-light']} />
                )}
              </Pressable>
              <View className="items-end">
                <Text className="text-xs font-bold uppercase tracking-widest text-muted">
                  Total
                </Text>
                <Text className="text-2xl font-bold leading-7 text-white">
                  {totalScore}
                </Text>
              </View>
            </View>
          </View>

          <ScrollView
            className="flex-1 px-3 pt-4"
            contentContainerStyle={{ paddingBottom: 220 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Score Sections */}
            <View className="mb-4 overflow-hidden rounded-lg border border-border bg-card">
              <View className="border-b border-b-slate-100 bg-background-subtle px-4 py-2">
                <Text className="text-xs font-bold uppercase tracking-wider text-muted">
                  Upper Section
                </Text>
              </View>
              {CATEGORIES.UPPER.map((cat) => {
                const taken = scores[cat.id] !== undefined;
                const potential = calculatePotentialScore(dice, cat);

                return (
                  <Pressable
                    key={cat.id}
                    disabled={rollsLeft === 3 || taken || isRolling}
                    onPress={() => selectCategory(cat)}
                    className={`w-full flex-row items-center justify-between border-b border-b-slate-100 px-4 py-3 ${
                      taken
                        ? 'bg-background-subtle'
                        : 'bg-card active:bg-slate-50'
                    }`}
                  >
                    <Text
                      className={`font-medium ${taken && 'text-disabled line-through'}`}
                    >
                      {cat.label}
                    </Text>
                    {taken ? (
                      <Text className="font-bold text-emphasis">
                        {scores[cat.id]}
                      </Text>
                    ) : (
                      rollsLeft < 3 && (
                        <Text className="font-bold text-primary opacity-80">
                          +{potential}
                        </Text>
                      )
                    )}
                  </Pressable>
                );
              })}
              <View className="flex-row items-center justify-between border-t border-t-slate-200 bg-background-subtle px-4 py-2">
                <Text className="text-sm text-slate-500">Bonus (63+)</Text>
                <Text
                  className={`text-black ${upperScore >= 63 && 'font-bold text-success'}`}
                >
                  {upperScore}/63 ({bonus})
                </Text>
              </View>
            </View>

            <View className="mb-4 overflow-hidden rounded-lg border border-border bg-card">
              <View className="border-b border-b-slate-100 bg-background-subtle px-4 py-2">
                <Text className="text-xs font-bold uppercase tracking-wider text-muted">
                  Lower Section
                </Text>
              </View>
              {CATEGORIES.LOWER.map((cat) => {
                const taken = scores[cat.id] !== undefined;
                const potential = calculatePotentialScore(dice, cat);

                return (
                  <Pressable
                    key={cat.id}
                    disabled={rollsLeft === 3 || taken || isRolling}
                    onPress={() => selectCategory(cat)}
                    className={`w-full flex-row items-center justify-between border-b border-b-slate-100 px-4 py-3 ${
                      taken
                        ? 'bg-background-subtle'
                        : 'bg-card active:bg-slate-50'
                    }`}
                  >
                    <Text
                      className={`font-medium ${taken && 'text-disabled line-through'}`}
                    >
                      {cat.label}
                    </Text>
                    {taken ? (
                      <Text className="font-bold text-emphasis">
                        {scores[cat.id]}
                      </Text>
                    ) : (
                      rollsLeft < 3 && (
                        <Text className="font-bold text-primary opacity-80">
                          +{potential}
                        </Text>
                      )
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer controls - Dice and Action Button */}
          <View className="absolute inset-x-0 bottom-0 z-20 w-full border-t border-t-slate-200 bg-white shadow-2xl">
            <View className="relative flex-row justify-center gap-4 bg-slate-50/90 px-4 pb-10 pt-6 backdrop-blur-md">
              {dice.map((val, idx) => (
                <View key={idx} className="relative items-center">
                  <View
                    style={{ width: 64, height: 64 }}
                    className={`${locked[idx] ? 'scale-90 opacity-60' : 'scale-100'}`}
                  >
                    <Suspense fallback={null}>
                      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
                        <ambientLight intensity={1.5} />
                        <pointLight position={[10, 10, 10]} intensity={1} />
                        <ThreeDie
                          value={val}
                          isRolling={isRolling && !locked[idx]}
                        />
                      </Canvas>
                    </Suspense>
                  </View>

                  <Pressable
                    onPress={() => handleDieClick(idx)}
                    disabled={!diceRolled || isRolling}
                    className="absolute inset-0 z-40"
                    style={{ backgroundColor: 'transparent' }}
                  />

                  {rollsLeft < 3 && !locked[idx] && !isRolling && (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        cycleDieValue(idx);
                      }}
                      className="absolute bottom-[-28px] left-1/2 z-50 -ml-3.5 size-7 items-center justify-center rounded-full border border-white bg-slate-200 p-1.5 shadow-sm"
                    >
                      <Edit2Icon
                        size={12}
                        strokeWidth={3}
                        color={colors.icon}
                      />
                    </Pressable>
                  )}

                  {locked[idx] && (
                    <View className="absolute -top-2 right-0 z-50 rounded-full bg-primary px-2 py-0.5 shadow-sm">
                      <Text className="text-[8px] font-bold uppercase text-white">
                        Locked
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>

            <View className="bg-white p-4 pt-0">
              {gameState === 'finished' ? (
                <Pressable
                  onPress={handleResetGame}
                  className="w-full flex-row items-center justify-center gap-2 rounded-xl bg-primary py-5 shadow-lg active:opacity-90"
                >
                  <RotateCcwIcon size={20} color={'white'} />
                  <Text className="ml-2 text-lg font-bold text-white">
                    New Game
                  </Text>
                </Pressable>
              ) : (
                <View className="w-full flex-row items-center gap-4">
                  <Pressable
                    onPress={() => {
                      if (inputMode === 'camera') {
                        setShowScanner(true);
                      } else {
                        handleRandomRoll();
                      }
                    }}
                    disabled={rollsLeft === 0 || isRolling}
                    className={`h-16 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary shadow-lg ${
                      (rollsLeft === 0 || isRolling) &&
                      'bg-slate-400 opacity-50'
                    }`}
                  >
                    {inputMode === 'camera' ? (
                      <CameraIcon size={24} color={'white'} />
                    ) : (
                      <DicesIcon size={24} color={'white'} />
                    )}
                    <Text className="ml-2 text-lg font-bold text-white">
                      {rollsLeft === 3
                        ? 'Start Roll'
                        : inputMode === 'camera'
                          ? 'Scan Dice'
                          : isRolling
                            ? 'Rolling...'
                            : 'Roll Dice'}
                    </Text>
                  </Pressable>

                  <View className="h-16 w-16 flex-col items-center justify-center rounded-xl border border-border bg-slate-50">
                    <Text className="text-[10px] font-bold uppercase text-muted">
                      Left
                    </Text>
                    <Text
                      className={`text-2xl font-bold ${rollsLeft === 0 ? 'text-destructive-light' : 'text-text'}`}
                    >
                      {rollsLeft}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {showScanner && inputMode === 'camera' && (
            <DiceScanner
              neededCount={neededDiceCount}
              onScanComplete={handleScanComplete}
              onClose={() => setShowScanner(false)}
            />
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

// eslint-disable-next-line import/no-default-export
export default App;
