import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useAuth } from "@/contexts/auth";
import { getBaseURL } from "@/services/api";
import { analyzeScan } from "@/services/scan";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ViewKey = "front" | "side" | "back";

export type Picked = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

export const STEPS: {
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

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useScanCapture() {
  const [photos, setPhotos] = useState<Record<ViewKey, Picked | null>>({
    front: null,
    side: null,
    back: null,
  });
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const { token } = useAuth();

  const currentStep = STEPS[step];
  const currentPhoto = photos[currentStep.key];
  const isLastStep = step === STEPS.length - 1;
  const allDone = useMemo(
    () => STEPS.every((s) => photos[s.key] !== null),
    [photos],
  );
  const nextDisabled = !currentPhoto || loading || (isLastStep && !allDone);

  const requestPerms = useCallback(async (): Promise<boolean> => {
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
  }, []);

  const validateAsset = (asset: ImagePicker.ImagePickerAsset): string | null => {
    if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE_BYTES) {
      return "Photo is too large. Please use an image under 20 MB.";
    }
    if (asset.mimeType && !ALLOWED_MIME_TYPES.includes(asset.mimeType)) {
      return "Invalid file type. Please use a JPG, PNG, or HEIC photo.";
    }
    return null;
  };

  const pickImage = useCallback(
    async (fromCamera: boolean) => {
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
    },
    [requestPerms, currentStep.key],
  );

  const handleAnalyze = useCallback(async () => {
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
  }, [allDone, token, photos]);

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

  const goToStep = (i: number) => {
    setStep(i);
  };

  return {
    photos,
    step,
    loading,
    currentStep,
    currentPhoto,
    isLastStep,
    allDone,
    nextDisabled,
    pickImage,
    clearPhoto,
    handleNext,
    goToStep,
  };
}
