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
      <Stack.Screen name="setup" options={{ title: "Setup" }} />
      <Stack.Screen name="record" options={{ title: "Record" }} />
      <Stack.Screen
        name="analyzing"
        options={{
          title: "Analyzing",
          headerBackVisible: false,
          headerLeft: () => null,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen name="movenet" options={{ title: "Scan" }} />
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
