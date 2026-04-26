import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import { CloseButton } from '../close-button';

describe('CloseButton', () => {
  it('calls onPress when pressed', async () => {
    const mockOnPress = jest.fn();
    const user = userEvent.setup();

    render(<CloseButton onPress={mockOnPress} />);

    // Since it's a pressable wrapping an icon, it might not have an explicit label.
    // We get the button by role. If there are multiple we'd need a testId, but here it's isolated.
    const button = screen.getByRole('button');
    expect(button).toBeVisible();

    await user.press(button);
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
});
