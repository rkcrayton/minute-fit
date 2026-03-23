import {
  GreetingHeader,
  StartNowButton,
  NextWorkoutCard,
  TodayProgress,
  QuickPicks,
  RecentWorkouts,
  type Workout,
} from "@/components/home";
import TrackingSection, {
  type TrackingItem,
} from "@/components/tracking/tracking-section";
import WaterLogModal from "@/components/tracking/water-log-modal";
import { useAuth } from "@/contexts/auth";
import { useHealthData } from "@/hooks/use-health-data";
import { getAdaptiveStepGoal } from "@/services/tracking-goals";
import { createWaterLog, getTodayWaterSummary } from "@/services/water";
import { ScrollView, useColorScheme } from "react-native";
import { useMemo, useState, useEffect, useCallback } from "react";
import tw from "twrnc";

export default function HomeScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const { user } = useAuth();

  const {
    steps,
    activeEnergy,
    weeklyStepHistory,
    isAvailable,
    isAuthorized,
    requestPermission,
  } = useHealthData();

  const userName = user?.first_name ?? user?.username ?? "User";

  // TODO: Replace with real data once workout models exist in the backend
  const streakDays = 0;
  const workoutsDone = 0;
  const workoutsGoal = 5;
  const minutesDone = 0;
  const minutesGoal = 30;

  const [waterOz, setWaterOz] = useState(0);
  const [isWaterLoading, setIsWaterLoading] = useState(false);
  const [isWaterModalVisible, setIsWaterModalVisible] = useState(false);

  const parsedWeight = user?.weight != null ? Number(user.weight) : null;
  const hasValidWeight =
    parsedWeight !== null && Number.isFinite(parsedWeight) && parsedWeight > 0;
  const initialWaterGoal = hasValidWeight ? Math.round(parsedWeight / 2) : 64;
  const [waterGoal, setWaterGoal] = useState(initialWaterGoal);

  const caloriesGoal = 500;

  const stepGoal = useMemo(
    () => getAdaptiveStepGoal(weeklyStepHistory),
    [weeklyStepHistory],
  );

  const loadWaterSummary = useCallback(async () => {
    try {
      setIsWaterLoading(true);
      const summary = await getTodayWaterSummary();
      setWaterOz(summary.total_oz);
      setWaterGoal(summary.goal_oz);
    } catch (error) {
      console.error("Failed to load water summary:", error);
    } finally {
      setIsWaterLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWaterSummary();
  }, [loadWaterSummary]);

  const handleAddWater = useCallback(
    async (amountOz: number) => {
      try {
        await createWaterLog({ amount_oz: amountOz });
        setWaterOz((prev) => prev + amountOz);
      } catch (error) {
        console.error("Failed to log water:", error);
      }
    },
    [],
  );

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

  const handleQuickPick = (
    type: "reset" | "stretch" | "cardio" | "strength",
  ) => {
    console.log(`Quick pick: ${type}`);
    // TODO: Start corresponding quick workout
  };

  const trackingItems: TrackingItem[] = useMemo(
    () => [
      {
        id: "steps",
        title: "Steps",
        value: steps,
        goal: stepGoal,
        unit: "",
        subtitle: !isAvailable
          ? "Health data not available on this device"
          : isAuthorized
            ? "Synced from Apple Health"
            : "Connect Apple Health to sync your steps",
        buttonLabel: isAvailable && !isAuthorized ? "Connect Health" : undefined,
        onPressButton:
          isAvailable && !isAuthorized ? requestPermission : undefined,
        ringColor: "#22C55E",
      },
      {
        id: "water",
        title: "Water",
        value: waterOz,
        goal: waterGoal,
        unit: "oz",
        subtitle: isWaterLoading
          ? "Loading today's water"
          : "Tap to log water intake",
        onPressCard: () => setIsWaterModalVisible(true),
        ringColor: "#3B82F6",
      },
      {
        id: "calories",
        title: "Calories Burned",
        value: activeEnergy,
        goal: caloriesGoal,
        unit: "cal",
        subtitle: "Calories burned through activity today",
        ringColor: "#F97316",
      },
    ],
    [
      steps,
      stepGoal,
      isAvailable,
      isAuthorized,
      requestPermission,
      waterOz,
      waterGoal,
      isWaterLoading,
      activeEnergy,
      caloriesGoal,
    ],
  );

  return (
    <> 
      <ScrollView
        style={[tw`flex-1`, { backgroundColor: isDark ? "#111827" : "#FFFFFF" }]}
        contentContainerStyle={tw`p-4 pt-10`}
      >
        <GreetingHeader userName={userName} streakDays={streakDays} />

        <StartNowButton onPress={handleStartNow} />

        <NextWorkoutCard
          title="Push Ups"
          duration="1 min"
          category="Chest"
          difficulty="Medium"
          equipment="No equipment"
          onStart={handleStartWorkout}
          onSwap={handleSwapWorkout}
        />

        <TodayProgress
          workoutsDone={workoutsDone}
          workoutsGoal={workoutsGoal}
          minutesDone={minutesDone}
          minutesGoal={minutesGoal}
          showStreakRing={false}
        />

        <TrackingSection
          title="Daily Tracking"
          items={trackingItems}
          layout="grid"
        />

        <QuickPicks onPress={handleQuickPick} />

        <RecentWorkouts workouts={recentWorkouts} />
      </ScrollView>

      <WaterLogModal
        visible={isWaterModalVisible}
        currentOz={waterOz}
        goalOz={waterGoal}
        onClose={() => setIsWaterModalVisible(false)}
        onAddWater={handleAddWater}
      />
    </>
  );
}