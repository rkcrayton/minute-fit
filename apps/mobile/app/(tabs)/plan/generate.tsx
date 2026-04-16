import React, { useState } from "react";
import {
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { generatePlan, type GenerationPrefs } from "@/services/workout-plans";

const DAYS_OPTIONS = [3, 4, 5, 6, 7];
const MINUTES_OPTIONS = [15, 30, 45, 60];

const EQUIPMENT_OPTIONS = [
  { value: "bodyweight", label: "Bodyweight" },
  { value: "dumbbell", label: "Dumbbell" },
  { value: "barbell", label: "Barbell" },
  { value: "machine", label: "Machine" },
  { value: "resistance-band", label: "Band" },
];

type Props = {
  /** onSuccess defaults to navigating to the plan tab. Useful for onboarding reuse. */
  onSuccess?: () => void;
  /** Hide the back button (for onboarding usage). */
  hideBack?: boolean;
  /** Whether to render a "Skip" secondary action (onboarding only). */
  onSkip?: () => void;
};

export function GeneratePlanForm({ onSuccess, hideBack = false, onSkip }: Props) {
  const tint = useThemeColor({}, "tint");
  const textColor = useThemeColor({}, "text");

  const [days, setDays] = useState<number>(4);
  const [minutes, setMinutes] = useState<number>(30);
  const [equipment, setEquipment] = useState<string[]>(["bodyweight"]);
  const [avoid, setAvoid] = useState<string>("");
  const [goal, setGoal] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);

  const toggleEquipment = (val: string) => {
    setEquipment((cur) =>
      cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val]
    );
  };

  const handleGenerate = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const prefs: GenerationPrefs = {
        days_per_week: days,
        minutes_per_session: minutes,
        equipment,
        avoid: avoid.trim() || undefined,
        goal: goal.trim() || undefined,
      };
      await generatePlan(prefs);
      if (onSuccess) {
        onSuccess();
      } else {
        router.replace("/(tabs)/plan" as any);
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "Couldn't generate a plan. Try again.";
      Alert.alert("Generation failed", detail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedText type="title">Build your plan</ThemedText>
        <ThemedText style={styles.subtitle}>
          Tell us a bit about how you like to train. We&apos;ll compose a week just for you.
        </ThemedText>

        <ThemedText style={styles.label}>Days per week</ThemedText>
        <ThemedView style={styles.chipRow}>
          {DAYS_OPTIONS.map((d) => {
            const selected = days === d;
            return (
              <Pressable
                key={d}
                onPress={() => setDays(d)}
                style={[
                  styles.chip,
                  selected && { backgroundColor: tint, borderColor: tint },
                ]}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    selected && { color: "#FFFFFF" },
                  ]}
                >
                  {d}
                </ThemedText>
              </Pressable>
            );
          })}
        </ThemedView>

        <ThemedText style={styles.label}>Minutes per session</ThemedText>
        <ThemedView style={styles.chipRow}>
          {MINUTES_OPTIONS.map((m) => {
            const selected = minutes === m;
            return (
              <Pressable
                key={m}
                onPress={() => setMinutes(m)}
                style={[
                  styles.chip,
                  selected && { backgroundColor: tint, borderColor: tint },
                ]}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    selected && { color: "#FFFFFF" },
                  ]}
                >
                  {m}
                </ThemedText>
              </Pressable>
            );
          })}
        </ThemedView>

        <ThemedText style={styles.label}>Equipment</ThemedText>
        <ThemedView style={styles.chipRow}>
          {EQUIPMENT_OPTIONS.map((opt) => {
            const selected = equipment.includes(opt.value);
            return (
              <Pressable
                key={opt.value}
                onPress={() => toggleEquipment(opt.value)}
                style={[
                  styles.chip,
                  selected && { backgroundColor: tint, borderColor: tint },
                ]}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    selected && { color: "#FFFFFF" },
                  ]}
                >
                  {opt.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ThemedView>

        <ThemedText style={styles.label}>Avoid / restrictions</ThemedText>
        <TextInput
          value={avoid}
          onChangeText={setAvoid}
          placeholder="e.g. no jumping, bad knees"
          placeholderTextColor="rgba(150,150,150,0.6)"
          style={[styles.input, { color: textColor }]}
        />

        <ThemedText style={styles.label}>Goal (optional)</ThemedText>
        <TextInput
          value={goal}
          onChangeText={setGoal}
          placeholder="Leave blank to use your profile goal"
          placeholderTextColor="rgba(150,150,150,0.6)"
          style={[styles.input, { color: textColor }]}
        />

        <Pressable
          onPress={handleGenerate}
          disabled={submitting}
          style={[
            styles.primaryBtn,
            { backgroundColor: tint },
            submitting && styles.disabled,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.primaryBtnText}>Generate</ThemedText>
          )}
        </Pressable>

        {onSkip ? (
          <Pressable onPress={onSkip} style={styles.skipBtn} disabled={submitting}>
            <ThemedText style={styles.skipText}>Skip for now</ThemedText>
          </Pressable>
        ) : !hideBack ? (
          <Pressable onPress={() => router.back()} style={styles.skipBtn} disabled={submitting}>
            <ThemedText style={styles.skipText}>Cancel</ThemedText>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function GeneratePlanScreen() {
  return (
    <ThemedView style={{ flex: 1 }}>
      <GeneratePlanForm />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20, gap: 12, paddingBottom: 48 },
  subtitle: { opacity: 0.75, marginBottom: 8 },
  label: { fontWeight: "700", fontSize: 14, marginTop: 8 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(150,150,150,0.3)",
  },
  chipText: { fontSize: 14, fontWeight: "600" },

  input: {
    borderWidth: 1,
    borderColor: "rgba(150,150,150,0.3)",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
  },

  primaryBtn: {
    marginTop: 20,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
  disabled: { opacity: 0.6 },

  skipBtn: { alignItems: "center", marginTop: 4, paddingVertical: 12 },
  skipText: { opacity: 0.7, fontSize: 14 },
});
