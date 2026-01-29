import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet, useColorScheme } from "react-native";

export default function Analyzing() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const raw = useLocalSearchParams<{ videoUri?: string | string[] }>();
  const videoUri = Array.isArray(raw.videoUri) ? raw.videoUri[0] : raw.videoUri;

  useEffect(() => {
    const id = setTimeout(() => {
      router.replace({
        pathname: "/(tabs)/scan/results",
        params: videoUri ? { videoUri } : {},
      });
    }, 1800);

    return () => clearTimeout(id);
  }, [videoUri]);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#0B0B0F" : "#FFFFFF" }]}>
      <ActivityIndicator size="large" />
      <Text style={[styles.title, { color: isDark ? "#FFFFFF" : "#111111" }]}>
        Analyzing your scan…
      </Text>
      <Text
        style={[
          styles.subtitle,
          { color: isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.65)" },
        ]}
      >
        Generating results (mock data)
      </Text>

      <Text
        style={[
          styles.debug,
          { color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)" },
        ]}
      >
        {videoUri ? "Video URI received ✓" : "No video URI (mock flow)"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 16 },
  title: { fontSize: 18, fontWeight: "800" },
  subtitle: { opacity: 0.95 },
  debug: { marginTop: 14, fontSize: 12 },
});
