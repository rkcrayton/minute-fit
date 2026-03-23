import React from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import tw from "twrnc";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

type ProgressRingProps = {
  progress: number;
  size?: number;
  strokeWidth?: number;
  centerValue: string;
  centerLabel?: string;
  color?: string;
  trackColor?: string;
};

export default function ProgressRing({
  progress,
  size = 88,
  strokeWidth = 10,
  centerValue,
  centerLabel,
  color = "#2563EB",
  trackColor = "#E5E7EB",
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(progress, 1));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - clamped);

  const primaryTextColor = useThemeColor(
    { light: "#111827", dark: "#FFFFFF" },
    "text",
  );

  const secondaryTextColor = useThemeColor(
    { light: "#6B7280", dark: "#D1D5DB" },
    "text",
  );

  return (
    <View
      style={[
        tw`justify-center items-center relative`,
        { width: size, height: size },
      ]}
    >
      <Svg width={size} height={size} style={tw`absolute`}>
        <Circle
          stroke={trackColor}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={tw`items-center justify-center px-1`}>
        <ThemedText
          style={[tw`text-sm font-bold text-center`, { color: primaryTextColor }]}
        >
          {centerValue}
        </ThemedText>

        {centerLabel ? (
          <ThemedText
            style={[tw`text-[10px] text-center mt-0.5`, { color: secondaryTextColor }]}
          >
            {centerLabel}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}