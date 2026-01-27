import React from 'react';
import { View } from 'react-native';
import tw from 'twrnc';
import Svg, { Circle } from 'react-native-svg';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ProgressRingProps = {
  value: number;
  maxValue?: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  unit?: string;
};

export function ProgressRing({
  value,
  maxValue = 100,
  size = 120,
  strokeWidth = 10,
  label,
  unit = '',
}: ProgressRingProps) {
  const progressColor = useThemeColor({ light: '#1D4ED8', dark: '#3B82F6' }, 'tint');
  const trackColor = useThemeColor({ light: '#E5E7EB', dark: '#374151' }, 'icon');

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(value / maxValue, 1);
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <ThemedView style={tw`items-center`}>
      <View style={[tw`relative justify-center items-center`, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={progressColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={tw`absolute justify-center items-center`}>
          <ThemedText type="title" style={tw`text-3xl font-bold`}>
            {value}
          </ThemedText>
          {unit && (
            <ThemedText style={tw`text-xs opacity-60 -mt-1`}>{unit}</ThemedText>
          )}
        </View>
      </View>
      <ThemedText type="defaultSemiBold" style={tw`mt-2 text-sm text-center`}>
        {label}
      </ThemedText>
    </ThemedView>
  );
}
