import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import TrackingSection, { TrackingItem } from '@/components/tracking/tracking-section';

const items: TrackingItem[] = [
  { id: '1', title: 'Water', value: 48, goal: 64, unit: 'oz' },
  { id: '2', title: 'Steps', value: 6000, goal: 10000 },
];

// ─── Item rendering ───────────────────────────────────────────────────────────

describe('TrackingSection — items', () => {
  it('renders each item title', () => {
    render(<TrackingSection items={items} />);
    expect(screen.getByText('Water')).toBeTruthy();
    expect(screen.getByText('Steps')).toBeTruthy();
  });

  it('renders goal text from nested StatCards', () => {
    render(<TrackingSection items={items} />);
    expect(screen.getByText(/Goal: 64 oz/)).toBeTruthy();
  });

  it('renders an empty list without error', () => {
    expect(() => render(<TrackingSection items={[]} />)).not.toThrow();
  });
});

// ─── Title ────────────────────────────────────────────────────────────────────

describe('TrackingSection — title', () => {
  it('renders the default title "Daily Tracking"', () => {
    render(<TrackingSection items={items} />);
    expect(screen.getByText('Daily Tracking')).toBeTruthy();
  });

  it('renders a custom title when provided', () => {
    render(<TrackingSection items={items} title="Nutrition" />);
    expect(screen.getByText('Nutrition')).toBeTruthy();
  });
});

// ─── Configure button ─────────────────────────────────────────────────────────

describe('TrackingSection — configure button', () => {
  it('calls onConfigure when the configure button is pressed', () => {
    const onConfigure = jest.fn();
    render(<TrackingSection items={items} onConfigure={onConfigure} />);
    // The icon mock renders a View with testID "icon-SlidersHorizontal".
    // Pressing it bubbles up to the wrapping Pressable.
    fireEvent.press(screen.getByTestId('icon-SlidersHorizontal'));
    expect(onConfigure).toHaveBeenCalledTimes(1);
  });
});

// ─── Layout variants ──────────────────────────────────────────────────────────

describe('TrackingSection — layout', () => {
  it('renders without error in list layout (default)', () => {
    expect(() => render(<TrackingSection items={items} layout="list" />)).not.toThrow();
  });

  it('renders without error in grid layout', () => {
    expect(() => render(<TrackingSection items={items} layout="grid" />)).not.toThrow();
  });

  it('renders item titles in grid layout', () => {
    render(<TrackingSection items={items} layout="grid" />);
    expect(screen.getByText('Water')).toBeTruthy();
    expect(screen.getByText('Steps')).toBeTruthy();
  });
});
