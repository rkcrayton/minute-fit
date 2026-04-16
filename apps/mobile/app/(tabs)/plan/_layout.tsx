import { Stack } from "expo-router";

export default function PlanLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Plan" }} />
      <Stack.Screen name="[id]" options={{ title: "Plan Details" }} />
      <Stack.Screen name="generate" options={{ title: "Generate Plan" }} />
      <Stack.Screen name="edit" options={{ title: "Edit Plan" }} />
    </Stack>
  );
}
