import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { analyzeScan } from "../../../services/scan";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://10.0.2.2:8000";

type ViewKey = "front" | "side" | "back";

type Picked = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

export default function ScanCaptureScreen() {
  const [front, setFront] = useState<Picked | null>(null);
  const [side, setSide] = useState<Picked | null>(null);
  const [back, setBack] = useState<Picked | null>(null);
  const [loading, setLoading] = useState(false);

  // TODO: get rid of this token
  const token =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxNzcxNTMzNjg0fQ.XOfGbPC3Q6GG4KXGKsYEkjIdXnbiYUKlK-9Onm7_Ypg";

  const allReady = useMemo(
    () => !!front && !!side && !!back,
    [front, side, back]
  );

  const requestPerms = async () => {
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cam.status !== "granted" || lib.status !== "granted") {
      Alert.alert(
        "Permissions needed",
        "Camera and photo library permissions are required."
      );
      return false;
    }
    return true;
  };

  const pickImage = async (view: ViewKey, fromCamera: boolean) => {
    const ok = await requestPerms();
    if (!ok) return;

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({
          quality: 0.5, // reduced to help performance
          allowsEditing: false,
        })
      : await ImagePicker.launchImageLibraryAsync({
          quality: 0.5,
          allowsEditing: false,
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
        });

    if (result.canceled) return;

    const asset = result.assets[0];

    const picked: Picked = {
      uri: asset.uri,
      fileName: asset.fileName ?? null,
      mimeType: asset.mimeType ?? null,
    };

    if (view === "front") setFront(picked);
    if (view === "side") setSide(picked);
    if (view === "back") setBack(picked);
  };

  const handleAnalyze = async () => {
    if (!front || !side || !back) {
      Alert.alert(
        "Missing photos",
        "Please capture/select front, side, and back photos."
      );
      return;
    }

    if (!token) {
      Alert.alert("Not logged in", "You must be logged in to run a scan.");
      return;
    }

    setLoading(true);

    try {
      const result = await analyzeScan({
        baseUrl: BASE_URL,
        token,
        front,
        side,
        back,
      });

      // Navigate using Expo Router
      router.push({
        pathname: "/(tabs)/scan/results",
        params: { sessionId: result.session_id },
      });
    } catch (e: any) {
      Alert.alert("Scan failed", e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const Slot = ({ view, value }: { view: ViewKey; value: Picked | null }) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
        {view.toUpperCase()} photo
      </Text>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable
          onPress={() => pickImage(view, true)}
          style={{ padding: 12, borderRadius: 10, backgroundColor: "#111827" }}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>
            Take Photo
          </Text>
        </Pressable>

        <Pressable
          onPress={() => pickImage(view, false)}
          style={{ padding: 12, borderRadius: 10, backgroundColor: "#374151" }}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>
            Choose
          </Text>
        </Pressable>
      </View>

      <View style={{ marginTop: 10 }}>
        {value ? (
          <Image
            source={{ uri: value.uri }}
            style={{
              width: "100%",
              height: 220,
              borderRadius: 12,
              backgroundColor: "#e5e7eb",
            }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: "100%",
              height: 220,
              borderRadius: 12,
              backgroundColor: "#e5e7eb",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#6b7280" }}>
              No image selected
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
      <Text style={{ fontSize: 22, fontWeight: "800", marginBottom: 8 }}>
        3-Photo Body Scan
      </Text>
      <Text style={{ color: "#6b7280", marginBottom: 18 }}>
        Upload front, side, and back photos to generate measurements.
      </Text>

      <Slot view="front" value={front} />
      <Slot view="side" value={side} />
      <Slot view="back" value={back} />

      <Pressable
        disabled={!allReady || loading}
        onPress={handleAnalyze}
        style={{
          padding: 14,
          borderRadius: 12,
          backgroundColor:
            !allReady || loading ? "#9ca3af" : "#2563eb",
          alignItems: "center",
        }}
      >
        {loading ? (
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <ActivityIndicator />
            <Text style={{ color: "white", fontWeight: "700" }}>
              Analyzing…
            </Text>
          </View>
        ) : (
          <Text style={{ color: "white", fontWeight: "800" }}>
            Analyze Scan
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
