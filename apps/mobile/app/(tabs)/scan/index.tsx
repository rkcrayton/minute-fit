import { router } from "expo-router";
import React from "react";
import { View, Text, Pressable, StyleSheet, useColorScheme } from "react-native";

export default function ScanIndex() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#0B0B0F" : "#FFFFFF" }]}>
      <Text style={[styles.title, { color: isDark ? "#FFFFFF" : "#111111" }]}>
        1-Minute Movement Scan
      </Text>

      <Text style={[styles.subtitle, { color: isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.65)" }]}>
        We’ll guide you through a quick scan and generate results (mock data for now).
      </Text>

      <Pressable
        style={[
          styles.primaryBtn,
          { backgroundColor: "#3B82F6" },
        ]}
        onPress={() => router.push("/(tabs)/scan/setup")}
      >
        <Text
          style={[
            styles.primaryText,
            { color: "#FFFFFF" },
          ]}
        >
          Start Scan
        </Text>
      </Pressable>

      <View
        style={[
          styles.card,
          {
            borderColor: isDark ? "rgba(255,255,255,0.15)" : "#DDDDDD",
            backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FAFAFA",
          },
        ]}
      >
        <Text style={[styles.cardTitle, { color: isDark ? "#FFFFFF" : "#111111" }]}>
          What you’ll do
        </Text>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 14 },
  title: { fontSize: 26, fontWeight: "800" },
  subtitle: { fontSize: 15, lineHeight: 20 },
  primaryBtn: { padding: 14, borderRadius: 12, alignItems: "center", marginTop: 4 },
  primaryText: { fontWeight: "800" },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  cardTitle: { fontWeight: "800", marginBottom: 2 },
  cardItem: { opacity: 0.95 },
});
