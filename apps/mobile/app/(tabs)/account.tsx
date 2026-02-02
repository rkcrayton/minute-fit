import { ScrollView, useColorScheme } from "react-native";
import { AccountHeader, GoalCards, Settings, type Goal, type SettingsItem } from "@/components/account";
import tw from "twrnc";

export default function AccountScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  // Mock data - replace with actual state/API calls later
  const goals: Goal[] = [
    {
      value: "11,000",
      label: "Daily Steps",
      onPress: () => console.log("Daily Steps pressed"),
    },
    {
      value: "25",
      label: "Minutes Worked Out",
      onPress: () => console.log("Minutes Worked Out pressed"),
    },
  ];

  const settingsItems: SettingsItem[] = [
    { label: "Focus Mode", onPress: () => alert("Focus Mode Pressed") },
    { label: "Workouts/Week", onPress: () => alert("Workouts/Week Pressed") },
    { label: "Duration", onPress: () => alert("Duration Pressed") },
    { label: "Exercise Variability", onPress: () => alert("Exercise Variability Pressed") },
    { label: "Payment Method", onPress: () => alert("Payment Method Pressed") },
    { label: "My Gear", onPress: () => alert("My Gear Pressed") },
    { label: "Subscription", onPress: () => alert("Subscription Pressed") },
    { label: "Profile Info", onPress: () => alert("Profile Info Pressed") },
    { label: "Log out", onPress: () => alert("Logout Pressed") },
  ];

  return (
    <ScrollView
      style={[tw`flex-1`, { backgroundColor: isDark ? "#111827" : "#FFFFFF" }]}
      contentContainerStyle={tw`p-4 pt-12`}
    >
      {/* Account Header */}
      <AccountHeader
        userName="Aoi Todo"
        userImage={require("@/assets/images/Todo.png")}
        logoImage={require("@/assets/images/gottaminute_transparent_big.png")}
      />

      {/* Goal Cards */}
      <GoalCards goals={goals} />

      {/* Settings */}
      <Settings title="Preferences & Settings" items={settingsItems} />
    </ScrollView>
  );
}
