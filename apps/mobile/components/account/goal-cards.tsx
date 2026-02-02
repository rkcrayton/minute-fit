import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ChevronRight } from "lucide-react-native";
import { TouchableOpacity, View } from "react-native";
import tw from "twrnc";

export type Goal = {
  value: string;
  label: string;
  onPress?: () => void;
};

export type GoalCardsProps = {
  goals: Goal[];
};

export function GoalCards({ goals }: GoalCardsProps) {
  const cardBgColor = useThemeColor(
    { light: "#3B82F6", dark: "#2563EB" },
    "tint",
  );
  const textColor = "#FFFFFF";

  return (
    <ThemedView style={tw`mb-6`}>
      <ThemedText type="title" style={tw`text-2xl mb-4`}>
        My Goals
      </ThemedText>

      <View style={tw`flex-row gap-3`}>
        {goals.map((goal, index) => (
          <TouchableOpacity
            key={index}
            style={[
              tw`flex-1 rounded-3xl p-6 relative justify-end min-h-20 shadow-lg overflow-hidden`,
              { backgroundColor: cardBgColor },
            ]}
            onPress={goal.onPress}
            activeOpacity={0.85}
          >

            {/* Chevron Icon  */}
            <ChevronRight
              size={18}
              color={textColor}
              style={tw`absolute top-4 right-4 opacity-70`}
            />

            {/* Goal Value */}
            <ThemedText
              type="title"
              style={[tw`justify-top text-4xl mb-2 font-bold`, { color: textColor }]}
            >
              {goal.value}
            </ThemedText>

            {/* Goal Label */}
            <ThemedText
              type="defaultSemiBold"
              style={[tw`text-sm opacity-90 leading-tight`, { color: textColor }]}
            >
              {goal.label}
            </ThemedText>

            {/* accent */}
            <View
              style={[
                tw`absolute bottom-0 left-0 right-0 h-1 opacity-20`,
                { backgroundColor: textColor },
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>
    </ThemedView>
  );
}
