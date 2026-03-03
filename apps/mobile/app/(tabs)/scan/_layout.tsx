import { Stack } from "expo-router";

export default function ScanStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name="index"
        options={{
          title: "Scan",
          headerBackVisible: false,
          headerLeft: () => null,
          gestureEnabled: false,
        }}
      />

      <Stack.Screen
        name="results"
        options={{
          title: "Results",
          headerBackVisible: false,
          headerLeft: () => null,
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
