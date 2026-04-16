import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  getMyPlan,
  DAYS,
  type WorkoutPlan,
  type PlanEntryEnriched,
} from "@/services/workout-plans";

const DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

function todayKey(): string {
  return new Date()
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();
}

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
          const data = await getMyPlan();
          if (!cancelled) {
            setPlan(data);
            if (data) setExpandedDay(todayKey());
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
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const handleStartExercise = (ex: PlanEntryEnriched) => {
    router.push({
      pathname: "/workout",
      params: {
        exerciseId: String(ex.exercise_id),
        name: ex.name,
        primaryMuscle: ex.primary_muscle,
        difficulty: ex.difficulty,
        timesPerDay: String(ex.times_per_day),
        doneToday: "0",
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

  if (error) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      </ThemedView>
    );
  }

  // ---- Empty state: no plan yet ------------------------------------------
  if (!plan) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="title" style={styles.emptyTitle}>
          No workout plan yet
        </ThemedText>
        <ThemedText style={styles.hint}>
          Build one in seconds — we&apos;ll tailor it to your goals and equipment.
        </ThemedText>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: tint }]}
          onPress={() => router.push("/(tabs)/plan/generate" as any)}
          activeOpacity={0.85}
        >
          <ThemedText style={styles.primaryBtnText}>Generate My Plan</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  const today = todayKey();

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedView style={styles.headerRow}>
          <ThemedView style={styles.headerTextCol}>
            <ThemedText type="title">{plan.title}</ThemedText>
            {plan.subtitle ? (
              <ThemedText style={styles.subtitle}>{plan.subtitle}</ThemedText>
            ) : null}
          </ThemedView>
          <ThemedView style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerBtn, { borderColor: tint }]}
              onPress={() => router.push("/(tabs)/plan/edit" as any)}
              activeOpacity={0.8}
            >
              <ThemedText style={[styles.headerBtnText, { color: tint }]}>Edit</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerBtn, { borderColor: tint }]}
              onPress={() => router.push("/(tabs)/plan/generate" as any)}
              activeOpacity={0.8}
            >
              <ThemedText style={[styles.headerBtnText, { color: tint }]}>Regenerate</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </ThemedView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {DAYS.map((day) => {
          const entries = plan.schedule[day] ?? [];
          const isRest = entries.length === 0;
          const isToday = day === today;
          return (
            <Pressable
              key={day}
              onPress={() => setExpandedDay(expandedDay === day ? null : day)}
              style={({ pressed }) => [
                styles.dayCard,
                isToday && { borderColor: tint, borderWidth: 2 },
                pressed && styles.dayCardPressed,
              ]}
            >
              <ThemedView style={styles.dayHeader}>
                <ThemedView style={styles.dayTitleRow}>
                  <ThemedText type="defaultSemiBold">{DAY_LABELS[day]}</ThemedText>
                  {isToday && (
                    <ThemedView
                      style={[
                        styles.todayBadge,
                        { backgroundColor: tint + "22", borderColor: tint },
                      ]}
                    >
                      <ThemedText style={[styles.todayText, { color: tint }]}>Today</ThemedText>
                    </ThemedView>
                  )}
                </ThemedView>
                {isRest ? (
                  <ThemedView style={styles.restBadge}>
                    <ThemedText style={styles.restText}>Rest</ThemedText>
                  </ThemedView>
                ) : (
                  <ThemedText style={styles.exerciseCount}>
                    {entries.length} exercises
                  </ThemedText>
                )}
              </ThemedView>

              {expandedDay === day && !isRest && (
                <ThemedView style={styles.exerciseList}>
                  {entries.map((ex, i) => (
                    <ThemedView key={`${ex.exercise_id}-${i}`} style={styles.exerciseRow}>
                      <ThemedView style={styles.exerciseInfo}>
                        <ThemedText type="defaultSemiBold">{ex.name}</ThemedText>
                        <ThemedText style={styles.muscleText}>{ex.primary_muscle}</ThemedText>
                      </ThemedView>
                      <ThemedView style={styles.exerciseRight}>
                        <ThemedText style={styles.durationLabel}>
                          {ex.times_per_day}x · {Math.round(ex.duration_seconds / 60)} min
                        </ThemedText>
                        {isToday && (
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
                  ))}
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
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 12 },
  errorText: { fontSize: 16, textAlign: "center", opacity: 0.8 },
  hint: { opacity: 0.75, textAlign: "center" },

  emptyTitle: { textAlign: "center" },
  primaryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },

  header: { paddingBottom: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  headerTextCol: { flex: 1, gap: 6 },
  headerActions: { flexDirection: "row", gap: 8 },
  headerBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  headerBtnText: { fontSize: 13, fontWeight: "700" },

  subtitle: { opacity: 0.75 },

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
