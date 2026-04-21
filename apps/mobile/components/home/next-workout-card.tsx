import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Clock, Dumbbell, TrendingUp, Package } from "lucide-react-native";
import { TouchableOpacity, View } from "react-native";
import tw from "twrnc";

export type NextWorkoutCardProps = {
  title: string;
  subtitle?: string;
  duration?: string;
  category?: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  equipment?: string;
  onStart?: () => void;
};

export function NextWorkoutCard({
  title,
  subtitle,
  duration,
  category,
  difficulty,
  equipment,
  onStart,
}: NextWorkoutCardProps) {
  const cardBgColor = useThemeColor({}, "surface");
  const borderColor = useThemeColor({}, "border");
  const startButtonColor = useThemeColor({}, "tint");
  const buttonTextColor = "#FFFFFF";
  const iconColor = useThemeColor({}, "icon");

  const getDifficultyColor = () => {
    if (difficulty === "Easy") return "#10B981";
    if (difficulty === "Medium") return "#F59E0B";
    return "#EF4444";
  };

  const showDetails = duration || category || difficulty || equipment;

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

      <ThemedText type="title" style={tw`${showDetails ? "mb-4" : "mb-1"}`}>
        {title}
      </ThemedText>

      {subtitle && (
        <ThemedText style={tw`opacity-60 mb-4`}>{subtitle}</ThemedText>
      )}

      {showDetails && (
        <View style={tw`gap-2 mb-5`}>
          {duration && (
            <View style={tw`flex-row items-center gap-2`}>
              <Clock size={16} color={iconColor} />
              <ThemedText style={tw`text-sm`}>{duration}</ThemedText>
            </View>
          )}
          {category && (
            <View style={tw`flex-row items-center gap-2`}>
              <Dumbbell size={16} color={iconColor} />
              <ThemedText style={tw`text-sm`}>{category}</ThemedText>
            </View>
          )}
          {difficulty && (
            <View style={tw`flex-row items-center gap-2`}>
              <TrendingUp size={16} color={getDifficultyColor()} />
              <ThemedText style={[tw`text-sm`, { color: getDifficultyColor() }]}>
                {difficulty}
              </ThemedText>
            </View>
          )}
          {equipment && (
            <View style={tw`flex-row items-center gap-2`}>
              <Package size={16} color={iconColor} />
              <ThemedText style={tw`text-sm opacity-80`}>{equipment}</ThemedText>
            </View>
          )}
        </View>
      )}

      {onStart && (
        <TouchableOpacity
          style={[
            tw`py-3 px-4 rounded-lg items-center`,
            { backgroundColor: startButtonColor },
          ]}
          onPress={onStart}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={`Start ${title}`}
          accessibilityHint="Begins this workout"
        >
          <ThemedText
            type="defaultSemiBold"
            style={[tw`text-base`, { color: buttonTextColor }]}
          >
            Start
          </ThemedText>
        </TouchableOpacity>
      )}
    </ThemedView>
  );
}
