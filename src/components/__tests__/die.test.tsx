import { DOT_POSITIONS } from '../die';

describe('DOT_POSITIONS', () => {
  it('defines entries for every valid face value 1–6', () => {
    expect(
      Object.keys(DOT_POSITIONS)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('has exactly 1 dot for face value 1', () => {
    expect(DOT_POSITIONS[1]).toHaveLength(1);
  });

  it('has exactly 2 dots for face value 2', () => {
    expect(DOT_POSITIONS[2]).toHaveLength(2);
  });

  it('has exactly 3 dots for face value 3', () => {
    expect(DOT_POSITIONS[3]).toHaveLength(3);
  });

  it('has exactly 4 dots for face value 4', () => {
    expect(DOT_POSITIONS[4]).toHaveLength(4);
  });

  it('has exactly 5 dots for face value 5', () => {
    expect(DOT_POSITIONS[5]).toHaveLength(5);
  });

  it('has exactly 6 dots for face value 6', () => {
    expect(DOT_POSITIONS[6]).toHaveLength(6);
  });

  it('each position is a two-element tuple of numbers', () => {
    for (const positions of Object.values(DOT_POSITIONS)) {
      for (const pos of positions) {
        expect(pos).toEqual([expect.any(Number), expect.any(Number)]);
      }
    }
  });
});
