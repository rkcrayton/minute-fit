import React from "react";
import { View } from "react-native";
import tw from "twrnc";
import StatCard from "./stat-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

export type TrackingItem = {
  id: string;
  title: string;
  value: number;
  goal?: number;
  unit?: string;
  subtitle?: string;
  buttonLabel?: string;
  onPressButton?: () => void;
  onPressCard?: () => void;
  ringColor?: string;
};

type TrackingSectionProps = {
  title?: string;
  items: TrackingItem[];
  layout?: "list" | "grid";
};

export default function TrackingSection({
  title = "Daily Tracking",
  items,
  layout = "list",
}: TrackingSectionProps) {
  const cardBgColor = useThemeColor(
    { light: "#F9FAFB", dark: "#1F2937" },
    "background",
  );
  const borderColor = useThemeColor(
    { light: "#E5E7EB", dark: "#374151" },
    "icon",
  );

  return (
    <ThemedView
      style={[
        tw`p-5 rounded-xl mb-3 border`,
        { backgroundColor: cardBgColor, borderColor },
      ]}
    >
      <ThemedText
        type="defaultSemiBold"
        style={tw`mb-3 opacity-60 text-xs uppercase tracking-wide`}
      >
        {title}
      </ThemedText>

      <View
        style={
          layout === "grid"
            ? tw`flex-row flex-wrap justify-between`
            : tw`flex-col`
        }
      >
        {items.map((item) => (
          <View
            key={item.id}
            style={layout === "grid" ? tw`w-[48%] mb-3` : tw`w-full mb-3`}
          >
            <StatCard
              title={item.title}
              value={item.value}
              goal={item.goal}
              unit={item.unit}
              subtitle={item.subtitle}
              buttonLabel={item.buttonLabel}
              onPressButton={item.onPressButton}
              onPressCard={item.onPressCard}
              ringColor={item.ringColor}
              layout={layout}
            />
          </View>
        ))}
      </View>
    </ThemedView>
  );
}