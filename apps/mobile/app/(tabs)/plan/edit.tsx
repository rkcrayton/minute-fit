import React, { useCallback, useEffect, useState } from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  View,
  Alert,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  getMyPlan,
  putMyPlan,
  DAYS,
  type Day,
  type PlanEntry,
  type PlanEntryEnriched,
  type WorkoutPlan,
  type ExerciseLibraryItem,
} from "@/services/workout-plans";
import { ExerciseLibrarySheet } from "@/components/plan/exercise-library-sheet";

const DAY_LABELS: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

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

export default function EditPlanScreen() {
  const tint = useThemeColor({}, "tint");
  const textColor = useThemeColor({}, "text");

  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [schedule, setSchedule] = useState<EditorSchedule | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Day>("monday");

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<{ day: Day; index: number } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function fetchPlan() {
        setLoading(true);
        try {
          const data = await getMyPlan();
          if (!cancelled) {
            if (data) {
              setPlan(data);
              setSchedule(toEditorSchedule(data));
            } else {
              setPlan(null);
              setSchedule(null);
            }
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      fetchPlan();
      return () => { cancelled = true; };
    }, [])
  );

  const markDirty = () => setDirty(true);

  const updateDay = (day: Day, next: PlanEntryEnriched[]) => {
    setSchedule((cur) => (cur ? { ...cur, [day]: next } : cur));
    markDirty();
  };

  const handleRemove = (day: Day, index: number) => {
    if (!schedule) return;
    const next = schedule[day].filter((_, i) => i !== index);
    updateDay(day, next);
  };

  const handleReorder = (day: Day, index: number, dir: -1 | 1) => {
    if (!schedule) return;
    const list = [...schedule[day]];
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    updateDay(day, list);
  };

  const handleAdd = (ex: ExerciseLibraryItem) => {
    if (!schedule) return;
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
    if (!schedule || !plan) return;
    setSaving(true);
    try {
      const res = await putMyPlan({
        title: plan.title,
        subtitle: plan.subtitle ?? null,
        schedule: toPayloadSchedule(schedule),
      });
      setPlan(res);
      setSchedule(toEditorSchedule(res));
      setDirty(false);
      router.replace("/(tabs)/plan" as any);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "Couldn't save your plan.";
      Alert.alert("Save failed", detail);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!dirty) {
      router.back();
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
          onPress: () => {
            if (plan) setSchedule(toEditorSchedule(plan));
            setDirty(false);
            router.back();
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (!plan || !schedule) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>No plan to edit yet.</ThemedText>
        <TouchableOpacity onPress={() => router.replace("/(tabs)/plan" as any)}>
          <ThemedText style={[styles.linkText, { color: tint }]}>Back</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  const current = schedule[selectedDay];

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={handleDiscard}>
          <ThemedText style={[styles.linkText, { color: tint }]}>Cancel</ThemedText>
        </TouchableOpacity>
        <ThemedText type="defaultSemiBold">Edit plan</ThemedText>
        <TouchableOpacity onPress={handleSave} disabled={saving || !dirty}>
          <ThemedText
            style={[
              styles.linkText,
              { color: dirty ? tint : "rgba(150,150,150,0.6)" },
            ]}
          >
            {saving ? "Saving…" : "Save"}
          </ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayTabs}
      >
        {DAYS.map((d) => {
          const selected = selectedDay === d;
          return (
            <Pressable
              key={d}
              onPress={() => setSelectedDay(d)}
              style={[
                styles.dayTab,
                selected && { backgroundColor: tint, borderColor: tint },
              ]}
            >
              <ThemedText
                style={[
                  styles.dayTabText,
                  selected && { color: "#FFFFFF" },
                ]}
              >
                {DAY_LABELS[d]}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list}>
        {current.length === 0 ? (
          <ThemedText style={styles.emptyText}>
            Rest day. Add exercises below to make this a training day.
          </ThemedText>
        ) : (
          current.map((ex, i) => (
            <ThemedView key={`${ex.exercise_id}-${i}`} style={styles.entryRow}>
              <View style={styles.orderControls}>
                <TouchableOpacity
                  disabled={i === 0}
                  onPress={() => handleReorder(selectedDay, i, -1)}
                >
                  <ThemedText style={[styles.arrow, i === 0 && styles.arrowDisabled]}>▲</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={i === current.length - 1}
                  onPress={() => handleReorder(selectedDay, i, 1)}
                >
                  <ThemedText
                    style={[styles.arrow, i === current.length - 1 && styles.arrowDisabled]}
                  >
                    ▼
                  </ThemedText>
                </TouchableOpacity>
              </View>

              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold">{ex.name}</ThemedText>
                <ThemedText style={styles.meta}>
                  {ex.primary_muscle} · {ex.times_per_day}x · {ex.duration_seconds}s
                </ThemedText>
              </View>

              <TouchableOpacity
                style={[styles.smallBtn, { borderColor: tint }]}
                onPress={() => setEditEntry({ day: selectedDay, index: i })}
              >
                <ThemedText style={[styles.smallBtnText, { color: tint }]}>Edit</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => handleRemove(selectedDay, i)}
              >
                <ThemedText style={styles.removeText}>×</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          ))
        )}

        <TouchableOpacity
          style={[styles.addBtn, { borderColor: tint }]}
          onPress={() => setLibraryOpen(true)}
        >
          <ThemedText style={[styles.addBtnText, { color: tint }]}>+ Add exercise</ThemedText>
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
      <View style={styles.modalBackdrop}>
        <ThemedView style={styles.modalCard}>
          <ThemedText type="defaultSemiBold" style={{ marginBottom: 8 }}>
            {entry.name}
          </ThemedText>

          <ThemedText style={styles.label}>Times per day</ThemedText>
          <TextInput
            value={times}
            onChangeText={setTimes}
            keyboardType="number-pad"
            style={[styles.input, { color: textColor }]}
          />

          <ThemedText style={styles.label}>Duration (seconds)</ThemedText>
          <TextInput
            value={seconds}
            onChangeText={setSeconds}
            keyboardType="number-pad"
            style={[styles.input, { color: textColor }]}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose} style={styles.modalBtn}>
              <ThemedText>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: tint }]}
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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
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
