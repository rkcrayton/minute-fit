import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { OnboardingProvider, useOnboarding } from "@/contexts/onboarding";

export const unstable_settings = {
  anchor: "(onboarding)",
};

function RootNavigator() {
  const { hasOnboarded } = useOnboarding();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inOnboarding = segments[0] === "(onboarding)";

    if (hasOnboarded && inOnboarding) {
      router.replace("/(tabs)" as any);
    } else if (!hasOnboarded && !inOnboarding) {
      router.replace("/(onboarding)" as any);
    }
  }, [hasOnboarded, segments]);

  return (
    <Stack>
      <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="modal"
        options={{ presentation: "modal", title: "Modal" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <OnboardingProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <RootNavigator />
        <StatusBar style="auto" />
      </ThemeProvider>
    </OnboardingProvider>
  );
}
