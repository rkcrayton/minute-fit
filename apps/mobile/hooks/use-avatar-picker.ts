import { useCallback, useState } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/contexts/auth";

export function useAvatarPicker() {
  const { uploadAvatar } = useAuth();
  const [uploading, setUploading] = useState(false);

  const requestPerms = useCallback(async (camera: boolean): Promise<boolean> => {
    if (camera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Camera permission is required to take a photo.");
        return false;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Photo library permission is required.");
        return false;
      }
    }
    return true;
  }, []);

  const pick = useCallback(
    async (fromCamera: boolean) => {
      const ok = await requestPerms(fromCamera);
      if (!ok) return;

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
          });

      if (result.canceled) return;

      setUploading(true);
      try {
        await uploadAvatar(result.assets[0].uri);
      } catch (e: any) {
        Alert.alert("Upload failed", e?.message ?? "Could not upload avatar.");
      } finally {
        setUploading(false);
      }
    },
    [requestPerms, uploadAvatar],
  );

  const pickFromCamera = useCallback(() => pick(true), [pick]);
  const pickFromLibrary = useCallback(() => pick(false), [pick]);

  const showPicker = useCallback(() => {
    Alert.alert("Change Profile Photo", "Choose a source", [
      { text: "Camera", onPress: pickFromCamera },
      { text: "Photo Library", onPress: pickFromLibrary },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [pickFromCamera, pickFromLibrary]);

  return { pickFromCamera, pickFromLibrary, showPicker, uploading };
}
