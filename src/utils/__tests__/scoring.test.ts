import { CATEGORIES } from '../../constants/categories';
import { calculatePotentialScore } from '../scoring';

describe('calculatePotentialScore', () => {
  const getCategory = (id: string) =>
    [...CATEGORIES.UPPER, ...CATEGORIES.LOWER].find((c) => c.id === id)!;

  describe('Upper Section (Number Categories)', () => {
    it('scores Aces correctly (1s)', () => {
      const dice = [1, 1, 3, 4, 1];
      const category = getCategory('aces');
      expect(calculatePotentialScore(dice, category)).toBe(3);
    });

    it('returns 0 if no matching numbers exist', () => {
      const dice = [2, 3, 4, 5, 6];
      const category = getCategory('aces');
      expect(calculatePotentialScore(dice, category)).toBe(0);
    });

    it('scores Sixes correctly', () => {
      const dice = [6, 6, 6, 6, 1];
      const category = getCategory('sixes');
      expect(calculatePotentialScore(dice, category)).toBe(24);
    });
  });

  describe('Lower Section (Special Combinations)', () => {
    it('scores 3 of a Kind as the sum of all dice', () => {
      const dice = [4, 4, 4, 1, 2];
      const category = getCategory('threeOfAKind');
      expect(calculatePotentialScore(dice, category)).toBe(15);
    });

    it('scores 0 for 3 of a Kind if requirements are not met', () => {
      const dice = [4, 4, 1, 2, 3];
      const category = getCategory('threeOfAKind');
      expect(calculatePotentialScore(dice, category)).toBe(0);
    });

    it('scores 25 for a Full House (3 of one, 2 of another)', () => {
      const dice = [2, 2, 3, 3, 3];
      const category = getCategory('fullHouse');
      expect(calculatePotentialScore(dice, category)).toBe(25);
    });

    it('scores 0 for a Full House if it is actually 5 of a kind', () => {
      // Note: In some rules 5-of-a-kind counts as Full House,
      // but your code checks for exactly 2 unique dice.
      const dice = [5, 5, 5, 5, 5];
      const category = getCategory('fullHouse');
      expect(calculatePotentialScore(dice, category)).toBe(0);
    });

    it('scores 30 for a Small Straight (4 sequential numbers)', () => {
      const dice = [1, 2, 3, 4, 6];
      const category = getCategory('smallStraight');
      expect(calculatePotentialScore(dice, category)).toBe(30);
    });

    it('scores 40 for a Large Straight (5 sequential numbers)', () => {
      const dice = [2, 3, 4, 5, 6];
      const category = getCategory('largeStraight');
      expect(calculatePotentialScore(dice, category)).toBe(40);
    });

    it('scores 50 for a Yahtzee', () => {
      const dice = [5, 5, 5, 5, 5];
      const category = getCategory('yahtzee');
      expect(calculatePotentialScore(dice, category)).toBe(50);
    });

    it('scores Chance as the sum of all dice regardless of values', () => {
      const dice = [1, 2, 6, 4, 2];
      const category = getCategory('chance');
      expect(calculatePotentialScore(dice, category)).toBe(15);
    });
  });

  describe('Edge Cases', () => {
    it('handles a Small Straight hidden inside a Large Straight', () => {
      const dice = [1, 2, 3, 4, 5];
      const category = getCategory('smallStraight');
      expect(calculatePotentialScore(dice, category)).toBe(30);
    });

    it('handles unordered dice for straights', () => {
      const dice = [4, 1, 3, 2, 6];
      const category = getCategory('smallStraight');
      expect(calculatePotentialScore(dice, category)).toBe(30);
    });
  });
});
