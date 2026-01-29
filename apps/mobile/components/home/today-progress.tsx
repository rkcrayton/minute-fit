import { ProgressRing } from "@/components/progress-ring";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { View } from "react-native";
import tw from "twrnc";

export type TodayProgressProps = {
  workoutsDone: number;
  workoutsGoal: number;
  minutesDone: number;
  minutesGoal: number;
  showStreakRing?: boolean;
  streakDays?: number;
  streakGoal?: number;
};

export function TodayProgress({
  workoutsDone,
  workoutsGoal,
  minutesDone,
  minutesGoal,
  showStreakRing = false,
  streakDays = 0,
  streakGoal = 7,
}: TodayProgressProps) {
  const cardBgColor = useThemeColor(
    { light: "#F9FAFB", dark: "#1F2937" },
    "background",
  );
  const borderColor = useThemeColor(
    { light: "#E5E7EB", dark: "#374151" },
    "icon",
  );

  return (
    <ThemedView
      style={[
        tw`p-5 rounded-xl mb-6 border`,
        { backgroundColor: cardBgColor, borderColor },
      ]}
    >
      <ThemedText type="defaultSemiBold" style={tw`mb-4 opacity-60 text-xs uppercase tracking-wide`}>
        Today's Progress
      </ThemedText>

      <View style={tw`flex-row justify-around mb-4`}>
        <ProgressRing
          value={workoutsDone}
          maxValue={workoutsGoal}
          label="Workouts"
          size={100}
          strokeWidth={8}
        />
        <ProgressRing
          value={minutesDone}
          maxValue={minutesGoal}
          label="Minutes"
          unit="min"
          size={100}
          strokeWidth={8}
        />
        {showStreakRing && (
          <ProgressRing
            value={streakDays}
            maxValue={streakGoal}
            label="Streak"
            size={100}
            strokeWidth={8}
          />
        )}
      </View>

      {/* <View style={tw`flex-row justify-center gap-6`}>
        <ThemedText style={tw`text-sm opacity-70`}>
          {workoutsDone} / {workoutsGoal} workouts
        </ThemedText>
        <ThemedText style={tw`text-sm opacity-70`}>
          {minutesDone} / {minutesGoal} minutes
        </ThemedText>
      </View> */}
    </ThemedView>
  );
}
