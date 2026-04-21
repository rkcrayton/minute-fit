import {
  Camera,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  RotateCcw,
  User,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { router } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useScanCapture, STEPS } from "@/hooks/use-scan-capture";
import { getScanHistory, type ScanHistoryItem } from "@/services/scan";

const RISK_COLOR: Record<string, string> = {
  low: "#22c55e",
  moderate: "#f59e0b",
  high: "#ef4444",
};

const CATEGORY_COLOR: Record<string, string> = {
  Athletic: "#22c55e",
  Fit: "#22c55e",
  Acceptable: "#f59e0b",
  Obese: "#ef4444",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ScanCaptureScreen() {
  const {
    photos,
    step,
    loading,
    currentStep,
    currentPhoto,
    isLastStep,
    nextDisabled,
    pickImage,
    clearPhoto,
    handleNext,
    goToStep,
  } = useScanCapture();

  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    getScanHistory()
      .then(setHistory)
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  const bg = useThemeColor({}, "background");
  const surface = useThemeColor({}, "surface");
  const surfaceElevated = useThemeColor({}, "surfaceElevated");
  const border = useThemeColor({}, "border");
  const tint = useThemeColor({}, "tint");
  const text = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");

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
                onPress={() => goToStep(i)}
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
              onPress={() => goToStep(step - 1)}
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

      {/* Past Scans */}
      {(historyLoading || history.length > 0) && (
        <View style={{ marginTop: 32 }}>
          <ThemedText
            type="defaultSemiBold"
            style={{ fontSize: 12, opacity: 0.5, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}
          >
            Past Scans
          </ThemedText>

          {historyLoading ? (
            <ActivityIndicator style={{ marginTop: 8 }} />
          ) : (
            <View style={{ borderWidth: 1, borderColor: border, borderRadius: 14, overflow: "hidden" }}>
              {history.map((scan, index) => (
                <Pressable
                  key={scan.session_id}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/scan/results",
                      params: { sessionId: scan.session_id },
                    })
                  }
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    backgroundColor: pressed ? surfaceElevated : surface,
                    borderBottomWidth: index < history.length - 1 ? 1 : 0,
                    borderBottomColor: border,
                  })}
                  accessibilityRole="button"
                  accessibilityLabel={`Scan from ${formatDate(scan.created_at)}, ${scan.health_category}, ${scan.body_fat_percentage?.toFixed(1)}% body fat`}
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText type="defaultSemiBold" style={{ fontSize: 14, marginBottom: 2 }}>
                      {formatDate(scan.created_at)}
                    </ThemedText>
                    <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                      <ThemedText
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: CATEGORY_COLOR[scan.health_category] ?? textSecondary,
                        }}
                      >
                        {scan.health_category}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 12, color: textSecondary }}>
                        {scan.body_fat_percentage?.toFixed(1)}% body fat · BMI {scan.bmi?.toFixed(1)}
                      </ThemedText>
                    </View>
                  </View>
                  <ChevronRight size={16} color={textSecondary} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}
