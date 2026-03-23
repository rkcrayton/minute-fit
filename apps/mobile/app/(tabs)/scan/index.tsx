import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  RotateCcw,
  User,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useAuth } from "@/contexts/auth";
import { getBaseURL } from "@/services/api";
import { analyzeScan } from "../../../services/scan";

type ViewKey = "front" | "side" | "back";

type Picked = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
};

const STEPS: {
  key: ViewKey;
  label: string;
  instruction: string;
  tip: string;
}[] = [
  {
    key: "front",
    label: "Front View",
    instruction:
      "Stand straight, facing the camera with your arms slightly away from your sides.",
    tip: "Full body · Arms relaxed · Good lighting",
  },
  {
    key: "side",
    label: "Side View",
    instruction:
      "Turn 90° to your right. Stand straight with arms relaxed at your sides.",
    tip: "Full body · Look straight ahead · Feet shoulder-width apart",
  },
  {
    key: "back",
    label: "Back View",
    instruction:
      "Turn so your back faces the camera. Arms slightly away from your sides.",
    tip: "Full body · Stand straight · Hair up if possible",
  },
];

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
  "image/heif",
];

export default function ScanCaptureScreen() {
  const [photos, setPhotos] = useState<Record<ViewKey, Picked | null>>({
    front: null,
    side: null,
    back: null,
  });
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  const bg = useThemeColor({}, "background");
  const surface = useThemeColor({}, "surface");
  const surfaceElevated = useThemeColor({}, "surfaceElevated");
  const border = useThemeColor({}, "border");
  const tint = useThemeColor({}, "tint");
  const text = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");

  const currentStep = STEPS[step];
  const currentPhoto = photos[currentStep.key];
  const isLastStep = step === STEPS.length - 1;
  const allDone = useMemo(
    () => STEPS.every((s) => photos[s.key] !== null),
    [photos],
  );

  const requestPerms = async () => {
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (cam.status !== "granted" || lib.status !== "granted") {
      Alert.alert(
        "Permissions needed",
        "Camera and photo library permissions are required.",
      );
      return false;
    }
    return true;
  };

  const validateAsset = (asset: ImagePicker.ImagePickerAsset): string | null => {
    if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE_BYTES) {
      return "Photo is too large. Please use an image under 20 MB.";
    }
    if (asset.mimeType && !ALLOWED_MIME_TYPES.includes(asset.mimeType)) {
      return "Invalid file type. Please use a JPG, PNG, or HEIC photo.";
    }
    return null;
  };

  const pickImage = async (fromCamera: boolean) => {
    const ok = await requestPerms();
    if (!ok) return;

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({
          quality: 0.8,
          allowsEditing: false,
        })
      : await ImagePicker.launchImageLibraryAsync({
          quality: 0.8,
          allowsEditing: false,
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
        });

    if (result.canceled) return;

    const asset = result.assets[0];
    const err = validateAsset(asset);
    if (err) {
      Alert.alert("Invalid photo", err);
      return;
    }

    setPhotos((prev) => ({
      ...prev,
      [currentStep.key]: {
        uri: asset.uri,
        fileName: asset.fileName ?? null,
        mimeType: asset.mimeType ?? null,
        fileSize: asset.fileSize ?? null,
      },
    }));
  };

  const clearPhoto = () => {
    setPhotos((prev) => ({ ...prev, [currentStep.key]: null }));
  };

  const handleNext = () => {
    if (isLastStep) {
      handleAnalyze();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleAnalyze = async () => {
    if (!allDone || !token) return;

    setLoading(true);
    try {
      const result = await analyzeScan({
        baseUrl: getBaseURL(),
        token,
        front: photos.front!,
        side: photos.side!,
        back: photos.back!,
      });
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

  const nextDisabled = !currentPhoto || loading || (isLastStep && !allDone);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bg }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View>

        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <ThemedText type="title" style={{ fontSize: 24 }}>
            Body Scan
          </ThemedText>
          <View
            style={{
              backgroundColor: surface,
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderWidth: 1,
              borderColor: border,
            }}
          >
            <ThemedText style={{ fontSize: 13, color: textSecondary }}>
              {step + 1} / {STEPS.length}
            </ThemedText>
          </View>
        </View>

        {/* Step indicator */}
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            marginBottom: 24,
          }}
        >
          {STEPS.map((s, i) => {
            const done = photos[s.key] !== null;
            const active = i === step;
            return (
              <Pressable
                key={s.key}
                onPress={() => setStep(i)}
                style={{ flex: 1, height: 6, borderRadius: 3, overflow: "hidden" }}
              >
                <View
                  style={{
                    flex: 1,
                    borderRadius: 3,
                    backgroundColor: done
                      ? "#22C55E"
                      : active
                        ? tint
                        : border,
                  }}
                />
              </Pressable>
            );
          })}
        </View>

        {/* Photo preview area */}
        <View
          style={{
            borderRadius: 20,
            overflow: "hidden",
            marginBottom: 20,
            borderWidth: 1,
            borderColor: border,
            backgroundColor: surface,
            height: 240,
          }}
        >
          {currentPhoto ? (
            <>
              <Image
                source={{ uri: currentPhoto.uri }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
              <Pressable
                onPress={clearPhoto}
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  backgroundColor: "rgba(0,0,0,0.55)",
                  borderRadius: 20,
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                }}
              >
                <RotateCcw size={13} color="white" />
                <ThemedText
                  style={{ color: "white", fontSize: 13, fontWeight: "600" }}
                >
                  Retake
                </ThemedText>
              </Pressable>
            </>
          ) : (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <User size={56} color={textSecondary} strokeWidth={1.2} />
              <ThemedText style={{ color: textSecondary, fontSize: 14 }}>
                No photo yet
              </ThemedText>
            </View>
          )}
        </View>

        {/* Instructions */}
        <View style={{ marginBottom: 20 }}>
          <ThemedText
            type="defaultSemiBold"
            style={{ fontSize: 17, marginBottom: 5 }}
          >
            {currentStep.label}
          </ThemedText>
          <ThemedText
            style={{ color: textSecondary, lineHeight: 22, marginBottom: 6 }}
          >
            {currentStep.instruction}
          </ThemedText>
          <View
            style={{
              backgroundColor: surface,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: border,
            }}
          >
            <ThemedText style={{ color: textSecondary, fontSize: 12 }}>
              {currentStep.tip}
            </ThemedText>
          </View>
        </View>

        {/* Camera / Library buttons */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
          <Pressable
            onPress={() => pickImage(true)}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 14,
              borderRadius: 14,
              backgroundColor: tint,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Camera size={18} color="white" />
            <ThemedText style={{ color: "white", fontWeight: "700" }}>
              Camera
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => pickImage(false)}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 14,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: border,
              backgroundColor: surfaceElevated,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <ImageIcon size={18} color={text} />
            <ThemedText style={{ fontWeight: "700" }}>Library</ThemedText>
          </Pressable>
        </View>

        {/* Navigation */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          {step > 0 && (
            <Pressable
              onPress={() => setStep((s) => s - 1)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingVertical: 14,
                paddingHorizontal: 18,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: border,
                backgroundColor: surfaceElevated,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <ChevronLeft size={18} color={text} />
              <ThemedText style={{ fontWeight: "600" }}>Back</ThemedText>
            </Pressable>
          )}

          <Pressable
            onPress={handleNext}
            disabled={nextDisabled}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 14,
              borderRadius: 14,
              backgroundColor: nextDisabled
                ? border
                : isLastStep
                  ? "#22C55E"
                  : tint,
              opacity: nextDisabled ? 0.5 : pressed ? 0.85 : 1,
            })}
          >
            {loading ? (
              <>
                <ActivityIndicator color="white" size="small" />
                <ThemedText style={{ color: "white", fontWeight: "700" }}>
                  Analyzing...
                </ThemedText>
              </>
            ) : (
              <>
                <ThemedText
                  style={{ color: "white", fontWeight: "700", fontSize: 16 }}
                >
                  {isLastStep ? "Analyze Scan" : "Next"}
                </ThemedText>
                {!isLastStep && <ChevronRight size={18} color="white" />}
              </>
            )}
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
