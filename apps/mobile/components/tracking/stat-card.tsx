import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
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
  icon?: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
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
  icon: Icon,
  layout = "list",
}: StatCardProps) {
  const progress = goal && goal > 0 ? value / goal : 0;
  const percent = Math.min(100, Math.round(progress * 100));
  const formattedValue = `${value.toLocaleString()}${unit ? ` ${unit}` : ""}`;
  const formattedGoal = goal
    ? `Goal: ${goal.toLocaleString()}${unit ? ` ${unit}` : ""}`
    : undefined;

  const cardBgColor = useThemeColor({}, "surfaceElevated");
  const borderColor = useThemeColor({}, "border");
  const textSecondary = useThemeColor({}, "textSecondary");

  // Icon badge background: ring color at ~15% opacity
  const iconBadgeBg = ringColor + "26";

  const cardContent =
    layout === "grid" ? (
      <ThemedView
        style={[
          styles.gridCard,
          { backgroundColor: cardBgColor, borderColor },
        ]}
      >
        {/* Icon + title row */}
        <View style={styles.gridHeader}>
          {Icon && (
            <View style={[styles.iconBadge, { backgroundColor: iconBadgeBg }]}>
              <Icon size={14} color={ringColor} strokeWidth={2.2} />
            </View>
          )}
          <ThemedText
            style={styles.gridTitle}
            numberOfLines={1}
          >
            {title}
          </ThemedText>
        </View>

        {/* Progress ring */}
        <View style={styles.ringWrapper}>
          <ProgressRing
            progress={progress}
            size={88}
            strokeWidth={9}
            centerValue={formattedValue}
            centerLabel={goal ? `${percent}%` : undefined}
            color={ringColor}
          />
        </View>

        {/* Goal / subtitle */}
        {formattedGoal ? (
          <ThemedText style={[styles.goalText, { color: textSecondary }]}>
            {formattedGoal}
          </ThemedText>
        ) : null}
      </ThemedView>
    ) : (
      <ThemedView
        style={[
          styles.listCard,
          { backgroundColor: cardBgColor, borderColor },
        ]}
      >
        <View style={styles.listRow}>
          <View style={styles.listRingWrapper}>
            <ProgressRing
              progress={progress}
              size={84}
              strokeWidth={10}
              centerValue={`${percent}%`}
              centerLabel="goal"
              color={ringColor}
            />
          </View>

          <View style={styles.listContent}>
            {/* Icon + title */}
            <View style={styles.listTitleRow}>
              {Icon && (
                <View style={[styles.iconBadge, { backgroundColor: iconBadgeBg }]}>
                  <Icon size={13} color={ringColor} strokeWidth={2.2} />
                </View>
              )}
              <ThemedText type="defaultSemiBold" style={styles.listTitle}>
                {title}
              </ThemedText>
            </View>

            <ThemedText style={styles.listValue}>{formattedValue}</ThemedText>

            {formattedGoal ? (
              <ThemedText style={[styles.listGoal, { color: textSecondary }]}>
                {formattedGoal}
              </ThemedText>
            ) : null}

            {subtitle ? (
              <ThemedText style={[styles.listSubtitle, { color: textSecondary }]}>
                {subtitle}
              </ThemedText>
            ) : null}

            {buttonLabel && onPressButton ? (
              <Pressable
                style={styles.button}
                onPress={onPressButton}
              >
                <ThemedText style={styles.buttonText}>{buttonLabel}</ThemedText>
              </Pressable>
            ) : null}
          </View>
        </View>
      </ThemedView>
    );

  if (onPressCard) {
    return (
      <Pressable onPress={onPressCard} style={styles.pressable}>
        {cardContent}
      </Pressable>
    );
  }

  return cardContent;
}

const styles = StyleSheet.create({
  // Grid card
  gridCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  gridHeader: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 10,
    gap: 6,
    maxWidth: "100%",
  },
  gridTitle: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  ringWrapper: {
    marginBottom: 8,
  },
  goalText: {
    fontSize: 11,
    textAlign: "center",
  },

  // List card
  listCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  listRingWrapper: {
    marginRight: 14,
  },
  listContent: {
    flex: 1,
  },
  listTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  listTitle: {
    fontSize: 14,
  },
  listValue: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 2,
  },
  listGoal: {
    fontSize: 12,
    marginBottom: 2,
  },
  listSubtitle: {
    fontSize: 11,
    marginBottom: 4,
  },

  // Icon badge
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },

  // Connect button
  button: {
    alignSelf: "flex-start",
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
  },

  pressable: {
    borderRadius: 14,
  },
});
