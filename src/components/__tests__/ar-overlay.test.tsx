import { render, screen } from '@testing-library/react-native';
import React from 'react';
import type { DiceDetection } from '../../domain/dice-detection';
import { AROverlay } from '../ar-overlay';

describe('AROverlay', () => {
  it('renders bounding boxes with dynamic colors based on confidence', () => {
    const mockOnDetectionSatisfied = jest.fn();

    // We feed specific confidence scores that map exactly to the mathematical
    // extremes of Red (0% normalized), Yellow (50% normalized), and Green (100% normalized).
    const detections: DiceDetection[] = [
      { value: 1, x: 10, y: 10, width: 50, height: 50, confidence: 0.15 }, // Normalized 0.0 -> Red
      { value: 2, x: 70, y: 70, width: 50, height: 50, confidence: 0.575 }, // Normalized 0.5 -> Yellow
      { value: 3, x: 130, y: 130, width: 50, height: 50, confidence: 1.0 }, // Normalized 1.0 -> Green
    ];

    render(
      <AROverlay
        detections={detections}
        targetCount={3}
        onDetectionSatisfied={mockOnDetectionSatisfied}
      />,
    );

    // 1. Verify Low Confidence (Red-Orange)
    const redBox = screen.getByTestId('detection-box-0');
    expect(redBox.props.style).toEqual(
      expect.objectContaining({
        borderColor: 'rgba(255, 0, 30, 0.8)',
        backgroundColor: 'rgba(255, 0, 30, 0.2)',
      }),
    );

    // 2. Verify Medium Confidence (Yellow)
    const yellowBox = screen.getByTestId('detection-box-1');
    expect(yellowBox.props.style).toEqual(
      expect.objectContaining({
        borderColor: 'rgba(255, 255, 30, 0.8)',
        backgroundColor: 'rgba(255, 255, 30, 0.2)',
      }),
    );

    // 3. Verify High Confidence (Green)
    const greenBox = screen.getByTestId('detection-box-2');
    expect(greenBox.props.style).toEqual(
      expect.objectContaining({
        borderColor: 'rgba(0, 255, 30, 0.8)',
        backgroundColor: 'rgba(0, 255, 30, 0.2)',
      }),
    );
  });

  it('calls onDetectionSatisfied(true) when enough high-confidence dice are detected', () => {
    const mockOnDetectionSatisfied = jest.fn();
    const detections: DiceDetection[] = [
      { value: 1, x: 10, y: 10, width: 50, height: 50, confidence: 0.8 },
      { value: 2, x: 70, y: 70, width: 50, height: 50, confidence: 0.9 },
    ];
    render(
      <AROverlay
        detections={detections}
        targetCount={2}
        onDetectionSatisfied={mockOnDetectionSatisfied}
      />,
    );
    expect(mockOnDetectionSatisfied).toHaveBeenCalledWith(true);
  });

  it('calls onDetectionSatisfied(false) when not enough dice meet the threshold', () => {
    const mockOnDetectionSatisfied = jest.fn();

    const detections: DiceDetection[] = [
      { value: 1, x: 10, y: 10, width: 50, height: 50, confidence: 0.1 }, // Below 0.15 threshold
      { value: 2, x: 70, y: 70, width: 50, height: 50, confidence: 0.9 }, // Above threshold
    ];

    // Need 2 dice, but only 1 is above threshold
    render(
      <AROverlay
        detections={detections}
        targetCount={2}
        onDetectionSatisfied={mockOnDetectionSatisfied}
      />,
    );
    expect(mockOnDetectionSatisfied).toHaveBeenCalledWith(false);
  });
});
