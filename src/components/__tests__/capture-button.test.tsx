import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import { CaptureButton } from '../capture-button';

describe('CaptureButton', () => {
  it('renders correctly when ready', () => {
    render(
      <CaptureButton
        onPress={() => {}}
        disabled={false}
        isReady={true}
        label="SHOOT"
      />,
    );

    expect(screen.getByRole('button')).toBeVisible();
    expect(screen.getByText('SHOOT')).toBeVisible();
  });

  it('renders waiting state when not ready', () => {
    render(
      <CaptureButton onPress={() => {}} disabled={true} isReady={false} />,
    );

    expect(screen.getByText('Waiting for dice...')).toBeVisible();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls onPress when pressed and enabled', async () => {
    const mockOnPress = jest.fn();
    const user = userEvent.setup();

    render(
      <CaptureButton onPress={mockOnPress} disabled={false} isReady={true} />,
    );

    await user.press(screen.getByRole('button'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
});
