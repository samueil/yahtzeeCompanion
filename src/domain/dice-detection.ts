import type { DieValue } from './die-value';

export interface DiceDetection {
  id?: string;
  historyLength?: number;
  value: DieValue;
  overrideValue?: DieValue;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}
