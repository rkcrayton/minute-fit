import { router } from "expo-router";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  useColorScheme,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "@/contexts/auth";

export default function Register() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const { register } = useAuth();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const bg = isDark ? "#0B0B0F" : "#FFFFFF";
  const text = isDark ? "#FFFFFF" : "#111111";
  const subtext = isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)";
  const inputBg = isDark ? "#1C1C1E" : "#F2F2F7";

  async function handleRegister() {
    if (!email || !username || !password || !confirmPassword) {
      Alert.alert("Missing fields", "Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Passwords don't match", "Please make sure your passwords match.");
      return;
    }

    setLoading(true);
    try {
      await register({ email, username, password });
      router.push("/(onboarding)/profile" as any);
    } catch (error: any) {
      const message =
        error.response?.data?.detail || "Something went wrong. Please try again.";
      Alert.alert("Registration failed", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: text }]}>Create account</Text>
        <Text style={[styles.subtitle, { color: subtext }]}>
          Sign up to get your personalized plan
        </Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={[styles.input, { backgroundColor: inputBg, color: text }]}
          placeholder="Email"
          placeholderTextColor={subtext}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={[styles.input, { backgroundColor: inputBg, color: text }]}
          placeholder="Username"
          placeholderTextColor={subtext}
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={[styles.input, { backgroundColor: inputBg, color: text }]}
          placeholder="Password"
          placeholderTextColor={subtext}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={[styles.input, { backgroundColor: inputBg, color: text }]}
          placeholder="Confirm Password"
          placeholderTextColor={subtext}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <Pressable
          style={[styles.primaryBtn, { backgroundColor: "#3B82F6" }]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryText}>Sign Up</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.bottom}>
        <Pressable onPress={() => router.replace("/(onboarding)/login" as any)}>
          <Text style={[styles.linkText, { color: subtext }]}>
            Already have an account?{" "}
            <Text style={{ color: "#3B82F6", fontWeight: "700" }}>Log In</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "space-between" },
  header: { marginTop: 60, gap: 8 },
  title: { fontSize: 28, fontWeight: "900" },
  subtitle: { fontSize: 16, lineHeight: 22 },
  form: { gap: 14 },
  input: {
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
  },
  primaryBtn: { padding: 16, borderRadius: 14, alignItems: "center" },
  primaryText: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },
  bottom: { paddingBottom: 24, alignItems: "center" },
  linkText: { fontSize: 14 },
});