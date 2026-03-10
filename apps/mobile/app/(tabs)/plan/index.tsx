import React, { useEffect, useState } from "react";
import { StyleSheet, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import api from "@/services/api";

type PlanExercise = {
  exercise_id: number;
  name: string;
  primary_muscle: string;
  sets: number;
  reps: number;
};

type DaySchedule = {
  day: string;
  rest: boolean;
  exercises: PlanExercise[];
};

type WorkoutPlan = {
  title: string;
  subtitle: string;
  body_fat_percentage: number;
  schedule: DaySchedule[];
};

const DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export default function PlanIndex() {
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlan() {
      try {
        const res = await api.get("/exercises/plan");
        setPlan(res.data);
      } catch (err: any) {
        const detail = err?.response?.data?.detail;
        setError(detail || "Failed to load plan.");
      } finally {
        setLoading(false);
      }
    }
    fetchPlan();
  }, []);

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (error || !plan) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={styles.errorText}>{error || "No plan available."}</ThemedText>
        <ThemedText style={styles.hint}>Complete a body scan to generate your plan.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">{plan.title}</ThemedText>
        <ThemedText style={styles.subtitle}>{plan.subtitle}</ThemedText>
        <ThemedView style={styles.bfPill}>
          <ThemedText style={styles.bfText}>
            Based on {plan.body_fat_percentage}% body fat
          </ThemedText>
        </ThemedView>
      </ThemedView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {plan.schedule.map((day) => (
          <Pressable
            key={day.day}
            onPress={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
            style={({ pressed }) => [styles.dayCard, pressed && styles.dayCardPressed]}
          >
            <ThemedView style={styles.dayHeader}>
              <ThemedText type="defaultSemiBold">{DAY_LABELS[day.day]}</ThemedText>
              {day.rest ? (
                <ThemedView style={styles.restBadge}>
                  <ThemedText style={styles.restText}>Rest</ThemedText>
                </ThemedView>
              ) : (
                <ThemedText style={styles.exerciseCount}>
                  {day.exercises.length} exercises
                </ThemedText>
              )}
            </ThemedView>

            {expandedDay === day.day && !day.rest && (
              <ThemedView style={styles.exerciseList}>
                {day.exercises.map((ex, i) => (
                  <ThemedView key={i} style={styles.exerciseRow}>
                    <ThemedView style={styles.exerciseInfo}>
                      <ThemedText type="defaultSemiBold">{ex.name}</ThemedText>
                      <ThemedText style={styles.muscleText}>{ex.primary_muscle}</ThemedText>
                    </ThemedView>
                    <ThemedText style={styles.setsReps}>
                      {ex.sets} × {ex.reps}
                    </ThemedText>
                  </ThemedView>
                ))}
              </ThemedView>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  errorText: { fontSize: 16, textAlign: "center", opacity: 0.8 },
  hint: { marginTop: 8, opacity: 0.6, textAlign: "center" },

  header: { gap: 6, paddingBottom: 16 },
  subtitle: { opacity: 0.75 },
  bfPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "rgba(150,150,150,0.25)",
  },
  bfText: { fontSize: 12, opacity: 0.8 },

  scrollContent: { paddingBottom: 24, gap: 10 },

  dayCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(150,150,150,0.25)",
  },
  dayCardPressed: { opacity: 0.9 },
  dayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  restBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(150,150,150,0.2)",
  },
  restText: { fontSize: 12, opacity: 0.6 },
  exerciseCount: { fontSize: 13, opacity: 0.6 },

  exerciseList: { marginTop: 12, gap: 10 },
  exerciseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(150,150,150,0.15)",
  },
  exerciseInfo: { gap: 2 },
  muscleText: { fontSize: 12, opacity: 0.6 },
  setsReps: { fontSize: 15, opacity: 0.9 },
});
