import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { CheckCircle2 } from "lucide-react-native";
import { View } from "react-native";
import tw from "twrnc";

export type Workout = {
  name: string;
  duration: string;
  category?: string;
};

export type RecentWorkoutsProps = {
  workouts: Workout[];
};

export function RecentWorkouts({ workouts }: RecentWorkoutsProps) {
  const cardBgColor = useThemeColor(
    { light: "#F9FAFB", dark: "#1F2937" },
    "background",
  );
  const borderColor = useThemeColor(
    { light: "#E5E7EB", dark: "#374151" },
    "icon",
  );
  const iconColor = useThemeColor(
    { light: "#10B981", dark: "#34D399" },
    "tint",
  );

  return (
    <ThemedView
      style={[
        tw`p-5 rounded-xl mb-6 border`,
        { backgroundColor: cardBgColor, borderColor },
      ]}
    >
      <ThemedText type="defaultSemiBold" style={tw`mb-4 opacity-60 text-xs uppercase tracking-wide`}>
        Recent Workouts
      </ThemedText>

      {workouts.length === 0 ? (
        <ThemedText style={tw`text-center opacity-60 py-4`}>
          No recent workouts yet
        </ThemedText>
      ) : (
        <View style={tw`gap-3`}>
          {workouts.map((workout, index) => (
            <View
              key={index}
              style={tw`flex-row items-center gap-3`}
            >
              <CheckCircle2 size={18} color={iconColor} />
              <View style={tw`flex-1`}>
                <ThemedText type="defaultSemiBold">
                  {workout.name}
                </ThemedText>
                {workout.category && (
                  <ThemedText style={tw`text-xs opacity-60 mt-0.5`}>
                    {workout.category}
                  </ThemedText>
                )}
              </View>
              <ThemedText style={tw`text-sm opacity-70`}>
                {workout.duration}
              </ThemedText>
            </View>
          ))}
        </View>
      )}
    </ThemedView>
  );
}
