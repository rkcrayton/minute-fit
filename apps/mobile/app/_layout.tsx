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
import { AuthProvider, useAuth } from "@/contexts/auth";
import { OnboardingProvider, useOnboarding } from "@/contexts/onboarding";

export const unstable_settings = {
  anchor: "(onboarding)",
};

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const { hasOnboarded } = useOnboarding();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return; // Wait until we check for a saved token

    const inOnboarding = (segments[0] as string) === "(onboarding)";

    if (user && hasOnboarded && inOnboarding) {
      // Logged in and onboarded — go to main app
      router.replace("/(tabs)" as any);
    } else if (!user && !inOnboarding) {
      // Not logged in — go to onboarding/login
      router.replace("/(onboarding)" as any);
    }
  }, [user, hasOnboarded, isLoading, segments]);

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
    <AuthProvider>
      <OnboardingProvider>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <RootNavigator />
          <StatusBar style="auto" />
        </ThemeProvider>
      </OnboardingProvider>
    </AuthProvider>
  );
}
