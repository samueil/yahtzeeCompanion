// App.tsx
import {
  Calculator,
  Camera as CameraIcon,
  Edit2,
  RotateCcw,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Importing components and utilities from their respective src directories
import { DiceScanner, Die } from './src/components'; // Assuming src/components/index.ts exports them
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
      <SafeAreaView style={styles.container}>
        <View style={styles.mainContent}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>
                <Calculator
                  size={20}
                  color={'#a5b4fc'}
                  style={styles.headerIcon}
                />
                Yahtzee Companion
              </Text>
              <Text style={styles.turnText}>Turn {turn}/13</Text>
            </View>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>Total</Text>
              <Text style={styles.scoreValue}>{totalScore}</Text>
            </View>
          </View>

          {/* Main Game Area */}
          <ScrollView
            style={styles.gameArea}
            contentContainerStyle={styles.gameAreaContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>Upper Section</Text>
              </View>
              {CATEGORIES.UPPER.map((cat) => {
                const taken = scores[cat.id] !== undefined;
                const potential = calculatePotentialScore(dice, cat.id);
                return (
                  <Pressable
                    key={cat.id}
                    disabled={rollsLeft === 3 || taken}
                    onPress={() => selectCategory(cat.id)}
                    style={({ pressed }) => [
                      styles.categoryButton,
                      taken
                        ? styles.categoryButtonTaken
                        : pressed
                          ? styles.categoryButtonPressed
                          : styles.categoryButtonDefault,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryLabel,
                        taken && styles.categoryLabelTaken,
                      ]}
                    >
                      {cat.label}
                    </Text>
                    {taken ? (
                      <Text style={styles.categoryScoreTaken}>
                        {scores[cat.id]}
                      </Text>
                    ) : (
                      rollsLeft < 3 && (
                        <Text style={styles.categoryScorePotential}>
                          +{potential}
                        </Text>
                      )
                    )}
                  </Pressable>
                );
              })}
              <View style={styles.bonusContainer}>
                <Text style={styles.bonusLabel}>Bonus (63+)</Text>
                <Text
                  style={[
                    styles.bonusValue,
                    upperScore >= 63 && styles.bonusAchieved,
                  ]}
                >
                  {upperScore}/63 ({bonus})
                </Text>
              </View>
            </View>

            {/* Lower Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>Lower Section</Text>
              </View>
              {CATEGORIES.LOWER.map((cat) => {
                const taken = scores[cat.id] !== undefined;
                const potential = calculatePotentialScore(dice, cat.id);
                return (
                  <Pressable
                    key={cat.id}
                    disabled={rollsLeft === 3 || taken}
                    onPress={() => selectCategory(cat.id)}
                    style={({ pressed }) => [
                      styles.categoryButton,
                      taken
                        ? styles.categoryButtonTaken
                        : pressed
                          ? styles.categoryButtonPressed
                          : styles.categoryButtonDefault,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryLabel,
                        taken && styles.categoryLabelTaken,
                      ]}
                    >
                      {cat.label}
                    </Text>
                    {taken ? (
                      <Text style={styles.categoryScoreTaken}>
                        {scores[cat.id]}
                      </Text>
                    ) : (
                      rollsLeft < 3 && (
                        <Text style={styles.categoryScorePotential}>
                          +{potential}
                        </Text>
                      )
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Control Deck (Sticky Bottom) */}
          <View style={styles.controlDeck}>
            <View style={styles.diceTray}>
              {dice.map((val, idx) => (
                <View key={idx} style={styles.dieWrapper}>
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
                      style={styles.editButton}
                      title="Correct value"
                    >
                      <Edit2 size={12} strokeWidth={3} color={'#64748b'} />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>

            {/* Action Bar */}
            <View style={styles.actionBar}>
              {gameState === 'finished' ? (
                <Pressable onPress={resetGame} style={styles.newGameButton}>
                  <RotateCcw
                    size={20}
                    color={'white'}
                    style={styles.newGameIcon}
                  />
                  <Text style={styles.newGameText}>New Game</Text>
                </Pressable>
              ) : (
                <View style={styles.rollDiceArea}>
                  <Pressable
                    onPress={() => setShowScanner(true)}
                    disabled={rollsLeft === 0}
                    style={({ pressed }) => [
                      styles.scanButton,
                      rollsLeft === 0
                        ? styles.scanButtonDisabled
                        : pressed
                          ? styles.scanButtonPressed
                          : styles.scanButtonDefault,
                    ]}
                  >
                    <CameraIcon size={24} color={'white'} />
                    <Text style={styles.scanButtonText}>
                      {rollsLeft === 3 ? 'Start Roll' : 'Scan Dice'}
                    </Text>
                  </Pressable>

                  <View style={styles.rollsLeftContainer}>
                    <Text style={styles.rollsLeftLabel}>Left</Text>
                    <Text
                      style={[
                        styles.rollsLeftValue,
                        rollsLeft === 0 && styles.rollsLeftValueZero,
                      ]}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc', // slate-100
    // fontFamily: 'sans-serif', // Note: RN uses system fonts or requires custom font setup
  },
  mainContent: {
    flex: 1,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#1e293b', // slate-900
    color: 'white',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#a5b4fc', // indigo-400
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    marginRight: 8,
  },
  turnText: {
    color: '#94a3b8', // slate-400
    fontSize: 12,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#94a3b8', // slate-400
    textTransform: 'uppercase',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 28,
    color: 'white',
  },
  gameArea: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  gameAreaContent: {
    paddingBottom: 200,
  },
  sectionContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0', // slate-200
    overflow: 'hidden',
    marginBottom: 16,
  },
  sectionHeader: {
    backgroundColor: '#f8fafc', // slate-50
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94a3b8', // slate-400
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0', // slate-100
  },
  sectionHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94a3b8', // slate-400
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  categoryButton: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0', // slate-100
  },
  categoryButtonDefault: {
    backgroundColor: 'white',
  },
  categoryButtonPressed: {
    backgroundColor: '#e0e7ff', // indigo-50
  },
  categoryButtonTaken: {
    backgroundColor: '#f8fafc', // slate-50/50
    color: '#94a3b8', // slate-300
  },
  categoryLabel: {
    fontWeight: 'medium',
    color: '#1e293b', // slate-800
  },
  categoryLabelTaken: {
    textDecorationLine: 'line-through',
    color: '#94a3b8', // slate-300
  },
  categoryScorePotential: {
    color: '#8b5cf6', // indigo-500
    fontWeight: 'bold',
    opacity: 0.8,
  },
  categoryScoreTaken: {
    fontWeight: 'bold',
    color: '#475569', // slate-600
  },
  bonusContainer: {
    backgroundColor: '#f8fafc', // slate-50
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0', // slate-200
    fontSize: 14,
  },
  bonusLabel: {
    color: '#64748b', // slate-500
  },
  bonusValue: {
    color: '#000', // Default score color
  },
  bonusAchieved: {
    color: '#16a34a', // green-600
    fontWeight: 'bold',
  },
  controlDeck: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0', // slate-200
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10, // for Android
    zIndex: 20,
  },
  diceTray: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 24,
    paddingBottom: 40, // Increased padding to accommodate edit buttons
    backgroundColor: 'rgba(248, 250, 252, 0.8)', // slate-50/80 with backdrop blur
    // backdropFilter: 'blur(5px)', // Note: backdropFilter is not widely supported on RN
    paddingHorizontal: 24,
    position: 'relative',
  },
  dieWrapper: {
    position: 'relative',
    alignItems: 'center',
  },
  editButton: {
    position: 'absolute',
    bottom: -28, // Position below the die
    left: '50%',
    transform: [{ translateX: -14 }], // Center the button
    width: 28,
    height: 28,
    backgroundColor: '#d1d5db', // slate-200
    borderRadius: 9999,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 1,
    borderWidth: 1,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  actionBar: {
    padding: 16,
    paddingTop: 0,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: 'white',
  },
  rollDiceArea: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    width: '100%',
  },
  scanButton: {
    flex: 1, // Takes up available space
    height: 56,
    backgroundColor: '#8b5cf6', // indigo-600
    color: 'white',
    fontWeight: 'bold',
    borderRadius: 8,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  scanButtonDefault: {},
  scanButtonDisabled: {
    opacity: 0.5,
    // cursor: 'not-allowed', // Not a direct RN style
    backgroundColor: '#94a3b8', // slate-400
    shadowColor: 'transparent', // Remove shadow when disabled
  },
  scanButtonPressed: {
    // This would typically be handled by the `pressed` state in Pressable
  },
  scanButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
  rollsLeftContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2e8f0', // slate-100
    borderRadius: 8,
    height: 56,
    width: 64,
    borderWidth: 1,
    borderColor: '#cbd5e1', // slate-200
  },
  rollsLeftLabel: {
    fontSize: 10,
    color: '#94a3b8', // slate-400
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  rollsLeftValue: {
    fontSize: 20,
    fontWeight: 'bold', // Changed from 'black' as it might not be a valid font weight
    color: '#334155', // slate-700
  },
  rollsLeftValueZero: {
    color: '#f87171', // red-400
  },
  newGameButton: {
    width: '100%',
    backgroundColor: '#8b5cf6', // indigo-600
    color: 'white',
    fontWeight: 'bold',
    paddingVertical: 20,
    borderRadius: 8,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  newGameIcon: {
    marginRight: 8,
  },
  newGameText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
});

// eslint-disable-next-line import/no-default-export
export default App;
