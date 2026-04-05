import { render, screen, userEvent } from '@testing-library/react-native';
import React from 'react';
import { Die } from '../die';

describe('Die Component', () => {
  it('renders correctly with the correct accessible name', () => {
    render(
      <Die value={3} locked={false} onClick={() => {}} disabled={false} />,
    );

    expect(
      screen.getByRole('button', { name: 'Die with value 3' }),
    ).toBeVisible();
  });

  it('renders correctly when locked', () => {
    render(<Die value={6} locked={true} onClick={() => {}} disabled={false} />);

    expect(
      screen.getByRole('button', { name: 'Die with value 6, locked' }),
    ).toBeVisible();
  });

  it('calls onClick when pressed using userEvent', async () => {
    const mockOnClick = jest.fn();
    const user = userEvent.setup();

    render(
      <Die value={1} locked={false} onClick={mockOnClick} disabled={false} />,
    );

    const dieButton = screen.getByRole('button', { name: 'Die with value 1' });

    await user.press(dieButton);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });
});
