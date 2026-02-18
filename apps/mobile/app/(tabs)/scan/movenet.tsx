import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Button, Platform, ScrollView, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system";
import { Buffer } from "buffer";

import { computeSegmentMetrics } from "./segmentMetrics";
import { startScan, postSegment, finalizeScan } from "./scanApi";

type PoseKeypoint = {
  name?: string;
  x: number;
  y: number;
  score?: number;
};

// IMPORTANT: on a real phone, "localhost" won't work.
// Use your computer's LAN IP (same Wi-Fi), e.g. http://192.168.1.20:8000
const API_BASE = "http://192.168.1.20:8000";
const USER_ID = 1;

// The segment order for Layer 1
const SEGMENTS = [
  "neutral_front",
  "overhead_reach",
  "squat",
  "single_leg_left",
  "single_leg_right",
  "turn",
] as const;

export default function MoveNetScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [tfReady, setTfReady] = useState(false);
  const [detectorReady, setDetectorReady] = useState(false);
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState<string>("Idle");
  const [keypoints, setKeypoints] = useState<PoseKeypoint[]>([]);

  const tfRef = useRef<any>(null);
  const decodeJpegRef = useRef<any>(null);
  const detectorRef = useRef<any>(null);

  const permissionGranted = !!permission?.granted;
  const canRun = useMemo(() => permissionGranted && tfReady && detectorReady, [permissionGranted, tfReady, detectorReady]);

  // Scan session state
  const [scanId, setScanId] = useState<number | null>(null);
  const [segmentIndex, setSegmentIndex] = useState(0);

  const currentSegment = SEGMENTS[segmentIndex];

  useEffect(() => {
    if (!permissionGranted) return;
    let cancelled = false;

    (async () => {
      try {
        setStatus("Initializing TensorFlow...");
        setLoading(true);

        const tf = await import("@tensorflow/tfjs");
        await import("@tensorflow/tfjs-react-native");
        const tfReactNative = await import("@tensorflow/tfjs-react-native");
        const poseDetection = await import("@tensorflow-models/pose-detection");

        await tf.ready();
        try { await tf.setBackend("rn-webgl"); } catch {}

        if (cancelled) return;

        tfRef.current = tf;
        decodeJpegRef.current = tfReactNative.decodeJpeg;
        setTfReady(true);

        setStatus("Creating MoveNet detector...");
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            enableSmoothing: true,
          }
        );

        if (cancelled) return;
        detectorRef.current = detector;
        setDetectorReady(true);
        setStatus("Ready. Start a scan.");
      } catch (e: any) {
        setStatus(`TF init failed: ${e?.message ?? String(e)}`);
      } finally {
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [permissionGranted]);

  async function onStartScan() {
    try {
      setLoading(true);
      setStatus("Starting scan...");
      const scan = await startScan(API_BASE, USER_ID);
      setScanId(scan.id);
      setSegmentIndex(0);
      setStatus(`Scan started (id=${scan.id}). Capture: ${SEGMENTS[0]}`);
    } catch (e: any) {
      setStatus(`Start scan failed: ${e?.message ?? String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  async function takeSnapshotAndRun() {
    if (!cameraRef.current) return;
    if (!canRun) {
      setStatus("Not ready yet (permissions / TFJS / detector).");
      return;
    }
    if (!scanId) {
      setStatus("Start a scan first.");
      return;
    }

    try {
      setLoading(true);
      setStatus(`Capturing ${currentSegment}...`);

      const photo: any = await (cameraRef.current as any).takePictureAsync({
        quality: 0.5,
        skipProcessing: true,
      });

      const uri: string | undefined = photo?.uri;
      if (!uri) {
        setStatus("No photo URI returned.");
        return;
      }

      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
      const imageBytes = Buffer.from(base64, "base64");
      const uint8 = new Uint8Array(imageBytes);

      const tf = tfRef.current;
      const decodeJpeg = decodeJpegRef.current;
      const detector = detectorRef.current;
      if (!tf || !decodeJpeg || !detector) {
        setStatus("TF/decoder/detector missing.");
        return;
      }

      const imageTensor = decodeJpeg(uint8);
      const poses = await detector.estimatePoses(imageTensor, { flipHorizontal: false });
      tf.dispose(imageTensor);

      const kps: PoseKeypoint[] = poses?.[0]?.keypoints ?? [];
      setKeypoints(kps);

      if (!kps.length) {
        setStatus("No keypoints detected. Try again with better framing.");
        return;
      }

      // Compute metrics for this segment
      const metrics = computeSegmentMetrics(currentSegment, kps);
      const quality = typeof metrics.quality === "number" ? metrics.quality : undefined;

      setStatus(`Uploading ${currentSegment} metrics...`);
      await postSegment(API_BASE, scanId, currentSegment, metrics, quality);

      setStatus(`Uploaded ${currentSegment}.`);
    } catch (e: any) {
      setStatus(`Pose run failed: ${e?.message ?? String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  async function onNextSegment() {
    if (!scanId) return;
    if (segmentIndex >= SEGMENTS.length - 1) {
      setStatus("Already at last segment.");
      return;
    }
    setSegmentIndex(i => i + 1);
    setStatus(`Ready. Capture: ${SEGMENTS[segmentIndex + 1]}`);
  }

  async function onFinalize() {
    if (!scanId) return;
    try {
      setLoading(true);
      setStatus("Finalizing scan (generating insights)...");
      const report = await finalizeScan(API_BASE, scanId);
      setStatus(`Done! Overall score: ${report.overall_score}`);
    } catch (e: any) {
      setStatus(`Finalize failed: ${e?.message ?? String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  // ----- UI STATES -----

  if (!permission) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12 }}>Checking camera permission...</Text>
      </View>
    );
  }

  if (!permissionGranted) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
        <Text style={{ fontSize: 18, marginBottom: 12 }}>Camera permission required</Text>
        <Button title="Grant Camera Permission" onPress={() => requestPermission()} />
        <Text style={{ marginTop: 12, opacity: 0.7, textAlign: "center" }}>
          If you're on an emulator: Android Emulator → Extended Controls → Camera → select a webcam.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front" />
      </View>

      <View style={{ padding: 12, borderTopWidth: 1, borderColor: "#ddd" }}>
        <Text style={{ marginBottom: 6 }}>
          <Text style={{ fontWeight: "600" }}>Scan:</Text> {scanId ?? "not started"}{"  "}
          <Text style={{ fontWeight: "600" }}>Step:</Text> {segmentIndex + 1}/{SEGMENTS.length} ({currentSegment})
        </Text>

        <Text style={{ marginBottom: 8 }}>
          <Text style={{ fontWeight: "600" }}>Status:</Text> {status}
        </Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <Button title="Start Scan" onPress={onStartScan} disabled={loading || !canRun} />
          <Button title={loading ? "Working..." : "Snapshot + Upload"} onPress={takeSnapshotAndRun} disabled={loading || !canRun || !scanId} />
          <Button title="Next Step" onPress={onNextSegment} disabled={loading || !scanId || segmentIndex >= SEGMENTS.length - 1} />
          <Button title="Finalize" onPress={onFinalize} disabled={loading || !scanId} />
        </View>

        {loading ? <ActivityIndicator style={{ marginTop: 10 }} /> : null}

        <ScrollView style={{ marginTop: 12, maxHeight: 160 }}>
          {keypoints.length === 0 ? (
            <Text style={{ opacity: 0.7 }}>
              No keypoints yet. Tap “Snapshot + Upload”.
              {"\n"}
              {Platform.OS === "android" ? "Tip: Emulators often have limited camera support." : null}
            </Text>
          ) : (
            keypoints.slice(0, 12).map((kp, i) => (
              <Text key={i} style={{ fontSize: 12 }}>
                {kp.name ?? `kp${i}`}: x={kp.x.toFixed(1)} y={kp.y.toFixed(1)} score={(kp.score ?? 0).toFixed(3)}
              </Text>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}
