import {
  Droplets,
  Flame,
  Footprints,
  HeartPulse,
  Layers,
  Moon,
  Route,
  Timer,
} from "lucide-react-native";
import React from "react";

export type StatId =
  | "steps"
  | "water"
  | "calories"
  | "exercise_minutes"
  | "distance"
  | "floors"
  | "resting_hr"
  | "sleep";

export type StatDefinition = {
  id: StatId;
  title: string;
  unit: string;
  ringColor: string;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  /** null = display-only, no progress ring (e.g. resting heart rate) */
  defaultGoal: number | null;
  description: string;
};

export const ALL_STATS: StatDefinition[] = [
  {
    id: "steps",
    title: "Steps",
    unit: "",
    ringColor: "#22C55E",
    icon: Footprints,
    defaultGoal: 8000,
    description: "Daily step count synced from Apple Health.",
  },
  {
    id: "water",
    title: "Water",
    unit: "oz",
    ringColor: "#3B82F6",
    icon: Droplets,
    defaultGoal: 64,
    description: "Water intake logged manually in the app.",
  },
  {
    id: "calories",
    title: "Calories Burned",
    unit: "cal",
    ringColor: "#F97316",
    icon: Flame,
    defaultGoal: 500,
    description: "Active calories burned synced from Apple Health.",
  },
  {
    id: "exercise_minutes",
    title: "Exercise Minutes",
    unit: "min",
    ringColor: "#A855F7",
    icon: Timer,
    defaultGoal: 30,
    description: "Active exercise time synced from Apple Health.",
  },
  {
    id: "distance",
    title: "Distance",
    unit: "mi",
    ringColor: "#06B6D4",
    icon: Route,
    defaultGoal: 3,
    description: "Walking and running distance synced from Apple Health.",
  },
  {
    id: "floors",
    title: "Floors Climbed",
    unit: "floors",
    ringColor: "#EAB308",
    icon: Layers,
    defaultGoal: 10,
    description: "Flights of stairs climbed synced from Apple Health.",
  },
  {
    id: "resting_hr",
    title: "Resting Heart Rate",
    unit: "bpm",
    ringColor: "#EF4444",
    icon: HeartPulse,
    defaultGoal: null,
    description: "Most recent resting heart rate from Apple Health.",
  },
  {
    id: "sleep",
    title: "Sleep",
    unit: "hrs",
    ringColor: "#6366F1",
    icon: Moon,
    defaultGoal: 8,
    description: "Hours of sleep last night from Apple Health.",
  },
];

export const DEFAULT_STAT_IDS: StatId[] = [
  "steps",
  "water",
  "calories",
  "exercise_minutes",
];

export const MAX_SELECTED_STATS = 8;
