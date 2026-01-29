import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Zap, Footprints, Heart, Dumbbell } from "lucide-react-native";
import { TouchableOpacity, View } from "react-native";
import tw from "twrnc";

type QuickPickButton = {
  label: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  onPress?: () => void;
};

export type QuickPicksProps = {
  onPress?: (type: "reset" | "stretch" | "cardio" | "strength") => void;
};

export function QuickPicks({ onPress }: QuickPicksProps) {
  const cardBgColor = useThemeColor(
    { light: "#F9FAFB", dark: "#1F2937" },
    "background",
  );
  const buttonBgColor = useThemeColor(
    { light: "#FFFFFF", dark: "#374151" },
    "background",
  );
  const buttonBorderColor = useThemeColor(
    { light: "#E5E7EB", dark: "#4B5563" },
    "icon",
  );
  const iconColor = useThemeColor(
    { light: "#3B82F6", dark: "#60A5FA" },
    "tint",
  );

  const quickPicks: QuickPickButton[] = [
    { label: "1-Min Reset", icon: Zap, onPress: () => onPress?.("reset") },
    { label: "Stretch", icon: Footprints, onPress: () => onPress?.("stretch") },
    { label: "Cardio", icon: Heart, onPress: () => onPress?.("cardio") },
    { label: "Strength", icon: Dumbbell, onPress: () => onPress?.("strength") },
  ];

  return (
    <ThemedView
      style={[
        tw`p-5 rounded-xl mb-6 border`,
        { backgroundColor: cardBgColor, borderColor: buttonBorderColor },
      ]}
    >
      <ThemedText type="defaultSemiBold" style={tw`mb-4 opacity-60 text-xs uppercase tracking-wide`}>
        Quick Picks
      </ThemedText>

      <View style={tw`flex-row flex-wrap gap-3`}>
        {quickPicks.map((pick, index) => {
          const Icon = pick.icon;
          return (
            <TouchableOpacity
              key={index}
              style={[
                tw`flex-1 min-w-[42%] py-4 px-4 rounded-lg items-center border`,
                {
                  backgroundColor: buttonBgColor,
                  borderColor: buttonBorderColor,
                },
              ]}
              onPress={pick.onPress}
              activeOpacity={0.7}
            >
              <Icon size={24} color={iconColor} />
              <ThemedText type="defaultSemiBold" style={tw`text-sm mt-2`}>
                {pick.label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    </ThemedView>
  );
}
