import {
  roundToNearest,
  getAdaptiveStepGoal,
  getWaterGoalOz,
  DEFAULT_EXERCISE_GOAL_MIN,
  DEFAULT_DISTANCE_GOAL_MI,
  DEFAULT_FLOORS_GOAL,
  DEFAULT_SLEEP_GOAL_HRS,
  DEFAULT_CALORIES_GOAL,
} from '@/services/tracking-goals';

// ─── roundToNearest ──────────────────────────────────────────────────────────

describe('roundToNearest', () => {
  it('rounds up when the remainder exceeds half the interval', () => {
    // 130 / 250 = 0.52 → rounds to 1 → 1 × 250 = 250
    expect(roundToNearest(130, 250)).toBe(250);
  });

  it('rounds down when the remainder is below half the interval', () => {
    // 100 / 250 = 0.40 → rounds to 0 → 0 × 250 = 0
    expect(roundToNearest(100, 250)).toBe(0);
  });

  it('returns the value unchanged when it is already a multiple', () => {
    expect(roundToNearest(5000, 250)).toBe(5000);
    expect(roundToNearest(7500, 250)).toBe(7500);
  });

  it('rounds a value that falls exactly halfway up (banker rounding via Math.round)', () => {
    // 125 / 250 = 0.5 → Math.round(0.5) = 1 → 250
    expect(roundToNearest(125, 250)).toBe(250);
  });

  it('handles zero value', () => {
    expect(roundToNearest(0, 250)).toBe(0);
  });

  it('works with an interval of 1', () => {
    expect(roundToNearest(3.7, 1)).toBe(4);
    expect(roundToNearest(3.2, 1)).toBe(3);
  });

  it('works with large values', () => {
    // 18800 / 250 = 75.2 → rounds to 75 → 75 × 250 = 18750
    expect(roundToNearest(18800, 250)).toBe(18750);
  });
});

// ─── getAdaptiveStepGoal ─────────────────────────────────────────────────────

describe('getAdaptiveStepGoal', () => {
  it('returns 5000 (DEFAULT_STEP_GOAL) when history is empty', () => {
    expect(getAdaptiveStepGoal([])).toBe(5000);
  });

  it('enforces the 5000-step minimum even when boosted average is lower', () => {
    // avg 3000 → ×1.1 = 3300 → rounded = 3250 → clamped to 5000
    expect(getAdaptiveStepGoal([3000])).toBe(5000);
  });

  it('enforces 5000 minimum when all history values are zero', () => {
    expect(getAdaptiveStepGoal([0, 0, 0, 0, 0, 0, 0])).toBe(5000);
  });

  it('correctly boosts and rounds a single-day history above the minimum', () => {
    // avg 8000 → ×1.1 = 8800 → 8800/250 = 35.2 → rounds to 35 → 35×250 = 8750
    expect(getAdaptiveStepGoal([8000])).toBe(8750);
  });

  it('averages multiple days before applying the boost', () => {
    // avg of [6000, 8000, 10000] = 8000 → same as single 8000 day
    expect(getAdaptiveStepGoal([6000, 8000, 10000])).toBe(8750);
  });

  it('caps the goal at 20000 (MAX_STEP_GOAL) when boosted average exceeds it', () => {
    // avg 20000 → ×1.1 = 22000 → clamped to 20000
    expect(getAdaptiveStepGoal([20000])).toBe(20000);
    // avg 25000 → still capped at 20000
    expect(getAdaptiveStepGoal([25000])).toBe(20000);
  });

  it('produces a result near (but not over) the cap for high but under-limit histories', () => {
    // avg 18000 → ×1.1 = 19800 → 19800/250 = 79.2 → rounds to 79 → 79×250 = 19750
    expect(getAdaptiveStepGoal([18000])).toBe(19750);
  });

  it('always returns a multiple of 250', () => {
    const histories = [
      [5500],
      [7300],
      [9999],
      [12000, 14000],
      [1000, 2000, 3000],
    ];
    histories.forEach((history) => {
      const result = getAdaptiveStepGoal(history);
      expect(result % 250).toBe(0);
    });
  });

  it('result is always between 5000 and 20000 inclusive', () => {
    const extremes = [[0], [1], [50000], [10000, 12000, 8000]];
    extremes.forEach((history) => {
      const result = getAdaptiveStepGoal(history);
      expect(result).toBeGreaterThanOrEqual(5000);
      expect(result).toBeLessThanOrEqual(20000);
    });
  });
});

// ─── getWaterGoalOz ──────────────────────────────────────────────────────────

describe('getWaterGoalOz', () => {
  it('returns 64 (DEFAULT) when weight is null', () => {
    expect(getWaterGoalOz(null)).toBe(64);
  });

  it('returns 64 (DEFAULT) when weight is undefined', () => {
    expect(getWaterGoalOz(undefined)).toBe(64);
  });

  it('returns 64 (DEFAULT) when weight is 0', () => {
    expect(getWaterGoalOz(0)).toBe(64);
  });

  it('returns 64 (DEFAULT) when weight is negative', () => {
    expect(getWaterGoalOz(-100)).toBe(64);
  });

  it('returns half of body weight in oz for a typical weight', () => {
    expect(getWaterGoalOz(150)).toBe(75);  // 150 / 2 = 75
    expect(getWaterGoalOz(200)).toBe(100); // 200 / 2 = 100
    expect(getWaterGoalOz(130)).toBe(65);  // 130 / 2 = 65
  });

  it('rounds fractional halves correctly', () => {
    // Math.round(151 / 2) = Math.round(75.5) = 76
    expect(getWaterGoalOz(151)).toBe(76);
    // Math.round(101 / 2) = Math.round(50.5) = 51
    expect(getWaterGoalOz(101)).toBe(51);
  });

  it('handles a very low but positive weight', () => {
    // Any positive value should return half, minimum 1
    expect(getWaterGoalOz(1)).toBe(1); // Math.round(0.5) = 1
  });
});

// ─── Exported constants ───────────────────────────────────────────────────────

describe('exported default constants', () => {
  it('DEFAULT_EXERCISE_GOAL_MIN is 30', () => {
    expect(DEFAULT_EXERCISE_GOAL_MIN).toBe(30);
  });

  it('DEFAULT_DISTANCE_GOAL_MI is 3', () => {
    expect(DEFAULT_DISTANCE_GOAL_MI).toBe(3);
  });

  it('DEFAULT_FLOORS_GOAL is 10', () => {
    expect(DEFAULT_FLOORS_GOAL).toBe(10);
  });

  it('DEFAULT_SLEEP_GOAL_HRS is 8', () => {
    expect(DEFAULT_SLEEP_GOAL_HRS).toBe(8);
  });

  it('DEFAULT_CALORIES_GOAL is 500', () => {
    expect(DEFAULT_CALORIES_GOAL).toBe(500);
  });
});
