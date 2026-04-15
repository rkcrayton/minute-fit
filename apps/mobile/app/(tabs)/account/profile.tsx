import React, { useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Image,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { Camera } from "lucide-react-native";
import { useAuth } from "@/contexts/auth";
import { useAvatarPicker } from "@/hooks/use-avatar-picker";
import { getBaseURL } from "@/services/api";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

type GenderOption = "male" | "female" | "neutral";

export default function ProfileEditScreen() {
  const { user, token, updateProfile } = useAuth();
  const { showPicker, uploading } = useAvatarPicker();
  const backgroundColor = useThemeColor({}, "background");

  const avatarSource = user?.profile_picture
    ? { uri: `${getBaseURL()}/users/me/avatar`, headers: { Authorization: `Bearer ${token}` } }
    : require("@/assets/images/Todo.png");

  // Convert stored height (total inches) back to feet + inches for display
  const storedFeet = user?.height ? Math.floor(user.height / 12).toString() : "";
  const storedInches = user?.height ? (user.height % 12).toString() : "";

  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [age, setAge] = useState(user?.age?.toString() ?? "");
  const [heightFeet, setHeightFeet] = useState(storedFeet);
  const [heightInches, setHeightInches] = useState(storedInches);
  const [weight, setWeight] = useState(user?.weight?.toString() ?? "");
  const [gender, setGender] = useState<GenderOption | "">(
    (user?.gender as GenderOption) ?? ""
  );
  const [fitnessGoal, setFitnessGoal] = useState(user?.fitness_goal ?? "");
  const [saving, setSaving] = useState(false);

  const cardBg = useThemeColor({}, "surface");
  const borderColor = useThemeColor({}, "border");
  const inputBg = useThemeColor({}, "surfaceElevated");
  const textColor = useThemeColor({}, "text");
  const subtextColor = useThemeColor({}, "textSecondary");

  const genderOptions: { value: GenderOption; label: string }[] = [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "neutral", label: "Other" },
  ];

  const goalOptions = [
    "Lose weight",
    "Build muscle",
    "Stay active",
    "Improve endurance",
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      const totalInches =
        heightFeet && heightInches
          ? parseInt(heightFeet) * 12 + parseInt(heightInches)
          : undefined;

      await updateProfile({
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        age: age ? parseInt(age, 10) : undefined,
        height: totalInches,
        weight: weight ? parseFloat(weight) : undefined,
        gender: gender || undefined,
        fitness_goal: fitnessGoal || undefined,
      });

      Alert.alert("Saved", "Your profile has been updated.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <ThemedView
          style={[styles.card, { backgroundColor: cardBg, borderColor }, styles.avatarCard]}
        >
          <TouchableOpacity onPress={showPicker} activeOpacity={0.7} style={styles.avatarWrapper}>
            <View style={styles.avatarRing}>
              <Image source={avatarSource} style={styles.avatarImage} />
              <View style={styles.cameraOverlay}>
                <Camera size={16} color="#FFFFFF" />
              </View>
            </View>
            <ThemedText style={[styles.changePhotoText, { color: "#3B82F6" }]}>
              {uploading ? "Uploading..." : "Change Photo"}
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* Name */}
        <ThemedView
          style={[styles.card, { backgroundColor: cardBg, borderColor }]}
        >
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Personal Info
          </ThemedText>

          <View style={styles.field}>
            <ThemedText style={[styles.label, { color: subtextColor }]}>First Name</ThemedText>
            <TextInput
              style={[styles.input, { color: textColor, borderColor, backgroundColor: inputBg }]}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor={subtextColor}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={[styles.label, { color: subtextColor }]}>Last Name</ThemedText>
            <TextInput
              style={[styles.input, { color: textColor, borderColor, backgroundColor: inputBg }]}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor={subtextColor}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={[styles.label, { color: subtextColor }]}>Age</ThemedText>
            <TextInput
              style={[styles.input, { color: textColor, borderColor, backgroundColor: inputBg }]}
              value={age}
              onChangeText={setAge}
              placeholder="years"
              placeholderTextColor={subtextColor}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={[styles.label, { color: subtextColor }]}>Gender</ThemedText>
            <View style={styles.chipRow}>
              {genderOptions.map((opt) => {
                const selected = gender === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setGender(opt.value)}
                    style={[
                      styles.chip,
                      { borderColor },
                      selected && styles.chipSelected,
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                      ]}
                    >
                      {opt.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ThemedView>

        {/* Body Measurements */}
        <ThemedView
          style={[styles.card, { backgroundColor: cardBg, borderColor }]}
        >
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Body Measurements
          </ThemedText>

          <View style={styles.field}>
            <ThemedText style={[styles.label, { color: subtextColor }]}>Height</ThemedText>
            <View style={styles.row}>
              <View style={styles.rowItem}>
                <TextInput
                  style={[styles.input, styles.flex, { color: textColor, borderColor, backgroundColor: inputBg }]}
                  value={heightFeet}
                  onChangeText={setHeightFeet}
                  placeholder="ft"
                  placeholderTextColor={subtextColor}
                  keyboardType="number-pad"
                  maxLength={1}
                />
                <ThemedText style={[styles.unit, { color: subtextColor }]}>ft</ThemedText>
              </View>
              <View style={styles.rowItem}>
                <TextInput
                  style={[styles.input, styles.flex, { color: textColor, borderColor, backgroundColor: inputBg }]}
                  value={heightInches}
                  onChangeText={setHeightInches}
                  placeholder="in"
                  placeholderTextColor={subtextColor}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <ThemedText style={[styles.unit, { color: subtextColor }]}>in</ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.field}>
            <ThemedText style={[styles.label, { color: subtextColor }]}>Weight</ThemedText>
            <View style={styles.rowItem}>
              <TextInput
                style={[styles.input, styles.flex, { color: textColor, borderColor, backgroundColor: inputBg }]}
                value={weight}
                onChangeText={setWeight}
                placeholder="lbs"
                placeholderTextColor={subtextColor}
                keyboardType="number-pad"
                maxLength={3}
              />
              <ThemedText style={[styles.unit, { color: subtextColor }]}>lbs</ThemedText>
            </View>
          </View>
        </ThemedView>

        {/* Fitness Goal */}
        <ThemedView
          style={[styles.card, { backgroundColor: cardBg, borderColor }]}
        >
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Fitness Goal
          </ThemedText>

          <View style={styles.chipRow}>
            {goalOptions.map((goal) => {
              const selected = fitnessGoal === goal;
              return (
                <Pressable
                  key={goal}
                  onPress={() => setFitnessGoal(goal)}
                  style={[
                    styles.chip,
                    { borderColor },
                    selected && styles.chipSelected,
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      selected && styles.chipTextSelected,
                    ]}
                  >
                    {goal}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </ThemedView>

        {/* Save button */}
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, saving && { opacity: 0.5 }]}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.saveBtnText}>Save Changes</ThemedText>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  card: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
    opacity: 0.6,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  field: { marginBottom: 16 },
  label: { fontWeight: "600", fontSize: 13, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  row: { flexDirection: "row", gap: 12 },
  rowItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  unit: { fontWeight: "800", fontSize: 14 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  chipSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  chipText: { fontSize: 14, fontWeight: "600" },
  chipTextSelected: { color: "#FFFFFF" },
  saveBtn: {
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnText: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },
  avatarCard: { alignItems: "center" as const },
  avatarWrapper: { alignItems: "center" as const },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: "#3B82F6",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  avatarImage: { width: 90, height: 90, borderRadius: 45 },
  cameraOverlay: {
    position: "absolute" as const,
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#3B82F6",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  changePhotoText: { marginTop: 8, fontWeight: "600" as const, fontSize: 14 },
});