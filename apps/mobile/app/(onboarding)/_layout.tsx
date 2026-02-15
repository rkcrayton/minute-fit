import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="scan-intro" />
      <Stack.Screen name="scan-setup" />
      <Stack.Screen name="scan-record" />
      <Stack.Screen
        name="scan-analyzing"
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="scan-results"
        options={{ gestureEnabled: false }}
      />
    </Stack>
  );
}
