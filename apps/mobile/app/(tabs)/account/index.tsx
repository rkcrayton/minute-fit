import { ScrollView, Alert } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";
import { router } from "expo-router";
import { AccountHeader, GoalCards, Settings, type Goal, type SettingsItem } from "@/components/account";
import { useAuth } from "@/contexts/auth";
import { useOnboarding } from "@/contexts/onboarding";
import { useHealthData } from "@/hooks/use-health-data";
import { useAvatarPicker } from "@/hooks/use-avatar-picker";
import { getBaseURL } from "@/services/api";
import tw from "twrnc";

export default function AccountScreen() {
  const { user, token, logout, avatarVersion } = useAuth();
  const backgroundColor = useThemeColor({}, "background");
  const { setOnboarded } = useOnboarding();
  const { steps, activeEnergy, isAuthorized } = useHealthData();
  const { showPicker } = useAvatarPicker();

  const avatarImage = user?.profile_picture
    ? { uri: `${getBaseURL()}/users/me/avatar?v=${avatarVersion}`, headers: { Authorization: `Bearer ${token}` } }
    : require("@/assets/images/Todo.png");

  // Goal cards pull real data from HealthKit when connected,
  // otherwise show "--" to indicate no data yet
  const goals: Goal[] = [
    {
      value: isAuthorized ? steps.toLocaleString() : "--",
      label: "Steps Today",
      onPress: () => console.log("Daily Steps pressed"),
    },
    {
      value: isAuthorized ? `${activeEnergy}` : "--",
      label: "Cal Burned",
      onPress: () => console.log("Calories pressed"),
    },
  ];

  function handleLogout() {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await logout();
          setOnboarded(false);
          router.replace("/(onboarding)" as any);
        },
      },
    ]);
  }

  const settingsItems: SettingsItem[] = [
    { label: "Daily Tracking", onPress: () => router.push("/(tabs)/account/tracking" as any) },
    { label: "Health", onPress: () => router.push("/(tabs)/account/health" as any) },
    { label: "Focus Mode", onPress: () => alert("Focus Mode Pressed") },
    { label: "Workouts/Week", onPress: () => alert("Workouts/Week Pressed") },
    { label: "Duration", onPress: () => alert("Duration Pressed") },
    { label: "Exercise Variability", onPress: () => alert("Exercise Variability Pressed") },
    { label: "Payment Method", onPress: () => alert("Payment Method Pressed") },
    { label: "My Gear", onPress: () => alert("My Gear Pressed") },
    { label: "Subscription", onPress: () => alert("Subscription Pressed") },
    { label: "Profile Info", onPress: () => router.push("/(tabs)/account/profile" as any) },
    { label: "Log out", onPress: handleLogout },
  ];

  return (
    <ScrollView
      style={[tw`flex-1`, { backgroundColor }]}
      contentContainerStyle={tw`p-4 pt-12`}
    >
      <AccountHeader
        userName={[user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username || "User"}
        userImage={avatarImage}
        logoImage={require("@/assets/images/gottaminute_transparent_big.png")}
        onAvatarPress={showPicker}
      />

      <GoalCards goals={goals} />

      <Settings title="Preferences & Settings" items={settingsItems} />
    </ScrollView>
  );
}
