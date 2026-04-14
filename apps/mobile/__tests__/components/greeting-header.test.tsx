import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { GreetingHeader } from '@/components/home/greeting-header';

/**
 * GreetingHeader has a time-sensitive branch:
 *   hour < 12  → "Good morning"
 *   hour < 18  → "Good afternoon"
 *   otherwise  → "Good evening"
 *
 * We use jest.useFakeTimers() + jest.setSystemTime() to control what
 * `new Date().getHours()` returns. This is the correct approach — avoid
 * jest.spyOn(global, 'Date') which breaks Date.now and causes RNTL to fail.
 */

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

/** Set the fake clock to a specific hour-of-day (local time). */
function setHour(hour: number) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  jest.setSystemTime(d);
}

// ─── Time-based greeting ──────────────────────────────────────────────────────

describe('GreetingHeader — greeting text', () => {
  it('shows "Good morning" at midnight (hour = 0)', () => {
    setHour(0);
    render(<GreetingHeader userName="Alice" streakDays={3} />);
    expect(screen.getByText(/Good morning, Alice/)).toBeTruthy();
  });

  it('shows "Good morning" at 11:00 (last morning hour)', () => {
    setHour(11);
    render(<GreetingHeader userName="Alice" streakDays={3} />);
    expect(screen.getByText(/Good morning, Alice/)).toBeTruthy();
  });

  it('shows "Good afternoon" at noon (hour = 12)', () => {
    setHour(12);
    render(<GreetingHeader userName="Alice" streakDays={3} />);
    expect(screen.getByText(/Good afternoon, Alice/)).toBeTruthy();
  });

  it('shows "Good afternoon" at 17:00 (last afternoon hour)', () => {
    setHour(17);
    render(<GreetingHeader userName="Alice" streakDays={3} />);
    expect(screen.getByText(/Good afternoon, Alice/)).toBeTruthy();
  });

  it('shows "Good evening" at 18:00 (first evening hour)', () => {
    setHour(18);
    render(<GreetingHeader userName="Alice" streakDays={3} />);
    expect(screen.getByText(/Good evening, Alice/)).toBeTruthy();
  });

  it('shows "Good evening" at 23:00 (late night)', () => {
    setHour(23);
    render(<GreetingHeader userName="Alice" streakDays={3} />);
    expect(screen.getByText(/Good evening, Alice/)).toBeTruthy();
  });
});

// ─── User name ────────────────────────────────────────────────────────────────

describe('GreetingHeader — user name', () => {
  it('renders the provided userName in the greeting', () => {
    setHour(9);
    render(<GreetingHeader userName="Bob" streakDays={0} />);
    expect(screen.getByText(/Bob/)).toBeTruthy();
  });

  it('handles an empty string userName without crashing', () => {
    setHour(9);
    render(<GreetingHeader userName="" streakDays={1} />);
    expect(screen.getByText(/Good morning,/)).toBeTruthy();
  });
});

// ─── Streak display ───────────────────────────────────────────────────────────

describe('GreetingHeader — streak display', () => {
  it('renders the streak count', () => {
    setHour(9);
    render(<GreetingHeader userName="Alice" streakDays={14} />);
    expect(screen.getByText(/14 day streak/)).toBeTruthy();
  });

  it('renders 0-day streak without crashing', () => {
    setHour(9);
    render(<GreetingHeader userName="Alice" streakDays={0} />);
    expect(screen.getByText(/0 day streak/)).toBeTruthy();
  });

  it('renders large streak values correctly', () => {
    setHour(9);
    render(<GreetingHeader userName="Alice" streakDays={365} />);
    expect(screen.getByText(/365 day streak/)).toBeTruthy();
  });
});
