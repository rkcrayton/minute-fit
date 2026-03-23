import React from "react";
import { Pressable, View } from "react-native";
import tw from "twrnc";
import StatCard from "./stat-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { SlidersHorizontal } from "lucide-react-native";

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
  icon?: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
};

type TrackingSectionProps = {
  title?: string;
  items: TrackingItem[];
  layout?: "list" | "grid";
  onConfigure?: () => void;
};

export default function TrackingSection({
  title = "Daily Tracking",
  items,
  layout = "list",
  onConfigure,
}: TrackingSectionProps) {
  const cardBgColor = useThemeColor({}, "surface");
  const borderColor = useThemeColor({}, "border");
  const iconColor = useThemeColor({}, "textSecondary");

  return (
    <ThemedView
      style={[
        tw`p-5 rounded-xl mb-3 border`,
        { backgroundColor: cardBgColor, borderColor },
      ]}
    >
      <View style={tw`flex-row justify-between items-center mb-3`}>
        <ThemedText
          type="defaultSemiBold"
          style={tw`opacity-60 text-xs uppercase tracking-wide`}
        >
          {title}
        </ThemedText>
        {onConfigure && (
          <Pressable onPress={onConfigure} style={{ padding: 4 }}>
            <SlidersHorizontal size={16} color={iconColor} />
          </Pressable>
        )}
      </View>

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
              icon={item.icon}
              layout={layout}
            />
          </View>
        ))}
      </View>
    </ThemedView>
  );
}