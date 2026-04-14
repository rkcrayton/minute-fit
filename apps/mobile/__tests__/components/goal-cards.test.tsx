import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { GoalCards } from '@/components/account/goal-cards';

const goals = [
  { value: '4', label: 'Workouts / week', onPress: jest.fn() },
  { value: '64 oz', label: 'Water daily', onPress: jest.fn() },
];

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('GoalCards — rendering', () => {
  it('renders the "My Goals" heading', () => {
    render(<GoalCards goals={goals} />);
    expect(screen.getByText('My Goals')).toBeTruthy();
  });

  it('renders each goal value', () => {
    render(<GoalCards goals={goals} />);
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('64 oz')).toBeTruthy();
  });

  it('renders each goal label', () => {
    render(<GoalCards goals={goals} />);
    expect(screen.getByText('Workouts / week')).toBeTruthy();
    expect(screen.getByText('Water daily')).toBeTruthy();
  });

  it('renders without error when the goals array is empty', () => {
    expect(() => render(<GoalCards goals={[]} />)).not.toThrow();
  });
});

// ─── Interaction ──────────────────────────────────────────────────────────────

describe('GoalCards — onPress', () => {
  it('calls onPress when a goal card is tapped', () => {
    const onPress = jest.fn();
    render(<GoalCards goals={[{ value: '4', label: 'Workouts', onPress }]} />);
    fireEvent.press(screen.getByText('Workouts'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders without error when onPress is omitted', () => {
    expect(() =>
      render(<GoalCards goals={[{ value: '4', label: 'Workouts' }]} />),
    ).not.toThrow();
  });
});
