/**
 * Mock for lucide-react-native.
 * All icon components render as a plain View with an accessible label so tests
 * can assert on their presence without needing native SVG rendering.
 */
import React from 'react';
import { View } from 'react-native';

type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
  testID?: string;
};

/** Returns a lightweight stub component for any icon name. */
const createIcon = (name: string) => {
  const Icon = ({ testID }: IconProps) => (
    <View testID={testID ?? `icon-${name}`} accessibilityLabel={name} />
  );
  Icon.displayName = name;
  return Icon;
};

// Named exports for every icon used in the codebase
export const Flame = createIcon('Flame');
export const Droplets = createIcon('Droplets');
export const Footprints = createIcon('Footprints');
export const HeartPulse = createIcon('HeartPulse');
export const Layers = createIcon('Layers');
export const Moon = createIcon('Moon');
export const Route = createIcon('Route');
export const Timer = createIcon('Timer');
export const ChevronRight = createIcon('ChevronRight');
export const Settings = createIcon('Settings');
export const User = createIcon('User');
export const Activity = createIcon('Activity');
export const LogOut = createIcon('LogOut');
export const Camera = createIcon('Camera');
export const BarChart = createIcon('BarChart');
export const Heart = createIcon('Heart');
export const Dumbbell = createIcon('Dumbbell');
export const Plus = createIcon('Plus');
export const X = createIcon('X');
export const Check = createIcon('Check');
export const Clock = createIcon('Clock');
export const TrendingUp = createIcon('TrendingUp');
export const Package = createIcon('Package');
export const CheckCircle2 = createIcon('CheckCircle2');
export const SlidersHorizontal = createIcon('SlidersHorizontal');
