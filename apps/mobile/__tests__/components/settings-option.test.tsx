import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SettingsOption } from '@/components/account/settings-option';

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('SettingsOption — rendering', () => {
  it('renders the label', () => {
    render(<SettingsOption label="Edit Profile" />);
    expect(screen.getByText('Edit Profile')).toBeTruthy();
  });

  it('renders without error when isLast is true', () => {
    expect(() =>
      render(<SettingsOption label="Sign Out" isLast />),
    ).not.toThrow();
  });

  it('renders without error when isLast is false (default)', () => {
    expect(() =>
      render(<SettingsOption label="Edit Profile" />),
    ).not.toThrow();
  });
});

// ─── Interaction ──────────────────────────────────────────────────────────────

describe('SettingsOption — onPress', () => {
  it('calls onPress when the row is tapped', () => {
    const onPress = jest.fn();
    render(<SettingsOption label="Edit Profile" onPress={onPress} />);
    fireEvent.press(screen.getByText('Edit Profile'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders without error when onPress is omitted', () => {
    expect(() => render(<SettingsOption label="Edit Profile" />)).not.toThrow();
  });
});
