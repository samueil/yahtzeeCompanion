export const calculatePotentialScore = (
  dice: number[],
  categoryId: string,
): number => {
  const counts = dice.reduce(
    (acc, die) => {
      acc[die] = (acc[die] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>,
  );

  const uniqueDice = Object.keys(counts).map(Number);

  switch (categoryId) {
    case 'aces':
    case 'twos':
    case 'threes':
    case 'fours':
    case 'fives':
    case 'sixes':
      return (
        (counts[parseInt(categoryId.replace(/\D/g, ''))] || 0) *
        parseInt(categoryId.replace(/\D/g, ''))
      );
    case 'threeOfAKind':
      return uniqueDice.some((die) => counts[die] >= 3)
        ? dice.reduce((a, b) => a + b, 0)
        : 0;
    case 'fourOfAKind':
      return uniqueDice.some((die) => counts[die] >= 4)
        ? dice.reduce((a, b) => a + b, 0)
        : 0;
    case 'fullHouse':
      return uniqueDice.length === 2 &&
        uniqueDice.every((die) => counts[die] === 3 || counts[die] === 2)
        ? 25
        : 0;
    case 'smallStraight':
      const sortedDice = [...new Set(dice)].sort((a, b) => a - b);
      const sequence1 = [1, 2, 3, 4];
      const sequence2 = [2, 3, 4, 5];
      const sequence3 = [3, 4, 5, 6];
      const isSmallStraight =
        sortedDice.join('').includes(sequence1.join('')) ||
        sortedDice.join('').includes(sequence2.join('')) ||
        sortedDice.join('').includes(sequence3.join(''));
      return isSmallStraight ? 30 : 0;
    case 'largeStraight':
      const sortedDiceLS = [...new Set(dice)].sort((a, b) => a - b);
      const sequenceLS1 = [1, 2, 3, 4, 5];
      const sequenceLS2 = [2, 3, 4, 5, 6];
      const isLargeStraight =
        sortedDiceLS.join('').includes(sequenceLS1.join('')) ||
        sortedDiceLS.join('').includes(sequenceLS2.join(''));
      return isLargeStraight ? 40 : 0;
    case 'yahtzee':
      return uniqueDice.length === 1 ? 50 : 0;
    case 'chance':
      return dice.reduce((a, b) => a + b, 0);
    default:
      return 0;
  }
};
