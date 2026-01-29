import { Stack } from "expo-router";

export default function PlanLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Plan" }} />
      <Stack.Screen name="[id]" options={{ title: "Plan Details" }} />
    </Stack>
  );
}
