// app/(tabs)/scan/movenet.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Button, Platform, ScrollView, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system";
import { Buffer } from "buffer";

type PoseKeypoint = {
  name?: string;
  x: number;
  y: number;
  score?: number;
};

export default function MoveNetScreen() {
  const cameraRef = useRef<CameraView>(null);

  // ✅ New Expo Camera permission API
  const [permission, requestPermission] = useCameraPermissions();

  const [tfReady, setTfReady] = useState(false);
  const [detectorReady, setDetectorReady] = useState(false);
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState<string>("Idle");
  const [keypoints, setKeypoints] = useState<PoseKeypoint[]>([]);

  // Keep these as "any" so TS doesn't fight dynamic imports
  const tfRef = useRef<any>(null);
  const decodeJpegRef = useRef<any>(null);
  const detectorRef = useRef<any>(null);

  const permissionGranted = !!permission?.granted;

  // Initialize TFJS + rn-webgl backend + MoveNet detector AFTER permission is granted
  useEffect(() => {
    if (!permissionGranted) return;

    let cancelled = false;

    (async () => {
      try {
        setStatus("Initializing TensorFlow...");
        setLoading(true);

        // Dynamic imports keep Metro happier and avoid loading until needed
        const tf = await import("@tensorflow/tfjs");
        await import("@tensorflow/tfjs-react-native"); // registers RN backend pieces
        const tfReactNative = await import("@tensorflow/tfjs-react-native");
        const poseDetection = await import("@tensorflow-models/pose-detection");

        // Prefer rn-webgl for tfjs-react-native
        await tf.ready();
        try {
          await tf.setBackend("rn-webgl");
        } catch {
          // if backend already set or not available, continue
        }

        if (cancelled) return;

        tfRef.current = tf;
        decodeJpegRef.current = tfReactNative.decodeJpeg;

        setTfReady(true);
        setStatus("Creating MoveNet detector...");

        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            // Options are safe defaults; adjust later
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            enableSmoothing: true,
          }
        );

        if (cancelled) return;

        detectorRef.current = detector;
        setDetectorReady(true);
        setStatus("Ready. Take a snapshot to run pose detection.");
      } catch (e: any) {
        setStatus(`TF init failed: ${e?.message ?? String(e)}`);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [permissionGranted]);

  const canRun = useMemo(() => permissionGranted && tfReady && detectorReady, [permissionGranted, tfReady, detectorReady]);

  async function takeSnapshotAndRun() {
    if (!cameraRef.current) return;
    if (!canRun) {
      setStatus("Not ready yet (permissions / TFJS / detector).");
      return;
    }

    try {
      setLoading(true);
      setStatus("Taking picture...");

      // NOTE: CameraView supports takePictureAsync in recent Expo SDKs
      const photo: any = await (cameraRef.current as any).takePictureAsync({
        quality: 0.5,
        skipProcessing: true,
      });

      const uri: string | undefined = photo?.uri;
      if (!uri) {
        setStatus("No photo URI returned.");
        return;
      }

      setStatus("Reading image bytes...");
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const imageBytes = Buffer.from(base64, "base64");
      const uint8 = new Uint8Array(imageBytes);

      const tf = tfRef.current;
      const decodeJpeg = decodeJpegRef.current;
      const detector = detectorRef.current;

      if (!tf || !decodeJpeg || !detector) {
        setStatus("TF/decoder/detector missing.");
        return;
      }

      setStatus("Decoding JPEG to tensor...");
      const imageTensor = decodeJpeg(uint8); // shape [h, w, 3]

      setStatus("Running MoveNet...");
      const poses = await detector.estimatePoses(imageTensor, { flipHorizontal: false });

      // Cleanup tensor memory
      tf.dispose(imageTensor);

      const pose0 = poses?.[0];
      const kps: PoseKeypoint[] = pose0?.keypoints ?? [];

      setKeypoints(kps);
      setStatus(`Done. Found ${kps.length} keypoints.`);
    } catch (e: any) {
      setStatus(`Pose run failed: ${e?.message ?? String(e)}`);
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
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing="front"
          // some emulators don’t like audio on camera preview
          // (CameraView doesn't expose audio flags like old Camera did)
        />
      </View>

      <View style={{ padding: 12, borderTopWidth: 1, borderColor: "#ddd" }}>
        <Text style={{ marginBottom: 8 }}>
          <Text style={{ fontWeight: "600" }}>Status:</Text> {status}
        </Text>

        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <Button
            title={loading ? "Working..." : "Snapshot + Run Pose"}
            onPress={takeSnapshotAndRun}
            disabled={loading || !canRun}
          />
          {loading ? <ActivityIndicator /> : null}
        </View>

        <ScrollView style={{ marginTop: 12, maxHeight: 180 }}>
          {keypoints.length === 0 ? (
            <Text style={{ opacity: 0.7 }}>
              No keypoints yet. Tap “Snapshot + Run Pose”.
              {"\n"}
              {Platform.OS === "android" ? "Tip: Emulators often have limited camera support." : null}
            </Text>
          ) : (
            keypoints.map((kp, i) => (
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
