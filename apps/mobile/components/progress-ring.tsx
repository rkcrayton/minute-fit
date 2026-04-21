import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import tw from "twrnc";

export type ProgressRingProps = {
  value: number;
  maxValue?: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  unit?: string;
  showTrack?: boolean;
  accessibilityLabel?: string;
};

export function ProgressRing({
  value,
  maxValue = 100,
  size = 120,
  strokeWidth = 10,
  label,
  unit = "",
  showTrack = false,
  accessibilityLabel,
}: ProgressRingProps) {
  const progressColor = useThemeColor({}, "tint");
  const trackColor = useThemeColor({}, "border");

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(value / maxValue, 1);
  const strokeDashoffset = circumference - progress * circumference;

  const a11yLabel = accessibilityLabel ?? `${label}: ${value}${unit ? " " + unit : ""}${maxValue !== undefined ? " of " + maxValue : ""}`;

  return (
    <ThemedView
      style={[tw`items-center`, { backgroundColor: 'transparent' }]}
      accessible={true}
      accessibilityLabel={a11yLabel}
    >
      <View
        style={[
          tw`relative justify-center items-center`,
          { width: size, height: size },
        ]}
      >
        <Svg width={size} height={size}>
          {/* Background circle - only show if showTrack is true */}
          {showTrack && (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={trackColor}
              strokeWidth={strokeWidth}
              fill="none"
            />
          )}
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
