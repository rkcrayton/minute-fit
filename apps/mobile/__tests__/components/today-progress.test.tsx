import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { TodayProgress } from '@/components/home/today-progress';

// ─── Renders basic progress ───────────────────────────────────────────────────

describe('TodayProgress — basic rendering', () => {
  it('renders the section header', () => {
    render(
      <TodayProgress workoutsDone={2} workoutsGoal={4} minutesDone={30} minutesGoal={60} />,
    );
    expect(screen.getByText(/Today/i)).toBeTruthy();
  });

  it('renders the workouts done value', () => {
    render(
      <TodayProgress workoutsDone={3} workoutsGoal={5} minutesDone={0} minutesGoal={60} />,
    );
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('renders the minutes done value', () => {
    render(
      <TodayProgress workoutsDone={0} workoutsGoal={4} minutesDone={45} minutesGoal={60} />,
    );
    expect(screen.getByText('45')).toBeTruthy();
  });

  it('renders the Workouts ring label', () => {
    render(
      <TodayProgress workoutsDone={1} workoutsGoal={4} minutesDone={10} minutesGoal={60} />,
    );
    expect(screen.getByText('Workouts')).toBeTruthy();
  });

  it('renders the Minutes ring label', () => {
    render(
      <TodayProgress workoutsDone={1} workoutsGoal={4} minutesDone={10} minutesGoal={60} />,
    );
    expect(screen.getByText('Minutes')).toBeTruthy();
  });
});

// ─── Streak ring ──────────────────────────────────────────────────────────────

describe('TodayProgress — streak ring', () => {
  it('does not render the Streak label when showStreakRing is false (default)', () => {
    render(
      <TodayProgress workoutsDone={1} workoutsGoal={4} minutesDone={10} minutesGoal={60} />,
    );
    expect(screen.queryByText('Streak')).toBeNull();
  });

  it('renders the Streak label when showStreakRing is true', () => {
    render(
      <TodayProgress
        workoutsDone={1}
        workoutsGoal={4}
        minutesDone={10}
        minutesGoal={60}
        showStreakRing
        streakDays={5}
        streakGoal={7}
      />,
    );
    expect(screen.getByText('Streak')).toBeTruthy();
  });

  it('renders the streak day count when showStreakRing is true', () => {
    render(
      <TodayProgress
        workoutsDone={1}
        workoutsGoal={4}
        minutesDone={10}
        minutesGoal={60}
        showStreakRing
        streakDays={5}
      />,
    );
    expect(screen.getByText('5')).toBeTruthy();
  });
});
