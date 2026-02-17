import { router } from "expo-router";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useOnboarding } from "@/contexts/onboarding";
import api from "@/services/api";

export default function Profile() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const { setUserProfile } = useOnboarding();

  const [name, setName] = useState("");
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [weight, setWeight] = useState("");

  const bg = isDark ? "#0B0B0F" : "#FFFFFF";
  const text = isDark ? "#FFFFFF" : "#111111";
  const subtext = isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)";
  const border = isDark ? "rgba(255,255,255,0.15)" : "#DDDDDD";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#F5F5F5";

  const canContinue =
    name.trim().length > 0 &&
    heightFeet.trim().length > 0 &&
    heightInches.trim().length > 0 &&
    weight.trim().length > 0;

  const handleContinue = async () => {
    setUserProfile({ name: name.trim(), heightFeet, heightInches, weight });

    // Convert height to total inches and send to backend
    const totalInches =
      parseInt(heightFeet) * 12 + parseInt(heightInches);

    try {
      await api.put("/users/me", {
        name: name.trim(),
        height: totalInches,
        weight: parseFloat(weight),
      });
    } catch (error) {
      console.warn("Failed to save profile to server:", error);
    }

    router.push("/(onboarding)/scan-intro" as any);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: text }]}>About you</Text>
        <Text style={[styles.subtitle, { color: subtext }]}>
          This helps us personalize your plan.
        </Text>

        {/* Name */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: text }]}>Name</Text>
          <TextInput
            style={[
              styles.input,
              { color: text, borderColor: border, backgroundColor: inputBg },
            ]}
            placeholder="Your first name"
            placeholderTextColor={subtext}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            returnKeyType="next"
          />
        </View>

        {/* Height */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: text }]}>Height</Text>
          <View style={styles.row}>
            <View style={styles.halfField}>
              <TextInput
                style={[
                  styles.input,
                  { color: text, borderColor: border, backgroundColor: inputBg },
                ]}
                placeholder="ft"
                placeholderTextColor={subtext}
                value={heightFeet}
                onChangeText={setHeightFeet}
                keyboardType="number-pad"
                maxLength={1}
                returnKeyType="next"
              />
              <Text style={[styles.unit, { color: subtext }]}>ft</Text>
            </View>
            <View style={styles.halfField}>
              <TextInput
                style={[
                  styles.input,
                  { color: text, borderColor: border, backgroundColor: inputBg },
                ]}
                placeholder="in"
                placeholderTextColor={subtext}
                value={heightInches}
                onChangeText={setHeightInches}
                keyboardType="number-pad"
                maxLength={2}
                returnKeyType="next"
              />
              <Text style={[styles.unit, { color: subtext }]}>in</Text>
            </View>
          </View>
        </View>

        {/* Weight */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: text }]}>Weight</Text>
          <View style={styles.weightRow}>
            <TextInput
              style={[
                styles.input,
                styles.flex,
                { color: text, borderColor: border, backgroundColor: inputBg },
              ]}
              placeholder="lbs"
              placeholderTextColor={subtext}
              value={weight}
              onChangeText={setWeight}
              keyboardType="number-pad"
              maxLength={3}
              returnKeyType="done"
            />
            <Text style={[styles.unit, { color: subtext }]}>lbs</Text>
          </View>
        </View>

        <Pressable
          disabled={!canContinue}
          style={[
            styles.primaryBtn,
            { backgroundColor: "#3B82F6" },
            !canContinue && styles.disabled,
          ]}
          onPress={handleContinue}
        >
          <Text style={styles.primaryText}>Continue</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 24, paddingTop: 60, gap: 8 },
  title: { fontSize: 28, fontWeight: "900" },
  subtitle: { fontSize: 15, lineHeight: 20, marginBottom: 12 },

  field: { gap: 6, marginBottom: 8 },
  label: { fontWeight: "800", fontSize: 14 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },

  row: { flexDirection: "row", gap: 12 },
  halfField: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  weightRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  unit: { fontWeight: "800", fontSize: 14 },

  primaryBtn: { padding: 16, borderRadius: 14, alignItems: "center", marginTop: 12 },
  primaryText: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },
  disabled: { opacity: 0.35 },
});
