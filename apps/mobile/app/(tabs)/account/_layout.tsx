import { Stack } from "expo-router";

export default function AccountLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="health"
        options={{
          headerShown: true,
          title: "Health",
          headerBackTitle: "Account",
        }}
      />
    </Stack>
  );
}