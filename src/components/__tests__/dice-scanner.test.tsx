import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { useCameraPermissions } from '../../hooks/use-camera-permissions';
import { DiceScanner } from '../dice-scanner';

// Mock the native modules and hooks
jest.mock('react-native-vision-camera', () => ({
  Camera: () => null,
  useCameraDevice: () => ({ id: 'back-camera' }),
  useFrameProcessor: () => jest.fn(),
  runAtTargetFps: jest.fn(),
}));

jest.mock('react-native-worklets-core', () => ({
  Worklets: {
    createRunOnJS: (fn: any) => fn,
    createSharedValue: (val: any) => ({ value: val }),
  },
}));

jest.mock('vision-camera-resize-plugin', () => ({
  useResizePlugin: () => ({ resize: jest.fn() }),
}));

jest.mock('react-native-fast-tflite', () => ({
  useTensorflowModel: jest.fn(),
}));

jest.mock('../../hooks/use-camera-permissions', () => ({
  useCameraPermissions: jest.fn(),
}));

describe('DiceScanner', () => {
  const mockOnScanComplete = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useCameraPermissions as jest.Mock).mockReturnValue({
      hasPermission: true,
      permissionError: false,
    });
    (useTensorflowModel as jest.Mock).mockReturnValue({
      state: 'loaded',
      model: {
        inputs: [{ shape: [1, 640, 640, 3] }],
        outputs: [{ shape: [1, 8400, 11] }],
        runSync: jest.fn(),
      },
    });
  });

  it('renders correctly when permissions are granted', () => {
    render(
      <DiceScanner
        neededCount={5}
        onScanComplete={mockOnScanComplete}
        onClose={mockOnClose}
      />,
    );
    // The CloseButton has accessibilityRole="button" and accessibilityLabel="Close"
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  });

  it('calls onClose when close button is pressed', async () => {
    const user = userEvent.setup();
    render(
      <DiceScanner
        neededCount={5}
        onScanComplete={mockOnScanComplete}
        onClose={mockOnClose}
      />,
    );

    await user.press(screen.getByRole('button', { name: 'Close' }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('shows permission error when denied', () => {
    (useCameraPermissions as jest.Mock).mockReturnValue({
      hasPermission: false,
      permissionError: true,
    });
    render(
      <DiceScanner
        neededCount={5}
        onScanComplete={mockOnScanComplete}
        onClose={mockOnClose}
      />,
    );
    expect(screen.getByText('Camera permission denied.')).toBeTruthy();
  });

  it('shows loading state when camera is null but no error', () => {
    (useCameraPermissions as jest.Mock).mockReturnValue({
      hasPermission: false,
      permissionError: false,
    });
    render(
      <DiceScanner
        neededCount={5}
        onScanComplete={mockOnScanComplete}
        onClose={mockOnClose}
      />,
    );
    expect(screen.getByText('Loading camera...')).toBeTruthy();
  });
});
