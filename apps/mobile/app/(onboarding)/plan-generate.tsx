import React from "react";
import { StyleSheet } from "react-native";
import { router } from "expo-router";
import { ThemedView } from "@/components/themed-view";
import { useOnboarding } from "@/contexts/onboarding";
import { GeneratePlanForm } from "@/app/(tabs)/plan/generate";

export default function OnboardingPlanGenerate() {
  const { setOnboarded } = useOnboarding();

  const finishAndGoHome = () => {
    setOnboarded(true);
    router.replace("/(tabs)" as any);
  };

  return (
    <ThemedView style={styles.container}>
      <GeneratePlanForm
        onSuccess={finishAndGoHome}
        onSkip={finishAndGoHome}
        hideBack
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 48 },
});
