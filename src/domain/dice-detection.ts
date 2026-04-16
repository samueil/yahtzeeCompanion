import type { DieValue } from './die-value';

export interface DiceDetection {
  value: DieValue;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}
