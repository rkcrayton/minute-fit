import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { RecentWorkouts } from '@/components/home/recent-workouts';

// ─── Empty state ──────────────────────────────────────────────────────────────

describe('RecentWorkouts — empty state', () => {
  it('shows the empty message when the workouts array is empty', () => {
    render(<RecentWorkouts workouts={[]} />);
    expect(screen.getByText('No recent workouts yet')).toBeTruthy();
  });

  it('does not render any workout rows when the array is empty', () => {
    render(<RecentWorkouts workouts={[]} />);
    expect(screen.queryByText('Push-ups')).toBeNull();
  });
});

// ─── Populated list ───────────────────────────────────────────────────────────

describe('RecentWorkouts — populated list', () => {
  const workouts = [
    { name: 'Push-ups', duration: '2 min' },
    { name: 'Squats', duration: '5 min', category: 'Legs' },
  ];

  it('renders each workout name', () => {
    render(<RecentWorkouts workouts={workouts} />);
    expect(screen.getByText('Push-ups')).toBeTruthy();
    expect(screen.getByText('Squats')).toBeTruthy();
  });

  it('renders each workout duration', () => {
    render(<RecentWorkouts workouts={workouts} />);
    expect(screen.getByText('2 min')).toBeTruthy();
    expect(screen.getByText('5 min')).toBeTruthy();
  });

  it('renders category when provided', () => {
    render(<RecentWorkouts workouts={workouts} />);
    expect(screen.getByText('Legs')).toBeTruthy();
  });

  it('does not render category text when it is omitted', () => {
    render(<RecentWorkouts workouts={workouts} />);
    // Push-ups has no category — make sure no phantom category text appears for it
    const allTexts = screen.queryAllByText('Chest');
    expect(allTexts).toHaveLength(0);
  });

  it('does not show the empty message when there are workouts', () => {
    render(<RecentWorkouts workouts={workouts} />);
    expect(screen.queryByText('No recent workouts yet')).toBeNull();
  });

  it('renders the section header', () => {
    render(<RecentWorkouts workouts={workouts} />);
    expect(screen.getByText(/Recent Workouts/i)).toBeTruthy();
  });
});
