// App.tsx
import {
  Calculator,
  Camera as CameraIcon,
  Edit2,
  RotateCcw,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import './global.css';
import { DiceScanner, Die } from './src/components';
import { CATEGORIES } from './src/constants/categories';
import { calculatePotentialScore } from './src/utils/scoring';

const App = () => {
  const [dice, setDice] = useState<number[]>([1, 1, 1, 1, 1]);
  const [locked, setLocked] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false,
  ]);
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
    setRollsLeft((prev) => prev - 1);
    setShowScanner(false);
  };

  const selectCategory = (id: string) => {
    if (rollsLeft === 3 || scores[id] !== undefined) return;
    const score = calculatePotentialScore(dice, id);
    setScores((prev) => ({ ...prev, [id]: score }));
    setDice([1, 1, 1, 1, 1]);
    setLocked([false, false, false, false, false]);
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
          <View className="bg-primary-dark text-inverted p-4 shadow-lg flex-row justify-between items-center z-10">
            <View>
              <Text className="text-xl font-bold text-primary-light flex-row items-center gap-2">
                <Calculator size={20} color={'#a5b4fc'} className="mr-2" />
                {'  '}
                Yahtzee Companion
              </Text>
              <Text className="text-muted text-xs">Turn {turn}/13</Text>
            </View>
            <View className="items-end">
              <Text className="text-xs text-muted uppercase font-bold tracking-widest">
                Total
              </Text>
              <Text className="text-2xl font-bold leading-7 text-inverted">
                {totalScore}
              </Text>
            </View>
          </View>

          <ScrollView
            className="flex-1 px-3 pt-4"
            contentContainerStyle={{ paddingBottom: 200 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="bg-card rounded-lg border-border overflow-hidden mb-4">
              <View className="bg-background-subtle px-4 py-2 text-xs font-bold text-muted uppercase tracking-wider border-b border-b-slate-100">
                <Text className="text-xs font-bold text-muted uppercase tracking-wider">
                  Upper Section
                </Text>
              </View>
              {CATEGORIES.UPPER.map((cat) => {
                const taken = scores[cat.id] !== undefined;
                const potential = calculatePotentialScore(dice, cat.id);
                return (
                  <Pressable
                    key={cat.id}
                    disabled={rollsLeft === 3 || taken}
                    onPress={() => selectCategory(cat.id)}
                    className={`w-full flex-row justify-between items-center px-4 py-3 border-b border-b-slate-100 ${
                      taken
                        ? 'bg-background-subtle text-disabled'
                        : 'bg-card active:bg-primary-hover'
                    }`}
                  >
                    <Text
                      className={`font-medium text ${
                        taken && 'line-through text-disabled'
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
                        <Text className="text-primary font-bold opacity-80">
                          +{potential}
                        </Text>
                      )
                    )}
                  </Pressable>
                );
              })}
              <View className="bg-background-subtle px-4 py-2 flex-row justify-between items-center border-t border-t-slate-200 text-sm">
                <Text className="text-slate-500">Bonus (63+)</Text>
                <Text
                  className={`text-black ${
                    upperScore >= 63 && 'text-success font-bold'
                  }`}
                >
                  {upperScore}/63 ({bonus})
                </Text>
              </View>
            </View>

            <View className="bg-card rounded-lg border-border overflow-hidden mb-4">
              <View className="bg-background-subtle px-4 py-2 text-xs font-bold text-muted uppercase tracking-wider border-b border-b-slate-100">
                <Text className="text-xs font-bold text-muted uppercase tracking-wider">
                  Lower Section
                </Text>
              </View>
              {CATEGORIES.LOWER.map((cat) => {
                const taken = scores[cat.id] !== undefined;
                const potential = calculatePotentialScore(dice, cat.id);
                return (
                  <Pressable
                    key={cat.id}
                    disabled={rollsLeft === 3 || taken}
                    onPress={() => selectCategory(cat.id)}
                    className={`w-full flex-row justify-between items-center px-4 py-3 border-b border-b-slate-100 ${
                      taken
                        ? 'bg-background-subtle text-disabled'
                        : 'bg-card active:bg-primary-hover'
                    }`}
                  >
                    <Text
                      className={`font-medium text ${
                        taken && 'line-through text-disabled'
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
                        <Text className="text-primary font-bold opacity-80">
                          +{potential}
                        </Text>
                      )
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View className="absolute bottom-0 left-0 right-0 w-full bg-card border-t border-t-slate-200 shadow-lg z-20">
            <View className="flex-row justify-center gap-4 pt-6 pb-10 bg-background-subtle/80 backdrop-blur-sm px-6 relative">
              {dice.map((val, idx) => (
                <View key={idx} className="relative items-center">
                  <Die
                    value={val}
                    locked={locked[idx]}
                    onClick={() => handleDieClick(idx)}
                  />
                  {rollsLeft < 3 && !locked[idx] && (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        cycleDieValue(idx);
                      }}
                      className="absolute bottom-[-28px] left-1/2 -ml-3.5 w-7 h-7 bg-slate-200 rounded-full p-1.5 shadow-sm border border-white justify-center items-center z-30"
                      title="Correct value"
                    >
                      <Edit2 size={12} strokeWidth={3} color={'#64748b'} />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>

            <View className="p-4 pt-0 flex-col items-center justify-center gap-4 bg-card">
              {gameState === 'finished' ? (
                <Pressable
                  onPress={resetGame}
                  className="w-full bg-primary text-inverted font-bold py-5 rounded-lg shadow-indigo-200/50 flex-row items-center justify-center gap-2"
                >
                  <RotateCcw size={20} color={'white'} className="mr-2" />
                  <Text className="text-base text-inverted font-bold">
                    New Game
                  </Text>
                </Pressable>
              ) : (
                <View className="flex-row gap-4 items-center w-full">
                  <Pressable
                    onPress={() => setShowScanner(true)}
                    disabled={rollsLeft === 0}
                    className={`flex-1 h-14 bg-primary text-inverted font-bold rounded-lg shadow-indigo-200/50 flex-row items-center justify-center gap-2 relative overflow-hidden ${
                      rollsLeft === 0 && 'opacity-50 bg-slate-400 shadow-none'
                    }`}
                  >
                    <CameraIcon size={24} color={'white'} />
                    <Text className="text-base text-inverted font-bold">
                      {rollsLeft === 3 ? 'Start Roll' : 'Scan Dice'}
                    </Text>
                  </Pressable>

                  <View className="flex-col items-center justify-center bg-background rounded-lg h-14 w-16 border-border">
                    <Text className="text-xs text-muted uppercase font-bold">
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
