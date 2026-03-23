const DEFAULT_STEP_GOAL = 5000;
const DEFAULT_WATER_GOAL_OZ = 64;
const STEP_GOAL_ROUNDING = 250;
const STEP_GOAL_MULTIPLIER = 1.1;
const MAX_STEP_GOAL = 20000;

export function roundToNearest(value: number, nearest: number) {
  return Math.round(value / nearest) * nearest;
}

export function getAdaptiveStepGoal(stepHistory: number[]): number {
  if (!stepHistory.length) return DEFAULT_STEP_GOAL;

  const avg =
    stepHistory.reduce((sum, steps) => sum + steps, 0) / stepHistory.length;

  const boosted = avg * STEP_GOAL_MULTIPLIER;
  const rounded = roundToNearest(boosted, STEP_GOAL_ROUNDING);

  return Math.min(MAX_STEP_GOAL, Math.max(DEFAULT_STEP_GOAL, rounded));
}

export function getWaterGoalOz(weightLb?: number | null): number {
  if (!weightLb || weightLb <= 0) return DEFAULT_WATER_GOAL_OZ;
  return Math.round(weightLb / 2);
}