import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Play } from "lucide-react-native";
import { TouchableOpacity, View } from "react-native";
import tw from "twrnc";

export type StartNowButtonProps = {
  onPress?: () => void;
};

export function StartNowButton({ onPress }: StartNowButtonProps) {
  const buttonBgColor = useThemeColor(
    { light: "#3B82F6", dark: "#2563EB" },
    "tint",
  );
  const buttonTextColor = "#FFFFFF";

  return (
    <ThemedView style={tw`mb-6`}>
      <TouchableOpacity
        style={[
          tw`p-5 rounded-2xl shadow-lg`,
          { backgroundColor: buttonBgColor },
        ]}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <View style={tw`flex-row items-center justify-center gap-3 mb-1`}>
          <Play size={24} color={buttonTextColor} fill={buttonTextColor} />
          <ThemedText
            type="title"
            style={[tw`text-xl`, { color: buttonTextColor }]}
          >
            START NOW
          </ThemedText>
        </View>
        <ThemedText
          style={[tw`text-sm text-center opacity-90`, { color: buttonTextColor }]}
        >
          Quick Workout • 1 minute
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}
