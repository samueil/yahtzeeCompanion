interface BaseCategory {
  id: string;
  label: string;
}

interface NumberCategory extends BaseCategory {
  id: 'aces' | 'twos' | 'threes' | 'fours' | 'fives' | 'sixes';
  val: number;
}

interface LowerCategory extends BaseCategory {
  id:
    | 'threeOfAKind'
    | 'fourOfAKind'
    | 'fullHouse'
    | 'smallStraight'
    | 'largeStraight'
    | 'chance'
    | 'yahtzee';
  val?: never;
}

export type Category = NumberCategory | LowerCategory;
