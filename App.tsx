import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Canvas } from '@react-three/fiber/native';
import {
  CalculatorIcon,
  CameraIcon,
  DicesIcon,
  Edit2Icon,
  RotateCcwIcon,
} from 'lucide-nativewind';
import { Pressable, ScrollView, Text, View, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import './global.css';
import { DiceScanner, Die } from './src/components';
import { CATEGORIES } from './src/constants/categories';
import type { Category } from './src/domain/category';
import type { DieValue } from './src/domain/die-value';
import { calculatePotentialScore } from './src/lib/scoring';
import { colors } from './src/theme/colors';

const INPUT_MODE_KEY = '@input_mode_preference';

const App = () => {
  const [dice, setDice] = useState<DieValue[]>([1, 1, 1, 1, 1]);
  const [locked, setLocked] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false,
  ]);
  const [diceRolled, setDiceRolled] = useState(false);
  const [rollsLeft, setRollsLeft] = useState(3);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const [gameState, setGameState] = useState<'playing' | 'finished'>('playing');
  const [turn, setTurn] = useState<number>(1);
  const [isUiBlocked, setIsUiBlocked] = useState(false);
  const [inputMode, setInputMode] = useState<'camera' | 'dice'>(
    Platform.OS === 'web' ? 'dice' : 'camera',
  );

  useEffect(() => {
    const loadStoredPreference = async () => {
      try {
        const savedValue = await AsyncStorage.getItem(INPUT_MODE_KEY);
        if (savedValue !== null) {
          setInputMode(savedValue as 'camera' | 'dice');
        }
      } catch (e) {
        console.error('Failed to load input mode preference', e);
      }
    };
    loadStoredPreference();
  }, []);

  const handleToggleInputMode = async () => {
    const nextMode = inputMode === 'camera' ? 'dice' : 'camera';
    setInputMode(nextMode);
    try {
      await AsyncStorage.setItem(INPUT_MODE_KEY, nextMode);
    } catch (e) {
      console.error('Failed to save input mode preference', e);
    }
  };

  const handleDieClick = (index: number) => {
    if (rollsLeft === 3 || isUiBlocked) return;
    toggleLock(index);
  };

  const toggleLock = (index: number) => {
    const newLocked = [...locked];
    newLocked[index] = !newLocked[index];
    setLocked(newLocked);
  };

  const cycleDieValue = (index: number) => {
    if (isUiBlocked) return;
    const newDice = [...dice];
    newDice[index] =
      newDice[index] === 6 ? 1 : ((newDice[index] + 1) as DieValue);
    setDice(newDice);
  };

  const handleScanComplete = (detectedValues: DieValue[]) => {
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
    if (rollsLeft === 0 || isUiBlocked) return;
    setIsUiBlocked(true);
    setTimeout(() => {
      const newDice = dice.map((val, idx) => {
        if (locked[idx]) return val;

        return Math.ceil(Math.random() * 6) as DieValue;
      });

      setDice(newDice);
      setDiceRolled(true);
      setRollsLeft((prev) => prev - 1);
      setIsUiBlocked(false);
    }, 1000);
  };

  const selectCategory = (cat: Category) => {
    if (rollsLeft === 3 || scores[cat.id] !== undefined || isUiBlocked) return;
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
                onPress={handleToggleInputMode}
                className="items-center justify-center rounded-full bg-white/10 p-2 active:bg-white/20"
              >
                {inputMode === 'camera' ? (
                  <DicesIcon size={20} color={colors['primary-light']} />
                ) : (
                  <CameraIcon size={20} color={colors['primary-light']} />
                )}
                <Text className="text-xs font-bold text-muted">Mode</Text>
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
            contentContainerClassName="pb-[220px]"
            showsVerticalScrollIndicator={false}
          >
            {/* Upper Section */}
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
                    disabled={rollsLeft === 3 || taken || isUiBlocked}
                    onPress={() => selectCategory(cat)}
                    className={`w-full flex-row items-center justify-between border-b border-b-slate-100 px-4 py-3 ${
                      taken
                        ? 'bg-background-subtle'
                        : 'bg-card active:bg-slate-50'
                    }`}
                  >
                    <Text
                      className={`font-medium ${taken ? 'text-disabled line-through' : 'text-text'}`}
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
                  className={`text-black ${upperScore >= 63 ? 'font-bold text-success' : ''}`}
                >
                  {upperScore}/63 ({bonus})
                </Text>
              </View>
            </View>

            {/* Lower Section */}
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
                    disabled={rollsLeft === 3 || taken || isUiBlocked}
                    onPress={() => selectCategory(cat)}
                    className={`w-full flex-row items-center justify-between border-b border-b-slate-100 px-4 py-3 ${
                      taken
                        ? 'bg-background-subtle'
                        : 'bg-card active:bg-slate-50'
                    }`}
                  >
                    <Text
                      className={`font-medium ${taken ? 'text-disabled line-through' : 'text-text'}`}
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

          {/* Footer controls */}
          <View className="absolute inset-x-0 bottom-0 z-20 w-full border-t border-t-slate-200 bg-card shadow-2xl">
            <View className="relative flex-row justify-center gap-2 bg-slate-50/90 px-2 pb-10 pt-6 backdrop-blur-md">
              {dice.map((val, idx) => (
                <View key={idx} className="relative items-center">
                  <View
                    className={`h-16 w-16 ${locked[idx] ? 'scale-90 opacity-60' : 'scale-100'}`}
                  >
                    <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
                      <ambientLight intensity={3.5} />
                      <pointLight position={[10, 10, 10]} intensity={2.5} />
                      <pointLight
                        position={[-10, -10, -10]}
                        intensity={2.5}
                        color="#ffffff"
                      />
                      <Die
                        value={val}
                        isUiBlocked={isUiBlocked && !locked[idx]}
                      />
                    </Canvas>
                  </View>
                  <Pressable
                    onPress={() => handleDieClick(idx)}
                    disabled={!diceRolled || isUiBlocked}
                    className="absolute inset-0 z-40 bg-transparent"
                  />
                  {rollsLeft < 3 && !locked[idx] && !isUiBlocked && (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        cycleDieValue(idx);
                      }}
                      className="absolute bottom-[-28px] left-1/2 z-50 -ml-3.5 h-7 w-7 items-center justify-center rounded-full border border-white bg-slate-200 p-1.5 shadow-sm active:bg-slate-300"
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

            <View className="bg-card p-4 pt-0">
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
                    disabled={rollsLeft === 0 || isUiBlocked}
                    className={`h-16 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary shadow-lg active:opacity-90 ${
                      rollsLeft === 0 || isUiBlocked
                        ? 'bg-slate-400 opacity-50'
                        : ''
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
                          : isUiBlocked
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
