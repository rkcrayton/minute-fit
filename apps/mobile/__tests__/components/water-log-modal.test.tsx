import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import WaterLogModal from '@/components/tracking/water-log-modal';

// ─── Test helpers ─────────────────────────────────────────────────────────────

const defaultProps = {
  visible: true,
  currentOz: 0,
  goalOz: 64,
  onClose: jest.fn(),
  onAddWater: jest.fn(),
};

function renderModal(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(<WaterLogModal {...props} />);
}

// ─── Visibility ───────────────────────────────────────────────────────────────

describe('WaterLogModal — visibility', () => {
  it('renders the modal content when visible=true', () => {
    renderModal({ visible: true });
    expect(screen.getByText('Water Intake')).toBeTruthy();
  });

  // When visible=false, React Native's Modal hides children from the tree.
  // We just verify the component does not crash when toggled off.
  it('does not throw when visible=false', () => {
    expect(() => renderModal({ visible: false })).not.toThrow();
  });
});

// ─── Progress display ─────────────────────────────────────────────────────────

describe('WaterLogModal — progress and goal display', () => {
  it('displays the current water intake', () => {
    renderModal({ currentOz: 32, goalOz: 64 });
    expect(screen.getByText('32 oz')).toBeTruthy();
  });

  it('displays the daily goal in ounces', () => {
    renderModal({ currentOz: 0, goalOz: 80 });
    expect(screen.getByText('80 oz')).toBeTruthy();
  });

  it('shows 50% of goal text when intake is half the goal', () => {
    renderModal({ currentOz: 32, goalOz: 64 });
    // 32/64 = 0.5 → Math.round(0.5 * 100) = 50%
    expect(screen.getByText('50% of goal')).toBeTruthy();
  });

  it('shows 0% of goal when intake is 0', () => {
    renderModal({ currentOz: 0, goalOz: 64 });
    expect(screen.getByText('0% of goal')).toBeTruthy();
  });

  it('caps percent display at 100% even when intake exceeds goal', () => {
    // 80/64 = 1.25 → clamped to 1.0 → 100%
    renderModal({ currentOz: 80, goalOz: 64 });
    expect(screen.getByText('100% of goal')).toBeTruthy();
  });

  it('shows 100% when exactly at goal', () => {
    renderModal({ currentOz: 64, goalOz: 64 });
    expect(screen.getByText('100% of goal')).toBeTruthy();
  });

  it('shows 0% when goalOz is 0 (avoids divide-by-zero)', () => {
    renderModal({ currentOz: 10, goalOz: 0 });
    expect(screen.getByText('0% of goal')).toBeTruthy();
  });

  it('displays the helper text about goal calculation', () => {
    renderModal();
    expect(screen.getByText('Based on half your body weight.')).toBeTruthy();
  });
});

// ─── Quick-add buttons ────────────────────────────────────────────────────────

describe('WaterLogModal — quick-add buttons', () => {
  it('renders quick-add buttons for 8, 16, and 24 oz', () => {
    renderModal();
    expect(screen.getByText('+8 oz')).toBeTruthy();
    expect(screen.getByText('+16 oz')).toBeTruthy();
    expect(screen.getByText('+24 oz')).toBeTruthy();
  });

  it('calls onAddWater(8) when the +8 oz button is pressed', () => {
    const onAddWater = jest.fn();
    renderModal({ onAddWater });
    fireEvent.press(screen.getByText('+8 oz'));
    expect(onAddWater).toHaveBeenCalledWith(8);
  });

  it('calls onAddWater(16) when the +16 oz button is pressed', () => {
    const onAddWater = jest.fn();
    renderModal({ onAddWater });
    fireEvent.press(screen.getByText('+16 oz'));
    expect(onAddWater).toHaveBeenCalledWith(16);
  });

  it('calls onAddWater(24) when the +24 oz button is pressed', () => {
    const onAddWater = jest.fn();
    renderModal({ onAddWater });
    fireEvent.press(screen.getByText('+24 oz'));
    expect(onAddWater).toHaveBeenCalledWith(24);
  });

  it('does not call onClose when a quick-add button is pressed', () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    fireEvent.press(screen.getByText('+8 oz'));
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ─── Close behaviour ──────────────────────────────────────────────────────────

describe('WaterLogModal — close behaviour', () => {
  it('calls onClose when the Close button is pressed', () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    fireEvent.press(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
