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
import TrackingConfigModal from "@/components/tracking/tracking-config-modal";
import { ALL_STATS, type StatId } from "@/constants/tracking-stats";
import { useAuth } from "@/contexts/auth";
import { useTrackingPreferences } from "@/contexts/tracking-preferences";
import { useHealthData } from "@/hooks/use-health-data";
import {
  DEFAULT_CALORIES_GOAL,
  DEFAULT_DISTANCE_GOAL_MI,
  DEFAULT_EXERCISE_GOAL_MIN,
  DEFAULT_FLOORS_GOAL,
  DEFAULT_SLEEP_GOAL_HRS,
  getAdaptiveStepGoal,
} from "@/services/tracking-goals";
import { createWaterLog, getTodayWaterSummary } from "@/services/water";
import { ScrollView } from "react-native";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useThemeColor } from "@/hooks/use-theme-color";
import tw from "twrnc";

export default function HomeScreen() {
  const { user } = useAuth();
  const backgroundColor = useThemeColor({}, "background");

  const {
    steps,
    activeEnergy,
    exerciseMinutes,
    distanceMiles,
    floorsClimbed,
    restingHeartRate,
    sleepHours,
    weeklyStepHistory,
    isAvailable,
    isAuthorized,
    requestPermission,
  } = useHealthData();

  const { selectedIds } = useTrackingPreferences();

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
  const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);

  const parsedWeight = user?.weight != null ? Number(user.weight) : null;
  const hasValidWeight =
    parsedWeight !== null && Number.isFinite(parsedWeight) && parsedWeight > 0;
  const initialWaterGoal = hasValidWeight ? Math.round(parsedWeight / 2) : 64;
  const [waterGoal, setWaterGoal] = useState(initialWaterGoal);

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

  const handleAddWater = useCallback(async (amountOz: number) => {
    try {
      await createWaterLog({ amount_oz: amountOz });
      setWaterOz((prev) => prev + amountOz);
    } catch (error) {
      console.error("Failed to log water:", error);
    }
  }, []);

  const recentWorkouts: Workout[] = [
    { name: "Mobility", duration: "2 min" },
    { name: "Core", duration: "1 min" },
    { name: "Walk", duration: "2 min", category: "Cardio" },
  ];

  const handleStartNow = () => {
    console.log("Start quick workout");
  };

  const handleStartWorkout = () => {
    console.log("Start next workout");
  };

  const handleSwapWorkout = () => {
    console.log("Swap workout");
  };

  const handleQuickPick = (
    type: "reset" | "stretch" | "cardio" | "strength",
  ) => {
    console.log(`Quick pick: ${type}`);
  };

  const healthUnavailableSubtitle = !isAvailable
    ? "Health data not available on this device"
    : isAuthorized
      ? undefined
      : "Connect Apple Health to sync";

  const connectButton = isAvailable && !isAuthorized
    ? { buttonLabel: "Connect Health", onPressButton: requestPermission }
    : {};

  const buildTrackingItem = useCallback(
    (id: StatId): TrackingItem => {
      const def = ALL_STATS.find((s) => s.id === id)!;

      switch (id) {
        case "steps":
          return {
            id,
            title: def.title,
            value: steps,
            goal: stepGoal,
            unit: def.unit,
            subtitle: healthUnavailableSubtitle ?? "Synced from Apple Health",
            ringColor: def.ringColor,
            icon: def.icon,
            ...connectButton,
          };
        case "water":
          return {
            id,
            title: def.title,
            value: waterOz,
            goal: waterGoal,
            unit: def.unit,
            subtitle: isWaterLoading ? "Loading today's water" : "Tap to log water intake",
            onPressCard: () => setIsWaterModalVisible(true),
            ringColor: def.ringColor,
            icon: def.icon,
          };
        case "calories":
          return {
            id,
            title: def.title,
            value: activeEnergy,
            goal: DEFAULT_CALORIES_GOAL,
            unit: def.unit,
            subtitle: healthUnavailableSubtitle ?? "Calories burned today",
            ringColor: def.ringColor,
            icon: def.icon,
          };
        case "exercise_minutes":
          return {
            id,
            title: def.title,
            value: exerciseMinutes,
            goal: DEFAULT_EXERCISE_GOAL_MIN,
            unit: def.unit,
            subtitle: healthUnavailableSubtitle ?? "Active minutes today",
            ringColor: def.ringColor,
            icon: def.icon,
          };
        case "distance":
          return {
            id,
            title: def.title,
            value: distanceMiles,
            goal: DEFAULT_DISTANCE_GOAL_MI,
            unit: def.unit,
            subtitle: healthUnavailableSubtitle ?? "Miles walked or run today",
            ringColor: def.ringColor,
            icon: def.icon,
          };
        case "floors":
          return {
            id,
            title: def.title,
            value: floorsClimbed,
            goal: DEFAULT_FLOORS_GOAL,
            unit: def.unit,
            subtitle: healthUnavailableSubtitle ?? "Flights climbed today",
            ringColor: def.ringColor,
            icon: def.icon,
          };
        case "resting_hr":
          return {
            id,
            title: def.title,
            value: restingHeartRate,
            goal: undefined,
            unit: def.unit,
            subtitle: healthUnavailableSubtitle ?? "Most recent reading",
            ringColor: def.ringColor,
            icon: def.icon,
          };
        case "sleep":
          return {
            id,
            title: def.title,
            value: sleepHours,
            goal: DEFAULT_SLEEP_GOAL_HRS,
            unit: def.unit,
            subtitle: healthUnavailableSubtitle ?? "Hours slept last night",
            ringColor: def.ringColor,
            icon: def.icon,
          };
      }
    },
    [
      steps, stepGoal, waterOz, waterGoal, isWaterLoading,
      activeEnergy, exerciseMinutes, distanceMiles, floorsClimbed,
      restingHeartRate, sleepHours, isAvailable, isAuthorized, requestPermission,
    ],
  );

  const trackingItems = useMemo(
    () => selectedIds.map(buildTrackingItem),
    [selectedIds, buildTrackingItem],
  );

  return (
    <>
      <ScrollView
        style={[tw`flex-1`, { backgroundColor }]}
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
          onConfigure={() => setIsConfigModalVisible(true)}
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

      <TrackingConfigModal
        visible={isConfigModalVisible}
        onClose={() => setIsConfigModalVisible(false)}
      />
    </>
  );
}
