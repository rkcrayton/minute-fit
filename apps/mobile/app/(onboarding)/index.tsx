import { router } from "expo-router";
import React from "react";
import { View, Text, Pressable, StyleSheet, useColorScheme } from "react-native";

export default function Welcome() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const bg = isDark ? "#0B0B0F" : "#FFFFFF";
  const text = isDark ? "#FFFFFF" : "#111111";
  const subtext = isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)";

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.hero}>
        <Text style={[styles.logo, { color: "#3B82F6" }]}>GottaMinute</Text>
        <Text style={[styles.title, { color: text }]}>
          Move better in{"\n"}just one minute a day.
        </Text>
        <Text style={[styles.subtitle, { color: subtext }]}>
          We&#39;ll learn a bit about you, run a quick body scan, and build a
          personalized plan.
        </Text>
      </View>

      <View style={styles.bottom}>
        <Pressable
          style={[styles.primaryBtn, { backgroundColor: "#3B82F6" }]}
          onPress={() => router.push("/(onboarding)/register" as any)}
        >
          <Text style={styles.primaryText}>Get Started</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => router.push("/(onboarding)/login" as any)}
        >
          <Text style={[styles.secondaryText, { color: "#3B82F6" }]}>
            I already have an account
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "space-between" },
  hero: { flex: 1, justifyContent: "center", gap: 14 },
  logo: { fontSize: 16, fontWeight: "900", letterSpacing: 1 },
  title: { fontSize: 32, fontWeight: "900", lineHeight: 40 },
  subtitle: { fontSize: 16, lineHeight: 22 },
  bottom: { paddingBottom: 24 },
  primaryBtn: { padding: 16, borderRadius: 14, alignItems: "center" },
  primaryText: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },
  secondaryBtn: { padding: 16, alignItems: "center", marginTop: 12 },
  secondaryText: { fontWeight: "700", fontSize: 16 },
});
