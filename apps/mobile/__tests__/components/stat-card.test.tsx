import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import StatCard from '@/components/tracking/stat-card';

// ─── Progress and percent calculation ─────────────────────────────────────────

describe('StatCard — progress calculation', () => {
  it('shows 50% when value is half the goal', () => {
    render(<StatCard title="Steps" value={4000} goal={8000} layout="list" />);
    expect(screen.getByText(/50%/)).toBeTruthy();
  });

  it('shows 0% when value is 0', () => {
    render(<StatCard title="Steps" value={0} goal={8000} layout="list" />);
    expect(screen.getByText(/0%/)).toBeTruthy();
  });

  it('caps at 100% when value exceeds the goal', () => {
    render(<StatCard title="Water" value={80} goal={64} unit="oz" layout="list" />);
    expect(screen.getByText(/100%/)).toBeTruthy();
  });

  it('shows 0% when goal is 0 (avoids divide-by-zero)', () => {
    render(<StatCard title="Steps" value={5000} goal={0} layout="list" />);
    expect(screen.getByText(/0%/)).toBeTruthy();
  });

  it('shows 0% when no goal is provided', () => {
    render(<StatCard title="Heart Rate" value={72} layout="list" />);
    // No goal → progress = 0 → 0%
    expect(screen.getByText(/0%/)).toBeTruthy();
  });
});

// ─── Value formatting ─────────────────────────────────────────────────────────

describe('StatCard — value formatting', () => {
  it('renders integer values without a unit suffix', () => {
    render(<StatCard title="Steps" value={8000} layout="list" />);
    // toLocaleString output varies by locale — match the number part at minimum
    expect(screen.getByText(/8[,.]?000/)).toBeTruthy();
  });

  it('appends unit to the displayed value when unit prop is provided', () => {
    render(<StatCard title="Water" value={48} unit="oz" layout="list" />);
    expect(screen.getByText(/48 oz/)).toBeTruthy();
  });

  it('shows no unit when unit is an empty string', () => {
    render(<StatCard title="Steps" value={5000} unit="" layout="list" />);
    // Should NOT append a trailing space
    const text = screen.getByText(/5[,.]?000/);
    expect(text).toBeTruthy();
  });
});

// ─── Goal text ────────────────────────────────────────────────────────────────

describe('StatCard — goal text', () => {
  it('renders "Goal: <n> <unit>" when goal and unit are provided', () => {
    render(<StatCard title="Water" value={0} goal={64} unit="oz" layout="list" />);
    expect(screen.getByText(/Goal: 64 oz/)).toBeTruthy();
  });

  it('renders "Goal: <n>" without unit when unit is omitted', () => {
    render(<StatCard title="Steps" value={0} goal={8000} layout="list" />);
    expect(screen.getByText(/Goal: 8[,.]?000/)).toBeTruthy();
  });

  it('does not render a goal line when goal is not provided', () => {
    render(<StatCard title="Heart Rate" value={72} layout="list" />);
    expect(screen.queryByText(/Goal:/)).toBeNull();
  });
});

// ─── Subtitle ─────────────────────────────────────────────────────────────────

describe('StatCard — subtitle', () => {
  it('renders the subtitle text when provided', () => {
    render(
      <StatCard title="Heart Rate" value={72} subtitle="Resting" layout="list" />,
    );
    expect(screen.getByText('Resting')).toBeTruthy();
  });

  it('does not render a subtitle when the prop is omitted', () => {
    render(<StatCard title="Steps" value={5000} layout="list" />);
    expect(screen.queryByText('Resting')).toBeNull();
  });
});

// ─── Action button ────────────────────────────────────────────────────────────

describe('StatCard — action button', () => {
  it('renders the button label when both buttonLabel and onPressButton are provided', () => {
    render(
      <StatCard
        title="Health"
        value={0}
        buttonLabel="Connect"
        onPressButton={jest.fn()}
        layout="list"
      />,
    );
    expect(screen.getByText('Connect')).toBeTruthy();
  });

  it('calls onPressButton when the action button is pressed', () => {
    const onPressButton = jest.fn();
    render(
      <StatCard
        title="Health"
        value={0}
        buttonLabel="Connect"
        onPressButton={onPressButton}
        layout="list"
      />,
    );
    fireEvent.press(screen.getByText('Connect'));
    expect(onPressButton).toHaveBeenCalledTimes(1);
  });

  it('does not render the button when buttonLabel is provided but onPressButton is missing', () => {
    render(
      <StatCard title="Health" value={0} buttonLabel="Connect" layout="list" />,
    );
    expect(screen.queryByText('Connect')).toBeNull();
  });

  it('does not render the button when neither buttonLabel nor onPressButton are provided', () => {
    render(<StatCard title="Steps" value={5000} layout="list" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

// ─── onPressCard ──────────────────────────────────────────────────────────────

describe('StatCard — onPressCard', () => {
  it('calls onPressCard when the card is pressed', () => {
    const onPressCard = jest.fn();
    render(
      <StatCard
        title="Steps"
        value={5000}
        goal={8000}
        onPressCard={onPressCard}
        layout="list"
        testID="stat-card"
      />,
    );
    // The pressable wraps the card — press the title text which is inside it
    fireEvent.press(screen.getByText('Steps'));
    expect(onPressCard).toHaveBeenCalledTimes(1);
  });
});

// ─── Layout variants ──────────────────────────────────────────────────────────

describe('StatCard — layout variants', () => {
  it('renders without errors in list layout', () => {
    expect(() =>
      render(<StatCard title="Steps" value={5000} goal={8000} layout="list" />),
    ).not.toThrow();
  });

  it('renders without errors in grid layout', () => {
    expect(() =>
      render(<StatCard title="Steps" value={5000} goal={8000} layout="grid" />),
    ).not.toThrow();
  });

  it('defaults to list layout when layout prop is omitted', () => {
    expect(() =>
      render(<StatCard title="Steps" value={5000} goal={8000} />),
    ).not.toThrow();
  });

  it('renders the title in grid layout', () => {
    render(<StatCard title="Calories" value={300} goal={500} unit="cal" layout="grid" />);
    expect(screen.getByText('Calories')).toBeTruthy();
  });

  it('renders goal text in grid layout', () => {
    render(<StatCard title="Calories" value={300} goal={500} unit="cal" layout="grid" />);
    expect(screen.getByText(/Goal: 500 cal/)).toBeTruthy();
  });
});
