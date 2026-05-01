import type { DieValue } from './die-value';

export interface DiceDetection {
  id?: string;
  value: DieValue;
  overrideValue?: DieValue;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}
