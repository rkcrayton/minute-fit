import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  TouchableOpacity,
  View,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  getMyPlan,
  putMyPlan,
  DAYS,
  type Day,
  type PlanEntry,
  type WorkoutPlan,
  type PlanEntryEnriched,
  type ExerciseLibraryItem,
} from "@/services/workout-plans";
import { GeneratePlanForm } from "./generate";
import { ExerciseLibrarySheet } from "@/components/plan/exercise-library-sheet";

const DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const DAY_LABELS_SHORT: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

function todayKey(): string {
  return new Date()
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();
}

type ViewMode = "plan" | "generate" | "edit";

// ---- Editor helpers (from edit.tsx) -----------------------------------------

type EditorSchedule = Record<Day, PlanEntryEnriched[]>;

function toEditorSchedule(plan: WorkoutPlan): EditorSchedule {
  const out: EditorSchedule = {
    monday: [], tuesday: [], wednesday: [], thursday: [],
    friday: [], saturday: [], sunday: [],
  };
  for (const d of DAYS) {
    out[d] = (plan.schedule[d] ?? []).map((e, i) => ({ ...e, order: i }));
  }
  return out;
}

function toPayloadSchedule(sched: EditorSchedule): Record<string, PlanEntry[]> {
  const out: Record<string, PlanEntry[]> = {};
  for (const d of DAYS) {
    out[d] = sched[d].map((e, i) => ({
      exercise_id: e.exercise_id,
      times_per_day: e.times_per_day,
      duration_seconds: e.duration_seconds,
      order: i,
    }));
  }
  return out;
}

// ---- EntryEditorModal (from edit.tsx) ---------------------------------------

type EntryEditorProps = {
  entry: PlanEntryEnriched;
  tint: string;
  textColor: string;
  onClose: () => void;
  onSave: (updated: { times_per_day: number; duration_seconds: number }) => void;
};

function EntryEditorModal({ entry, tint, textColor, onClose, onSave }: EntryEditorProps) {
  const [times, setTimes] = useState(String(entry.times_per_day));
  const [seconds, setSeconds] = useState(String(entry.duration_seconds));

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={editStyles.modalBackdrop}>
        <ThemedView style={editStyles.modalCard}>
          <ThemedText type="defaultSemiBold" style={{ marginBottom: 8 }}>
            {entry.name}
          </ThemedText>

          <ThemedText style={editStyles.label}>Times per day</ThemedText>
          <TextInput
            value={times}
            onChangeText={setTimes}
            keyboardType="number-pad"
            style={[editStyles.input, { color: textColor }]}
          />

          <ThemedText style={editStyles.label}>Duration (seconds)</ThemedText>
          <TextInput
            value={seconds}
            onChangeText={setSeconds}
            keyboardType="number-pad"
            style={[editStyles.input, { color: textColor }]}
          />

          <View style={editStyles.modalActions}>
            <TouchableOpacity onPress={onClose} style={editStyles.modalBtn}>
              <ThemedText>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[editStyles.modalBtn, { backgroundColor: tint }]}
              onPress={() => {
                const t = parseInt(times, 10) || 1;
                const s = parseInt(seconds, 10) || 60;
                onSave({
                  times_per_day: Math.max(1, Math.min(12, t)),
                  duration_seconds: Math.max(5, Math.min(3600, s)),
                });
              }}
            >
              <ThemedText style={{ color: "#FFFFFF", fontWeight: "700" }}>Save</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

// ---- PlanEditor component ---------------------------------------------------

type PlanEditorProps = {
  plan: WorkoutPlan;
  onDone: () => void;
  onCancel: () => void;
};

function PlanEditor({ plan, onDone, onCancel }: PlanEditorProps) {
  const tint = useThemeColor({}, "tint");
  const textColor = useThemeColor({}, "text");

  const [schedule, setSchedule] = useState<EditorSchedule>(() => toEditorSchedule(plan));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Day>("monday");

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<{ day: Day; index: number } | null>(null);

  const markDirty = () => setDirty(true);

  const updateDay = (day: Day, next: PlanEntryEnriched[]) => {
    setSchedule((cur) => ({ ...cur, [day]: next }));
    markDirty();
  };

  const handleRemove = (day: Day, index: number) => {
    const next = schedule[day].filter((_, i) => i !== index);
    updateDay(day, next);
  };

  const handleReorder = (day: Day, index: number, dir: -1 | 1) => {
    const list = [...schedule[day]];
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    updateDay(day, list);
  };

  const handleAdd = (ex: ExerciseLibraryItem) => {
    setLibraryOpen(false);
    const next: PlanEntryEnriched = {
      exercise_id: ex.id,
      times_per_day: 3,
      duration_seconds: 60,
      order: schedule[selectedDay].length,
      name: ex.name,
      primary_muscle: ex.primary_muscle,
      difficulty: ex.difficulty,
      equipment: ex.equipment,
      image_url: ex.image_url,
    };
    updateDay(selectedDay, [...schedule[selectedDay], next]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await putMyPlan({
        title: plan.title,
        subtitle: plan.subtitle ?? null,
        schedule: toPayloadSchedule(schedule),
      });
      onDone();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "Couldn't save your plan.";
      Alert.alert("Save failed", detail);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!dirty) {
      onCancel();
      return;
    }
    Alert.alert(
      "Discard changes?",
      "Your unsaved edits will be lost.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: onCancel,
        },
      ],
    );
  };

  const current = schedule[selectedDay];

  return (
    <ThemedView style={editStyles.container}>
      <View style={editStyles.headerRow}>
        <TouchableOpacity onPress={handleDiscard}>
          <ThemedText style={[editStyles.linkText, { color: tint }]}>Cancel</ThemedText>
        </TouchableOpacity>
        <ThemedText type="defaultSemiBold">Edit plan</ThemedText>
        <TouchableOpacity onPress={handleSave} disabled={saving || !dirty}>
          <ThemedText
            style={[
              editStyles.linkText,
              { color: dirty ? tint : "rgba(150,150,150,0.6)" },
            ]}
          >
            {saving ? "Saving\u2026" : "Save"}
          </ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={editStyles.dayTabs}
      >
        {DAYS.map((d) => {
          const selected = selectedDay === d;
          return (
            <Pressable
              key={d}
              onPress={() => setSelectedDay(d)}
              style={[
                editStyles.dayTab,
                selected && { backgroundColor: tint, borderColor: tint },
              ]}
            >
              <ThemedText
                style={[
                  editStyles.dayTabText,
                  selected && { color: "#FFFFFF" },
                ]}
              >
                {DAY_LABELS_SHORT[d]}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={editStyles.list}>
        {current.length === 0 ? (
          <ThemedText style={editStyles.emptyText}>
            Rest day. Add exercises below to make this a training day.
          </ThemedText>
        ) : (
          current.map((ex, i) => (
            <ThemedView key={`${ex.exercise_id}-${i}`} style={editStyles.entryRow}>
              <View style={editStyles.orderControls}>
                <TouchableOpacity
                  disabled={i === 0}
                  onPress={() => handleReorder(selectedDay, i, -1)}
                >
                  <ThemedText style={[editStyles.arrow, i === 0 && editStyles.arrowDisabled]}>
                    ▲
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={i === current.length - 1}
                  onPress={() => handleReorder(selectedDay, i, 1)}
                >
                  <ThemedText
                    style={[editStyles.arrow, i === current.length - 1 && editStyles.arrowDisabled]}
                  >
                    ▼
                  </ThemedText>
                </TouchableOpacity>
              </View>

              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold">{ex.name}</ThemedText>
                <ThemedText style={editStyles.meta}>
                  {ex.primary_muscle} · {ex.times_per_day}x · {ex.duration_seconds}s
                </ThemedText>
              </View>

              <TouchableOpacity
                style={[editStyles.smallBtn, { borderColor: tint }]}
                onPress={() => setEditEntry({ day: selectedDay, index: i })}
              >
                <ThemedText style={[editStyles.smallBtnText, { color: tint }]}>Edit</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={editStyles.removeBtn}
                onPress={() => handleRemove(selectedDay, i)}
              >
                <ThemedText style={editStyles.removeText}>×</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          ))
        )}

        <TouchableOpacity
          style={[editStyles.addBtn, { borderColor: tint }]}
          onPress={() => setLibraryOpen(true)}
        >
          <ThemedText style={[editStyles.addBtnText, { color: tint }]}>+ Add exercise</ThemedText>
        </TouchableOpacity>
      </ScrollView>

      <ExerciseLibrarySheet
        visible={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={handleAdd}
      />

      {editEntry ? (
        <EntryEditorModal
          entry={schedule[editEntry.day][editEntry.index]}
          textColor={textColor}
          tint={tint}
          onClose={() => setEditEntry(null)}
          onSave={(updated) => {
            const list = [...schedule[editEntry.day]];
            list[editEntry.index] = { ...list[editEntry.index], ...updated };
            updateDay(editEntry.day, list);
            setEditEntry(null);
          }}
        />
      ) : null}
    </ThemedView>
  );
}

// ---- Main screen ------------------------------------------------------------

export default function PlanIndex() {
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("plan");

  const tint = useThemeColor({}, "tint");

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyPlan();
      setPlan(data);
      if (data) setExpandedDay(todayKey());
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(detail || "Failed to load plan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function load() {
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
      load();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const handleGenerateSuccess = async () => {
    await fetchPlan();
    setView("plan");
  };

  const handleEditDone = async () => {
    await fetchPlan();
    setView("plan");
  };

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

  // ---- Generate view --------------------------------------------------------
  if (view === "generate") {
    return (
      <ThemedView style={{ flex: 1 }}>
        <GeneratePlanForm
          onSuccess={handleGenerateSuccess}
          hideBack
          onCancel={() => setView("plan")}
        />
      </ThemedView>
    );
  }

  // ---- Edit view ------------------------------------------------------------
  if (view === "edit" && plan) {
    return (
      <PlanEditor
        plan={plan}
        onDone={handleEditDone}
        onCancel={() => setView("plan")}
      />
    );
  }

  // ---- Loading state --------------------------------------------------------
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

  // ---- Empty state: no plan yet ---------------------------------------------
  if (!plan) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <GeneratePlanForm onSuccess={handleGenerateSuccess} hideBack />
      </ThemedView>
    );
  }

  // ---- Plan view ------------------------------------------------------------
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
              onPress={() => setView("edit")}
              activeOpacity={0.8}
            >
              <ThemedText style={[styles.headerBtnText, { color: tint }]}>Edit</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerBtn, { borderColor: tint }]}
              onPress={() => setView("generate")}
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

// ---- Plan view styles -------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 12 },
  errorText: { fontSize: 16, textAlign: "center", opacity: 0.8 },

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

// ---- Edit view styles -------------------------------------------------------

const editStyles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  linkText: { fontWeight: "700", fontSize: 15 },

  dayTabs: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  dayTab: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(150,150,150,0.3)",
  },
  dayTabText: { fontSize: 13, fontWeight: "600" },

  list: { gap: 10, paddingBottom: 40 },
  emptyText: { opacity: 0.65, textAlign: "center", marginTop: 24 },

  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(150,150,150,0.2)",
  },
  orderControls: { gap: 2 },
  arrow: { fontSize: 14, opacity: 0.8 },
  arrowDisabled: { opacity: 0.25 },
  meta: { fontSize: 12, opacity: 0.65 },

  smallBtn: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  smallBtnText: { fontSize: 12, fontWeight: "700" },

  removeBtn: { paddingHorizontal: 6 },
  removeText: { fontSize: 20, color: "#E11D48", fontWeight: "700" },

  addBtn: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  addBtnText: { fontWeight: "700", fontSize: 15 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: { borderRadius: 16, padding: 20, gap: 8 },
  label: { fontWeight: "700", fontSize: 13, marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(150,150,150,0.3)",
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 14 },
  modalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
});
