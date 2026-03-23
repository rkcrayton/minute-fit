import React from "react";
import { View, Pressable } from "react-native";
import tw from "twrnc";
import ProgressRing from "./progress-ring";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

type StatCardProps = {
  title: string;
  value: number;
  goal?: number;
  unit?: string;
  subtitle?: string;
  buttonLabel?: string;
  onPressButton?: () => void;
  onPressCard?: () => void;
  ringColor?: string;
  layout?: "list" | "grid";
};

export default function StatCard({
  title,
  value,
  goal,
  unit = "",
  subtitle,
  buttonLabel,
  onPressButton,
  onPressCard,
  ringColor = "#2563EB",
  layout = "list",
}: StatCardProps) {
  const progress = goal && goal > 0 ? value / goal : 0;
  const percent = Math.min(100, Math.round(progress * 100));
  const formattedValue = `${value.toLocaleString()}${unit ? ` ${unit}` : ""}`;
  const formattedGoal = goal
    ? `Goal: ${goal.toLocaleString()}${unit ? ` ${unit}` : ""}`
    : undefined;

  const cardBgColor = useThemeColor(
    { light: "#FFFFFF", dark: "#111827" },
    "background",
  );
  const borderColor = useThemeColor(
    { light: "#E5E7EB", dark: "#374151" },
    "icon",
  );

  const cardContent =
    layout === "grid" ? (
      <ThemedView
        style={[
          tw`p-4 rounded-xl border items-center`,
          { backgroundColor: cardBgColor, borderColor },
        ]}
      >
        <ThemedText type="defaultSemiBold" style={tw`text-sm mb-3`}>
          {title}
        </ThemedText>

        <ProgressRing
          progress={progress}
          size={92}
          strokeWidth={10}
          centerValue={formattedValue}
          centerLabel={`${percent}%`}
          color={ringColor}
        />

        {formattedGoal ? (
          <ThemedText style={tw`text-xs opacity-60 mt-3 text-center`}>
            {formattedGoal}
          </ThemedText>
        ) : null}
      </ThemedView>
    ) : (
      <ThemedView
        style={[
          tw`p-4 rounded-xl border`,
          { backgroundColor: cardBgColor, borderColor },
        ]}
      >
        <View style={tw`flex-row items-center`}>
          <View style={tw`mr-4`}>
            <ProgressRing
              progress={progress}
              size={84}
              strokeWidth={10}
              centerValue={`${percent}%`}
              centerLabel="goal"
              color={ringColor}
            />
          </View>

          <View style={tw`flex-1`}>
            <ThemedText type="defaultSemiBold" style={tw`mb-1`}>
              {title}
            </ThemedText>

            <ThemedText style={tw`text-2xl font-bold mb-1`}>
              {formattedValue}
            </ThemedText>

            {formattedGoal ? (
              <ThemedText style={tw`text-sm opacity-60 mb-1`}>
                {formattedGoal}
              </ThemedText>
            ) : null}

            {subtitle ? (
              <ThemedText style={tw`text-xs opacity-60 mb-2`}>
                {subtitle}
              </ThemedText>
            ) : null}

            {buttonLabel && onPressButton ? (
              <Pressable
                style={tw`self-start bg-blue-600 px-3 py-2 rounded-lg mt-1`}
                onPress={onPressButton}
              >
                <ThemedText style={tw`text-white font-medium`}>
                  {buttonLabel}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        </View>
      </ThemedView>
    );

  if (onPressCard) {
    return (
      <Pressable onPress={onPressCard} style={tw`rounded-xl`}>
        {cardContent}
      </Pressable>
    );
  }

  return cardContent;
}