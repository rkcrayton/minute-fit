import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, useColorScheme } from "react-native";

export default function ScanSetup() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const items = useMemo(
    () => [
      { key: "space", label: "I have space to show my full body." },
      { key: "light", label: "Lighting is good (no dark shadows)." },
      { key: "phone", label: "Phone is stable (leaned or tripod)." },
      { key: "clothes", label: "Clothes allow movement (no long coat)." },
    ],
    []
  );

  const [checked, setChecked] = useState<Record<string, boolean>>({
    space: false,
    light: false,
    phone: false,
    clothes: false,
  });

  const allChecked = items.every((i) => checked[i.key]);

  const bg = isDark ? "#0B0B0F" : "#FFFFFF";
  const text = isDark ? "#FFFFFF" : "#111111";
  const subtext = isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.65)";
  const border = isDark ? "rgba(255,255,255,0.15)" : "#DDDDDD";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#FAFAFA";

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Text style={[styles.title, { color: text }]}>Before you start</Text>
      <Text style={[styles.subtitle, { color: subtext }]}>
        Check these to improve scan accuracy.
      </Text>

      <View style={styles.list}>
        {items.map((i) => {
          const isChecked = checked[i.key];
          return (
            <Pressable
              key={i.key}
              style={[
                styles.row,
                { borderColor: border, backgroundColor: cardBg },
                isChecked && { borderColor: "#3B82F6" },
              ]}
              onPress={() => setChecked((p) => ({ ...p, [i.key]: !p[i.key] }))}
            >
              <View
                style={[
                  styles.checkbox,
                  { borderColor: isDark ? "rgba(255,255,255,0.5)" : "#111111" },
                  isChecked && { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
                ]}
              >
                <Text
                  style={[
                    styles.checkmark,
                    { color: isChecked ? (isDark ? "#111111" : "#FFFFFF") : "transparent" },
                  ]}
                >
                  ✓
                </Text>
              </View>
              <Text style={[styles.label, { color: text }]}>{i.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        disabled={!allChecked}
        style={[
          styles.primaryBtn,
          { backgroundColor: "#3B82F6" },
          !allChecked && styles.disabled,
        ]}
        onPress={() => router.push("/(onboarding)/scan-record" as any)}
      >
        <Text style={styles.primaryText}>Continue</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 60, gap: 12 },
  title: { fontSize: 24, fontWeight: "900" },
  subtitle: { lineHeight: 20 },
  list: { gap: 10, marginTop: 6 },
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: { fontWeight: "900", fontSize: 16, lineHeight: 16 },
  label: { flex: 1, fontSize: 15, lineHeight: 20 },
  primaryBtn: { marginTop: 6, padding: 16, borderRadius: 14, alignItems: "center" },
  primaryText: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },
  disabled: { opacity: 0.35 },
});
