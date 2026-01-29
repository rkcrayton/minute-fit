import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Flame } from "lucide-react-native";
import { View } from "react-native";
import tw from "twrnc";

export type GreetingHeaderProps = {
  userName: string;
  streakDays: number;
};

export function GreetingHeader({ userName, streakDays }: GreetingHeaderProps) {
  const textColor = useThemeColor({ light: "#111827", dark: "#F9FAFB" }, "text");
  const accentColor = useThemeColor({ light: "#EF4444", dark: "#F87171" }, "tint");

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <ThemedView style={tw`my-6`}>
      <ThemedText type="title" style={[tw`mb-2`, { color: textColor }]}>
        {getGreeting()}, {userName}
      </ThemedText>
      <View style={tw`flex-row items-center gap-2`}>
        <Flame size={18} color={accentColor} fill={accentColor} />
        <ThemedText type="defaultSemiBold" style={tw`opacity-70`}>
          {streakDays} day streak
        </ThemedText>
      </View>
    </ThemedView>
  );
}
