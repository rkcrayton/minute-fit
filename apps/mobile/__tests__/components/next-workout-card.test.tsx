import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { NextWorkoutCard } from '@/components/home/next-workout-card';

// ─── Rendering basics ─────────────────────────────────────────────────────────

describe('NextWorkoutCard — basics', () => {
  it('renders the title', () => {
    render(<NextWorkoutCard title="Chest Day" />);
    expect(screen.getByText('Chest Day')).toBeTruthy();
  });

  it('renders the subtitle when provided', () => {
    render(<NextWorkoutCard title="Chest Day" subtitle="Upper body focus" />);
    expect(screen.getByText('Upper body focus')).toBeTruthy();
  });

  it('does not render a subtitle when omitted', () => {
    render(<NextWorkoutCard title="Chest Day" />);
    expect(screen.queryByText('Upper body focus')).toBeNull();
  });
});

// ─── Detail rows ──────────────────────────────────────────────────────────────

describe('NextWorkoutCard — detail rows', () => {
  it('renders the duration when provided', () => {
    render(<NextWorkoutCard title="Leg Day" duration="30 min" />);
    expect(screen.getByText('30 min')).toBeTruthy();
  });

  it('renders the category when provided', () => {
    render(<NextWorkoutCard title="Leg Day" category="Strength" />);
    expect(screen.getByText('Strength')).toBeTruthy();
  });

  it('renders the difficulty when provided', () => {
    render(<NextWorkoutCard title="Leg Day" difficulty="Medium" />);
    expect(screen.getByText('Medium')).toBeTruthy();
  });

  it('renders the equipment when provided', () => {
    render(<NextWorkoutCard title="Leg Day" equipment="Barbell" />);
    expect(screen.getByText('Barbell')).toBeTruthy();
  });

  it('does not render detail rows when no detail props are provided', () => {
    render(<NextWorkoutCard title="Rest Day" />);
    expect(screen.queryByText(/min/)).toBeNull();
  });

  it('renders all details together', () => {
    render(
      <NextWorkoutCard
        title="Full Body"
        duration="45 min"
        category="Cardio"
        difficulty="Hard"
        equipment="Kettlebell"
      />,
    );
    expect(screen.getByText('45 min')).toBeTruthy();
    expect(screen.getByText('Cardio')).toBeTruthy();
    expect(screen.getByText('Hard')).toBeTruthy();
    expect(screen.getByText('Kettlebell')).toBeTruthy();
  });
});

// ─── Difficulty color mapping ─────────────────────────────────────────────────

describe('NextWorkoutCard — difficulty rendering', () => {
  it('renders Easy difficulty', () => {
    render(<NextWorkoutCard title="X" difficulty="Easy" />);
    expect(screen.getByText('Easy')).toBeTruthy();
  });

  it('renders Medium difficulty', () => {
    render(<NextWorkoutCard title="X" difficulty="Medium" />);
    expect(screen.getByText('Medium')).toBeTruthy();
  });

  it('renders Hard difficulty', () => {
    render(<NextWorkoutCard title="X" difficulty="Hard" />);
    expect(screen.getByText('Hard')).toBeTruthy();
  });
});

// ─── Start button ─────────────────────────────────────────────────────────────

describe('NextWorkoutCard — start button', () => {
  it('renders the Start button when onStart is provided', () => {
    render(<NextWorkoutCard title="Chest Day" onStart={jest.fn()} />);
    expect(screen.getByText('Start')).toBeTruthy();
  });

  it('calls onStart when the button is pressed', () => {
    const onStart = jest.fn();
    render(<NextWorkoutCard title="Chest Day" onStart={onStart} />);
    fireEvent.press(screen.getByText('Start'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('does not render the Start button when onStart is omitted', () => {
    render(<NextWorkoutCard title="Chest Day" />);
    expect(screen.queryByText('Start')).toBeNull();
  });
});
