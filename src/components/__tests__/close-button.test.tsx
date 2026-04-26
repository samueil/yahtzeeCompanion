import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import { CloseButton } from '../close-button';

describe('CloseButton', () => {
  it('calls onPress when pressed', async () => {
    const mockOnPress = jest.fn();
    const user = userEvent.setup();

    render(<CloseButton onPress={mockOnPress} />);

    // Icon-only controls should be queried by role and accessible name.
    const button = screen.getByRole('button', { name: /close/i });
    expect(button).toBeVisible();

    await user.press(button);
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
});
