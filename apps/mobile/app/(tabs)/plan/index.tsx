import React, { useCallback, useState } from "react";
import { StyleSheet, ScrollView, ActivityIndicator, Pressable, TouchableOpacity } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import api from "@/services/api";

type PlanExercise = {
  exercise_id: number;
  name: string;
  primary_muscle: string;
  difficulty: string;
  times_per_day: number;
  duration_seconds: number;
  done_today: number;
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
  today: string;
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

  const tint = useThemeColor({}, "tint");
  const successColor = "#10B981";

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function fetchPlan() {
        setLoading(true);
        setError(null);
        try {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const res = await api.get("/exercises/plan", { params: { tz } });
          if (!cancelled) {
            setPlan(res.data);
            setExpandedDay(res.data.today);
          }
        } catch (err: any) {
          if (!cancelled) {
            const detail = err?.response?.data?.detail;
            setError(detail || "Failed to load plan.");
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      fetchPlan();
      return () => { cancelled = true; };
    }, [])
  );

  const handleStartExercise = (ex: PlanExercise) => {
    router.push({
      pathname: "/workout",
      params: {
        exerciseId: String(ex.exercise_id),
        name: ex.name,
        primaryMuscle: ex.primary_muscle,
        difficulty: ex.difficulty,
        timesPerDay: String(ex.times_per_day),
        doneToday: String(ex.done_today),
        durationSeconds: String(ex.duration_seconds),
      },
    });
  };

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
        {plan.schedule.map((day) => {
          const isToday = day.day === plan.today;
          return (
            <Pressable
              key={day.day}
              onPress={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
              style={({ pressed }) => [
                styles.dayCard,
                isToday && { borderColor: tint, borderWidth: 2 },
                pressed && styles.dayCardPressed,
              ]}
            >
              <ThemedView style={styles.dayHeader}>
                <ThemedView style={styles.dayTitleRow}>
                  <ThemedText type="defaultSemiBold">{DAY_LABELS[day.day]}</ThemedText>
                  {isToday && (
                    <ThemedView style={[styles.todayBadge, { backgroundColor: tint + "22", borderColor: tint }]}>
                      <ThemedText style={[styles.todayText, { color: tint }]}>Today</ThemedText>
                    </ThemedView>
                  )}
                </ThemedView>
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
                  {day.exercises.map((ex, i) => {
                    const isComplete = isToday && ex.done_today >= ex.times_per_day;
                    return (
                      <ThemedView key={i} style={styles.exerciseRow}>
                        <ThemedView style={styles.exerciseInfo}>
                          <ThemedText type="defaultSemiBold">{ex.name}</ThemedText>
                          <ThemedText style={styles.muscleText}>{ex.primary_muscle}</ThemedText>
                        </ThemedView>
                        <ThemedView style={styles.exerciseRight}>
                          {isToday ? (
                            <ThemedText style={[
                              styles.durationLabel,
                              isComplete && { color: successColor },
                            ]}>
                              {ex.done_today}/{ex.times_per_day} done
                            </ThemedText>
                          ) : (
                            <ThemedText style={styles.durationLabel}>
                              {ex.times_per_day}x · 1 min
                            </ThemedText>
                          )}
                          {isToday && !isComplete && (
                            <TouchableOpacity
                              style={[styles.startBtn, { backgroundColor: tint }]}
                              onPress={() => handleStartExercise(ex)}
                              activeOpacity={0.85}
                            >
                              <ThemedText style={styles.startBtnText}>Start</ThemedText>
                            </TouchableOpacity>
                          )}
                        </ThemedView>
                      </ThemedView>
                    );
                  })}
                </ThemedView>
              )}
            </Pressable>
          );
        })}
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
  dayTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },

  todayBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  todayText: { fontSize: 11, fontWeight: "600" },

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
  exerciseInfo: { gap: 2, flex: 1 },
  muscleText: { fontSize: 12, opacity: 0.6 },
  exerciseRight: { alignItems: "flex-end", gap: 6 },
  durationLabel: { fontSize: 13, opacity: 0.7 },
  startBtn: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  startBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
});
