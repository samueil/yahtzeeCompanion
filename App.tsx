// App.tsx
import {
  CalculatorIcon,
  CameraIcon,
  Edit2Icon,
  RotateCcwIcon,
} from 'lucide-nativewind';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import './global.css';
import { DiceScanner, Die } from './src/components';
import { CATEGORIES } from './src/constants/categories';
import { Category } from './src/domain/category';
import { calculatePotentialScore } from './src/lib/scoring';
import { colors } from './src/theme/colors';

const App = () => {
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

  const handleDieClick = (index: number) => {
    if (rollsLeft === 3) return;
    toggleLock(index);
  };

  const toggleLock = (index: number) => {
    const newLocked = [...locked];
    newLocked[index] = !newLocked[index];
    setLocked(newLocked);
  };

  const cycleDieValue = (index: number) => {
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

  const selectCategory = (cat: Category) => {
    if (rollsLeft === 3 || scores[cat.id] !== undefined) return;
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

  const resetGame = () => {
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
          <View className="z-10 flex-row items-center justify-between bg-primary-dark p-4 text-inverted shadow-lg">
            <View>
              <Text className="flex-row items-center gap-2 text-xl font-bold text-primary-light">
                <CalculatorIcon
                  size={20}
                  color={colors['primary-light']}
                  className="mr-2"
                />
                {'  '}
                Yahtzee Companion
              </Text>
              <Text className="text-xs text-muted">Turn {turn}/13</Text>
            </View>
            <View className="items-end">
              <Text className="text-xs font-bold uppercase tracking-widest text-muted">
                Total
              </Text>
              <Text className="text-2xl font-bold leading-7 text-inverted">
                {totalScore}
              </Text>
            </View>
          </View>

          <ScrollView
            className="flex-1 px-3 pt-4"
            contentContainerClassName="pb-[200px]"
            showsVerticalScrollIndicator={false}
          >
            <View className="mb-4 overflow-hidden rounded-lg border-border bg-card">
              <View className="border-b border-b-slate-100 bg-background-subtle px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted">
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
                    disabled={rollsLeft === 3 || taken}
                    onPress={() => selectCategory(cat)}
                    className={`w-full flex-row items-center justify-between border-b border-b-slate-100 px-4 py-3 ${
                      taken
                        ? 'bg-background-subtle text-disabled'
                        : 'bg-card active:bg-primary-hover'
                    }`}
                  >
                    <Text
                      className={`text font-medium ${
                        taken && 'text-disabled line-through'
                      }`}
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
              <View className="flex-row items-center justify-between border-t border-t-slate-200 bg-background-subtle px-4 py-2 text-sm">
                <Text className="text-slate-500">Bonus (63+)</Text>
                <Text
                  className={`text-black ${
                    upperScore >= 63 && 'font-bold text-success'
                  }`}
                >
                  {upperScore}/63 ({bonus})
                </Text>
              </View>
            </View>

            <View className="mb-4 overflow-hidden rounded-lg border-border bg-card">
              <View className="border-b border-b-slate-100 bg-background-subtle px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted">
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
                    disabled={rollsLeft === 3 || taken}
                    onPress={() => selectCategory(cat)}
                    className={`w-full flex-row items-center justify-between border-b border-b-slate-100 px-4 py-3 ${
                      taken
                        ? 'bg-background-subtle text-disabled'
                        : 'bg-card active:bg-primary-hover'
                    }`}
                  >
                    <Text
                      className={`text font-medium ${
                        taken && 'text-disabled line-through'
                      }`}
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

          <View className="absolute inset-x-0 bottom-0 z-20 w-full border-t border-t-slate-200 bg-card shadow-lg">
            <View className="relative flex-row justify-center gap-4 bg-background-subtle/80 px-6 pb-10 pt-6 backdrop-blur-sm">
              {dice.map((val, idx) => (
                <View key={idx} className="relative items-center">
                  <Die
                    value={val}
                    locked={locked[idx]}
                    disabled={!diceRolled}
                    onClick={() => handleDieClick(idx)}
                  />
                  {rollsLeft < 3 && !locked[idx] && (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        cycleDieValue(idx);
                      }}
                      className="absolute bottom-[-28px] left-1/2 z-30 -ml-3.5 size-7 items-center justify-center rounded-full border border-white bg-slate-200 p-1.5 shadow-sm"
                    >
                      <Edit2Icon
                        size={12}
                        strokeWidth={3}
                        color={colors.icon}
                      />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>

            <View className="flex-col items-center justify-center gap-4 bg-card p-4 pt-0">
              {gameState === 'finished' ? (
                <Pressable
                  onPress={resetGame}
                  className="w-full flex-row items-center justify-center gap-2 rounded-lg bg-primary py-5 font-bold text-inverted shadow-indigo-200/50"
                >
                  <RotateCcwIcon size={20} color={'white'} className="mr-2" />
                  <Text className="text-base font-bold text-inverted">
                    New Game
                  </Text>
                </Pressable>
              ) : (
                <View className="w-full flex-row items-center gap-4">
                  <Pressable
                    onPress={() => setShowScanner(true)}
                    disabled={rollsLeft === 0}
                    className={`relative h-14 flex-1 flex-row items-center justify-center gap-2 overflow-hidden rounded-lg bg-primary font-bold text-inverted shadow-indigo-200/50 ${
                      rollsLeft === 0 && 'bg-slate-400 opacity-50 shadow-none'
                    }`}
                  >
                    <CameraIcon size={24} color={'white'} />
                    <Text className="text-base font-bold text-inverted">
                      {rollsLeft === 3 ? 'Start Roll' : 'Scan Dice'}
                    </Text>
                  </Pressable>

                  <View className="h-14 w-16 flex-col items-center justify-center rounded-lg border-border bg-background">
                    <Text className="text-xs font-bold uppercase text-muted">
                      Left
                    </Text>
                    <Text
                      className={`text-xl font-bold text-text ${
                        rollsLeft === 0 && 'text-destructive-light'
                      }`}
                    >
                      {rollsLeft}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {showScanner && (
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
