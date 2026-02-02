import {
  GreetingHeader,
  StartNowButton,
  NextWorkoutCard,
  TodayProgress,
  QuickPicks,
  RecentWorkouts,
  type Workout,
} from "@/components/home";
import { ScrollView, useColorScheme } from "react-native";
import tw from "twrnc";

export default function HomeScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  // Mock data - replace with actual state/API calls later
  const userName = "Luke";
  const streakDays = 5;
  const workoutsDone = 4;
  const workoutsGoal = 5;
  const minutesDone = 18;
  const minutesGoal = 30;

  const recentWorkouts: Workout[] = [
    { name: "Mobility", duration: "2 min" },
    { name: "Core", duration: "1 min" },
    { name: "Walk", duration: "2 min", category: "Cardio" },
  ];

  const handleStartNow = () => {
    console.log("Start quick workout");
    // TODO: Navigate to workout screen or start quick workout flow
  };

  const handleStartWorkout = () => {
    console.log("Start next workout");
    // TODO: Navigate to workout detail/start screen
  };

  const handleSwapWorkout = () => {
    console.log("Swap workout");
    // TODO: Show workout picker or swap to different workout
  };

  const handleQuickPick = (type: "reset" | "stretch" | "cardio" | "strength") => {
    console.log(`Quick pick: ${type}`);
    // TODO: Start corresponding quick workout
  };

  return (
    <ScrollView
      style={[tw`flex-1`, { backgroundColor: isDark ? "#111827" : "#FFFFFF" }]}
      contentContainerStyle={tw`p-4 pt-10`}
    >
      {/* Greeting Header */}
      <GreetingHeader userName={userName} streakDays={streakDays} />

      {/* Start Now Button */}
      <StartNowButton onPress={handleStartNow} />

      {/* Next Workout Card */}
      <NextWorkoutCard
        title="Push Ups"
        duration="1 min"
        category="Chest"
        difficulty="Medium"
        equipment="No equipment"
        onStart={handleStartWorkout}
        onSwap={handleSwapWorkout}
      />

      {/* Today's Progress */}
      <TodayProgress
        workoutsDone={workoutsDone}
        workoutsGoal={workoutsGoal}
        minutesDone={minutesDone}
        minutesGoal={minutesGoal}
        showStreakRing={false}
      />

      {/* Quick Picks */}
      <QuickPicks onPress={handleQuickPick} />

      {/* Recent Workouts */}
      <RecentWorkouts workouts={recentWorkouts} />
    </ScrollView>
  );
}
