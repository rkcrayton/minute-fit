import { router } from "expo-router";
import React from "react";
import { View, Text, Pressable, StyleSheet, useColorScheme } from "react-native";
import { useOnboarding } from "@/contexts/onboarding";

export default function ScanIntro() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const { setOnboarded } = useOnboarding();

  const bg = isDark ? "#0B0B0F" : "#FFFFFF";
  const text = isDark ? "#FFFFFF" : "#111111";
  const subtext = isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)";
  const border = isDark ? "rgba(255,255,255,0.15)" : "#DDDDDD";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#FAFAFA";

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: text }]}>
          1-Minute Body Scan
        </Text>
        <Text style={[styles.subtitle, { color: subtext }]}>
          Let&#39;s see how you move. We&#39;ll guide you through a quick recording so
          we can build your personalized plan.
        </Text>

        <View
          style={[styles.card, { borderColor: border, backgroundColor: cardBg }]}
        >
          <Text style={[styles.cardTitle, { color: text }]}>What you&#39;ll do</Text>
          <Text style={[styles.cardItem, { color: isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.75)" }]}>
            • Stand still (10s)
          </Text>
          <Text style={[styles.cardItem, { color: isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.75)" }]}>
            • 3 squats (20s)
          </Text>
          <Text style={[styles.cardItem, { color: isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.75)" }]}>
            • Arm raise (20s)
          </Text>
          <Text style={[styles.cardItem, { color: isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.75)" }]}>
            • Finish + analyze (10s)
          </Text>
        </View>
      </View>

      <View style={styles.bottom}>
        <Pressable
          style={[styles.primaryBtn, { backgroundColor: "#3B82F6" }]}
          onPress={() => router.push("/(onboarding)/scan-setup" as any)}
        >
          <Text style={styles.primaryText}>Start Scan</Text>
        </Pressable>
        <Pressable
          style={styles.skipBtn}
          onPress={() => {
            setOnboarded(true);
            router.replace("/(tabs)" as any);
          }}
        >
          <Text style={[styles.skipText, { color: subtext }]}>Skip for now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "space-between" },
  content: { flex: 1, justifyContent: "center", gap: 14 },
  title: { fontSize: 28, fontWeight: "900" },
  subtitle: { fontSize: 15, lineHeight: 22 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8, marginTop: 4 },
  cardTitle: { fontWeight: "900", marginBottom: 2 },
  cardItem: { fontSize: 15, lineHeight: 20 },
  bottom: { paddingBottom: 24 },
  primaryBtn: { padding: 16, borderRadius: 14, alignItems: "center" },
  primaryText: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },
  skipBtn: { padding: 16, alignItems: "center", marginTop: 12 },
  skipText: { fontWeight: "700", fontSize: 16 },
});
