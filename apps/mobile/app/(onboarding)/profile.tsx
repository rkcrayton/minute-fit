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
import { useAuth } from "@/contexts/auth";
import { useOnboarding } from "@/contexts/onboarding";

export default function Profile() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const { setUserProfile } = useOnboarding();
  const { updateProfile } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");

  const bg = isDark ? "#0B0B0F" : "#FFFFFF";
  const text = isDark ? "#FFFFFF" : "#111111";
  const subtext = isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)";
  const border = isDark ? "rgba(255,255,255,0.15)" : "#DDDDDD";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#F5F5F5";

  const canContinue =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    heightFeet.trim().length > 0 &&
    heightInches.trim().length > 0 &&
    weight.trim().length > 0 &&
    age.trim().length > 0;
    
  const handleContinue = async () => {
    setUserProfile({ firstName: firstName.trim(), lastName: lastName.trim(), heightFeet, heightInches, weight, age });

    // Convert height to total inches and send to backend
    const totalInches =
      parseInt(heightFeet) * 12 + parseInt(heightInches);

    try {
      await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        height: totalInches,
        weight: parseFloat(weight),
        age: parseInt(age, 10),
      });
    } catch (error) {
      console.warn("Failed to save profile to server:", error);
    }

    router.replace("/(tabs)" as any)
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

        {/* First Name */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: text }]}>First Name</Text>
          <TextInput
            style={[
              styles.input,
              { color: text, borderColor: border, backgroundColor: inputBg },
            ]}
            placeholder="First name"
            placeholderTextColor={subtext}
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            returnKeyType="next"
          />
        </View>

        {/* Last Name */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: text }]}>Last Name</Text>
          <TextInput
            style={[
              styles.input,
              { color: text, borderColor: border, backgroundColor: inputBg },
            ]}
            placeholder="Last name"
            placeholderTextColor={subtext}
            value={lastName}
            onChangeText={setLastName}
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
        
        {/* Age */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: text }]}>Age</Text>
          <View style={styles.weightRow}>
            <TextInput
              style={[
                styles.input,
                styles.flex,
                { color: text, borderColor: border, backgroundColor: inputBg },
              ]}
              placeholder="years"
              placeholderTextColor={subtext}
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              maxLength={2}
              returnKeyType="done"
            />
            <Text style={[styles.unit, { color: subtext }]}>yrs</Text>
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
