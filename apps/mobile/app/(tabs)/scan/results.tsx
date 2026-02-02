import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet, useColorScheme } from "react-native";

type ScanResult = {
  posture: number;
  mobility: number;
  balance: number;
  symmetry: number;
  findings: string[];
};

export default function Results() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const { videoUri } = useLocalSearchParams<{ videoUri?: string }>();

  // Mock data (MVP)
  const result: ScanResult = useMemo(
    () => ({
      posture: 78,
      mobility: 64,
      balance: 71,
      symmetry: 69,
      findings: [
        "Right shoulder slightly higher than left (possible tightness).",
        "Knees drift inward during squat (work on glute activation).",
        "Limited overhead reach (upper-back mobility).",
      ],
    }),
    []
  );

  const bg = isDark ? "#0B0B0F" : "#FFFFFF";
  const text = isDark ? "#FFFFFF" : "#111111";
  const subtext = isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.65)";
  const border = isDark ? "rgba(255,255,255,0.15)" : "#DDDDDD";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#FAFAFA";

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Text style={[styles.title, { color: text }]}>Your Snapshot</Text>

      <Text style={[styles.subtitle, { color: subtext }]}>
        {videoUri ? "Scan captured ✓ (mock results)" : "No video detected (mock results)"}
      </Text>

      <View style={styles.grid}>
        <ScoreCard label="Posture" value={result.posture} isDark={isDark} border={border} cardBg={cardBg} />
        <ScoreCard label="Mobility" value={result.mobility} isDark={isDark} border={border} cardBg={cardBg} />
        <ScoreCard label="Balance" value={result.balance} isDark={isDark} border={border} cardBg={cardBg} />
        <ScoreCard label="Symmetry" value={result.symmetry} isDark={isDark} border={border} cardBg={cardBg} />
      </View>

      <View style={[styles.card, { borderColor: border, backgroundColor: cardBg }]}>
        <Text style={[styles.cardTitle, { color: text }]}>Key findings</Text>
        {result.findings.map((f, idx) => (
          <Text key={idx} style={[styles.bullet, { color: isDark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.8)" }]}>
            • {f}
          </Text>
        ))}
      </View>

      <Pressable
        style={[styles.primaryBtn, { backgroundColor: "#3B82F6" }]}
        onPress={() => router.push("/(tabs)/plan")}
      >
        <Text style={[styles.primaryText, { color: "#FFFFFF" }]}>
          Update My Plan
        </Text>
      </Pressable>

      <Pressable
        style={styles.secondaryBtn}
        onPress={() => router.replace("/(tabs)/scan")}
      >
        <Text style={[styles.secondaryText, { color: subtext }]}>Run Another Scan</Text>
      </Pressable>

      {/* Optional debug: show the uri trimmed */}
      {typeof videoUri === "string" ? (
        <Text style={[styles.debug, { color: subtext }]} numberOfLines={2}>
          Video: {videoUri}
        </Text>
      ) : null}
    </View>
  );
}

function ScoreCard({
  label,
  value,
  isDark,
  border,
  cardBg,
}: {
  label: string;
  value: number;
  isDark: boolean;
  border: string;
  cardBg: string;
}) {
  const text = isDark ? "#FFFFFF" : "#111111";
  const sub = isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.6)";

  return (
    <View style={[styles.scoreCard, { borderColor: border, backgroundColor: cardBg }]}>
      <Text style={[styles.scoreLabel, { color: sub }]}>{label}</Text>
      <Text style={[styles.scoreValue, { color: text }]}>{value}</Text>
      <Text style={[styles.scoreHint, { color: sub }]}>/ 100</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
  title: { fontSize: 22, fontWeight: "800" },
  subtitle: { marginBottom: 6 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  scoreCard: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 2,
  },
  scoreLabel: { fontWeight: "800" },
  scoreValue: { fontSize: 28, fontWeight: "900" },
  scoreHint: {},

  card: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 8, marginTop: 2 },
  cardTitle: { fontWeight: "900" },
  bullet: { lineHeight: 20 },

  primaryBtn: { padding: 14, borderRadius: 12, alignItems: "center", marginTop: 6 },
  primaryText: { fontWeight: "900" },

  secondaryBtn: { padding: 12, borderRadius: 12, alignItems: "center" },
  secondaryText: { fontWeight: "900" },

  debug: { marginTop: 8, fontSize: 12 },
});
