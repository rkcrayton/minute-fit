import React from "react";
import { StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

type WorkoutPlan = {
  id: string;
  title: string;
  subtitle: string;
  daysPerWeek: number;
  durationWeeks: number;
  focus: string[];
};

const PLANS: WorkoutPlan[] = [
  {
    id: "beginner-3",
    title: "Beginner Strength",
    subtitle: "Full-body fundamentals",
    daysPerWeek: 3,
    durationWeeks: 6,
    focus: ["Squat", "Push", "Pull", "Core"],
  },
  {
    id: "hypertrophy-4",
    title: "Hypertrophy Split",
    subtitle: "Build muscle with volume",
    daysPerWeek: 4,
    durationWeeks: 8,
    focus: ["Upper", "Lower", "Accessories", "Progressive Overload"],
  },
  {
    id: "conditioning-3",
    title: "Conditioning + Mobility",
    subtitle: "Work capacity & movement",
    daysPerWeek: 3,
    durationWeeks: 4,
    focus: ["Intervals", "Zone 2", "Mobility"],
  },
];

function PlanCard({ plan }: { plan: WorkoutPlan }) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/plan/${plan.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <ThemedView style={styles.cardHeader}>
        <ThemedText type="subtitle">{plan.title}</ThemedText>
        <ThemedText style={styles.subtitle}>{plan.subtitle}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.metaRow}>
        <ThemedView style={styles.pill}>
          <ThemedText style={styles.pillText}>{plan.daysPerWeek} days/wk</ThemedText>
        </ThemedView>
        <ThemedView style={styles.pill}>
          <ThemedText style={styles.pillText}>{plan.durationWeeks} weeks</ThemedText>
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.focusWrap}>
        {plan.focus.map((tag) => (
          <ThemedView key={tag} style={styles.tag}>
            <ThemedText style={styles.tagText}>{tag}</ThemedText>
          </ThemedView>
        ))}
      </ThemedView>

      <ThemedText style={styles.cta}>Tap to view details →</ThemedText>
    </Pressable>
  );
}

export default function PlanIndex() {
  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Plan</ThemedText>
        <ThemedText style={styles.headerText}>Choose a plan and start training.</ThemedText>
      </ThemedView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  header: { gap: 6, paddingBottom: 12 },
  headerText: { opacity: 0.8 },
  scrollContent: { paddingBottom: 24, gap: 12 },

  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(150,150,150,0.25)",
    gap: 12,
  },
  cardPressed: { transform: [{ scale: 0.99 }], opacity: 0.9 },
  cardHeader: { gap: 4 },
  subtitle: { opacity: 0.75 },

  metaRow: { flexDirection: "row", gap: 8 },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(150,150,150,0.25)",
  },
  pillText: { fontSize: 12, opacity: 0.9 },

  focusWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(150,150,150,0.2)",
  },
  tagText: { fontSize: 12, opacity: 0.9 },

  cta: { marginTop: 4, opacity: 0.85 },
});
