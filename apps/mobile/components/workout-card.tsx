import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { TouchableOpacity } from "react-native";
import tw from "twrnc";

export type WorkoutCardProps = {
  title: string;
  duration: string;
  description?: string;
  onPress?: () => void;
};

export function WorkoutCard({
  title,
  duration,
  description,
  onPress,
}: WorkoutCardProps) {
  const cardBgColor = useThemeColor(
    { light: "#E0F2FE", dark: "#1E3A5F" },
    "background",
  );
  const buttonBgColor = useThemeColor(
    { light: "#1D4ED8", dark: "#3B82F6" },
    "tint",
  );
  const buttonTextColor = "#FFFFFF";

  return (
    <ThemedView
      style={[
        tw`p-5 rounded-xl mb-6 shadow-md`,
        { backgroundColor: cardBgColor },
      ]}
    >
      <ThemedText type="subtitle" style={tw`mb-2 opacity-70`}>
        Next Workout
      </ThemedText>
      <ThemedText type="title" style={tw`mb-1`}>
        {title}
      </ThemedText>
      <ThemedText style={tw`mb-4 text-sm opacity-80`}>{duration}</ThemedText>

      {description && (
        <ThemedText style={tw`mb-4 text-sm leading-5`}>
          {description}
        </ThemedText>
      )}

      <TouchableOpacity
        style={[
          tw`py-3 px-6 rounded-lg items-center`,
          { backgroundColor: buttonBgColor },
        ]}
        onPress={onPress}
      >
        <ThemedText
          type="defaultSemiBold"
          style={[tw`text-base`, { color: buttonTextColor }]}
        >
          DO WORKOUT
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}
