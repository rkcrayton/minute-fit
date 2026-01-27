import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useColorScheme,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";

export default function ScanRecord() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const cameraRef = useRef<CameraView>(null);
    const [permission, requestPermission] = useCameraPermissions();
    const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const total = 60;
  const [secondsLeft, setSecondsLeft] = useState(total);
  const [running, setRunning] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);

  // ✅ NEW: camera readiness
  const [cameraReady, setCameraReady] = useState(false);

  // (optional) track if recordAsync is in-flight
  const [starting, setStarting] = useState(false);

  const bg = isDark ? "#0B0B0F" : "#FFFFFF";
  const text = isDark ? "#FFFFFF" : "#111111";
  const subtext = isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.65)";
  const border = isDark ? "rgba(255,255,255,0.15)" : "#DDDDDD";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#FAFAFA";

  const phase = useMemo(() => {
    const t = total - secondsLeft;
    if (t < 10) return { title: "Stand still", hint: "Relax shoulders. Face the camera." };
    if (t < 30) return { title: "Squats", hint: "Do 3 slow squats. Keep heels down." };
    if (t < 50) return { title: "Arm raise", hint: "Raise arms overhead slowly." };
    return { title: "Finish", hint: "Hold still for final seconds." };
  }, [secondsLeft]);

  // countdown timer
  useEffect(() => {
    if (!running) return;
    if (secondsLeft <= 0) return;

    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [running, secondsLeft]);

  // stop recording when timer ends
  useEffect(() => {
    if (running && secondsLeft === 0) onStop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, running]);

  const progress = 1 - secondsLeft / total;

    const ensurePermission = async () => {
    if (!permission) return false;

    const camOk = permission.granted ? true : (await requestPermission()).granted;
    if (!camOk) return false;

    // ✅ mic is required for video recording on iOS in many cases
    if (!micPermission) return false;
    const micOk = micPermission.granted ? true : (await requestMicPermission()).granted;
    if (!micOk) return false;

    return true;
    };

  const onStart = async () => {
    const ok = await ensurePermission();
    if (!ok) {
      Alert.alert("Camera permission needed", "Please allow camera access to continue.");
      return;
    }
    if (!cameraReady) {
      Alert.alert("Camera warming up", "Camera is not ready yet. Try again in a second.");
      return;
    }
    if (!cameraRef.current) {
      Alert.alert("Camera not ready", "Try again in a moment.");
      return;
    }

    try {
      setStarting(true);
      setVideoUri(null);
      setSecondsLeft(total);
      setRunning(true);

      const video = await cameraRef.current.recordAsync({
        maxDuration: total,
      });

      if (!video?.uri) {
        setRunning(false);
        setStarting(false);
        Alert.alert("Recording failed", "No video was produced. Try again.");
        return;
      }

      setVideoUri(video.uri);
      setRunning(false);
      setStarting(false);

      router.replace({
        pathname: "/(tabs)/scan/analyzing",
        params: { videoUri: video.uri },
      });
    } catch (e: any) {
      setRunning(false);
      setStarting(false);
      console.log("Recording error full:", e);
      Alert.alert("Recording error", String(e?.message ?? e ?? "Unknown recording error"));
    }
  };

  const onStop = () => {
    try {
      setRunning(false);
      cameraRef.current?.stopRecording();
    } catch (e: any) {
      Alert.alert("Stop error", e?.message ?? "Could not stop recording");
    }
  };

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <Text style={[styles.title, { color: text }]}>Recording</Text>
        <Text style={{ color: subtext }}>Loading camera permissions…</Text>
      </View>
    );
  }

  const canStart =
  permission.granted &&
  cameraReady &&
  !running &&
  !starting;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Text style={[styles.title, { color: text }]}>Recording</Text>

      <View style={[styles.previewWrap, { borderColor: border, backgroundColor: cardBg }]}>
        {permission.granted ? (
            <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="front"
            mode="video"
            onCameraReady={() => {
                // tiny delay avoids race where "ready" fires but native isn't fully ready to record
                setTimeout(() => setCameraReady(true), 250);
            }}
            />
        ) : (
          <View style={styles.previewFallback}>
            <Text style={{ color: subtext, textAlign: "center" }}>
              Camera access is required to preview and record your scan.
            </Text>
            <Pressable
              style={[styles.secondaryBtn, { borderColor: border }]}
              onPress={requestPermission}
            >
              <Text style={[styles.secondaryText, { color: text }]}>Allow Camera</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>{phase.title}</Text>
          <Text style={styles.overlayHint}>{phase.hint}</Text>

          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <Text style={styles.time}>{secondsLeft}s</Text>
          </View>

          {!cameraReady && permission.granted ? (
            <Text style={styles.statusText}>Initializing camera…</Text>
          ) : null}
        </View>
      </View>

      <Pressable
        style={[
          styles.primaryBtn,
          { backgroundColor: isDark ? "#FFFFFF" : "#111111" },
          (running || starting) && { backgroundColor: "#ffe9e9" },
          !canStart && !running && !starting && { opacity: 0.45 },
        ]}
        onPress={running ? onStop : onStart}
        disabled={running ? false : !canStart}
      >
        <Text
          style={[
            styles.primaryText,
            { color: (running || starting) ? "#111111" : (isDark ? "#111111" : "#FFFFFF") },
          ]}
        >
          {starting ? "Starting…" : running ? "Stop" : "Start 60s Recording"}
        </Text>
      </Pressable>

      <Pressable style={styles.backBtn} onPress={() => router.back()} disabled={running || starting}>
        <Text style={{ color: subtext, fontWeight: "800" }}>
          {running || starting ? "Back (disabled while recording)" : "Back"}
        </Text>
      </Pressable>

      {videoUri ? (
        <Text style={{ color: subtext, fontSize: 12 }} numberOfLines={1}>
          Saved: {videoUri}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: "800" },

  previewWrap: {
    height: 420,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  camera: { flex: 1 },
  previewFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 16,
  },

  overlay: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.35)",
    gap: 6,
  },
  overlayTitle: { fontSize: 16, fontWeight: "900", color: "#fff" },
  overlayHint: { lineHeight: 18, color: "rgba(255,255,255,0.85)" },

  progressRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 },
  progressTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  progressFill: { height: 10, backgroundColor: "#fff" },
  time: { width: 52, textAlign: "right", fontWeight: "900", color: "#fff" },

  statusText: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 4 },

  primaryBtn: { padding: 14, borderRadius: 12, alignItems: "center" },
  primaryText: { fontWeight: "900" },

  secondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryText: { fontWeight: "800" },

  backBtn: { padding: 12, borderRadius: 12, alignItems: "center" },
});
