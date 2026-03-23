import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Clock, Dumbbell, TrendingUp, Package } from "lucide-react-native";
import { TouchableOpacity, View } from "react-native";
import tw from "twrnc";

export type NextWorkoutCardProps = {
  title: string;
  duration: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
  equipment: string;
  onStart?: () => void;
  onSwap?: () => void;
};

export function NextWorkoutCard({
  title,
  duration,
  category,
  difficulty,
  equipment,
  onStart,
  onSwap,
}: NextWorkoutCardProps) {
  const cardBgColor = useThemeColor({}, "surface");
  const borderColor = useThemeColor({}, "border");
  const startButtonColor = useThemeColor({}, "tint");
  const swapButtonColor = useThemeColor({}, "surfaceElevated");
  const buttonTextColor = "#FFFFFF";
  const swapTextColor = useThemeColor({}, "text");
  const iconColor = useThemeColor({}, "icon");

  const getDifficultyColor = () => {
    if (difficulty === "Easy") return "#10B981";
    if (difficulty === "Medium") return "#F59E0B";
    return "#EF4444";
  };

  return (
    <ThemedView
      style={[
        tw`p-5 rounded-xl mb-6 border`,
        { backgroundColor: cardBgColor, borderColor },
      ]}
    >
      <ThemedText type="defaultSemiBold" style={tw`mb-3 opacity-60 text-xs uppercase tracking-wide`}>
        Next Workout
      </ThemedText>

      <ThemedText type="title" style={tw`mb-4`}>
        {title}
      </ThemedText>

      <View style={tw`gap-2 mb-5`}>
        <View style={tw`flex-row items-center gap-2`}>
          <Clock size={16} color={iconColor} />
          <ThemedText style={tw`text-sm`}>{duration}</ThemedText>
        </View>
        <View style={tw`flex-row items-center gap-2`}>
          <Dumbbell size={16} color={iconColor} />
          <ThemedText style={tw`text-sm`}>{category}</ThemedText>
        </View>
        <View style={tw`flex-row items-center gap-2`}>
          <TrendingUp size={16} color={getDifficultyColor()} />
          <ThemedText style={[tw`text-sm`, { color: getDifficultyColor() }]}>
            {difficulty}
          </ThemedText>
        </View>
        <View style={tw`flex-row items-center gap-2`}>
          <Package size={16} color={iconColor} />
          <ThemedText style={tw`text-sm opacity-80`}>{equipment}</ThemedText>
        </View>
      </View>

      <View style={tw`flex-row gap-3`}>
        <TouchableOpacity
          style={[
            tw`flex-1 py-3 px-4 rounded-lg items-center`,
            { backgroundColor: startButtonColor },
          ]}
          onPress={onStart}
          activeOpacity={0.9}
        >
          <ThemedText
            type="defaultSemiBold"
            style={[tw`text-base`, { color: buttonTextColor }]}
          >
            Start
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            tw`flex-1 py-3 px-4 rounded-lg items-center border`,
            {
              backgroundColor: swapButtonColor,
              borderColor,
            },
          ]}
          onPress={onSwap}
          activeOpacity={0.9}
        >
          <ThemedText
            type="defaultSemiBold"
            style={[tw`text-base`, { color: swapTextColor }]}
          >
            Swap
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}
