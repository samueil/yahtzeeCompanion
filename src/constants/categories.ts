import { Category } from '../domain/category';

export const CATEGORIES: Record<'UPPER' | 'LOWER', Category[]> = {
  UPPER: [
    { id: 'aces', label: 'Aces', val: 1 },
    { id: 'twos', label: 'Twos', val: 2 },
    { id: 'threes', label: 'Threes', val: 3 },
    { id: 'fours', label: 'Fours', val: 4 },
    { id: 'fives', label: 'Fives', val: 5 },
    { id: 'sixes', label: 'Sixes', val: 6 },
  ],
  LOWER: [
    { id: 'threeOfAKind', label: '3 of a Kind' },
    { id: 'fourOfAKind', label: '4 of a Kind' },
    { id: 'fullHouse', label: 'Full House' },
    { id: 'smallStraight', label: 'Small Straight' },
    { id: 'largeStraight', label: 'Large Straight' },
    { id: 'yahtzee', label: 'Yahtzee' },
    { id: 'chance', label: 'Chance' },
  ],
};
