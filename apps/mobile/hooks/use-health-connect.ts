import { useEffect, useState, useCallback } from "react";
import {
  initialize,
  requestPermission,
  aggregateRecord,
  aggregateGroupByPeriod,
  getSdkStatus,
} from "react-native-health-connect";

const SDK_AVAILABLE = 3; // SdkAvailabilityStatus.SDK_AVAILABLE

export function useHealthConnect() {
  const [steps, setSteps] = useState<number>(0);
  const [activeEnergy, setActiveEnergy] = useState<number>(0);
  const [exerciseMinutes, setExerciseMinutes] = useState<number>(0);
  const [distanceMiles, setDistanceMiles] = useState<number>(0);
  const [floorsClimbed, setFloorsClimbed] = useState<number>(0);
  const [restingHeartRate, setRestingHeartRate] = useState<number>(0);
  const [sleepHours, setSleepHours] = useState<number>(0);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [weeklyStepHistory, setWeeklyStepHistory] = useState<number[]>([]);

  useEffect(() => {
    async function checkAvailability() {
      try {
        const status = await getSdkStatus();
        if (status === SDK_AVAILABLE) {
          setIsAvailable(true);
          await initialize();
        }
      } catch {
        setIsAvailable(false);
      }
    }
    checkAvailability();
  }, []);

  const fetchData = useCallback(async () => {
    if (!isAuthorized) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    const timeRangeFilter = {
      operator: "between" as const,
      startTime: today.toISOString(),
      endTime: now.toISOString(),
    };

    setIsLoading(true);

    try {
      const [stepsResult, caloriesResult, exerciseResult, distanceResult, floorsResult, heartRateResult, sleepResult] =
        await Promise.allSettled([
          aggregateRecord({ recordType: "Steps", timeRangeFilter }),
          aggregateRecord({ recordType: "ActiveCaloriesBurned", timeRangeFilter }),
          aggregateRecord({ recordType: "ExerciseSession", timeRangeFilter }),
          aggregateRecord({ recordType: "Distance", timeRangeFilter }),
          aggregateRecord({ recordType: "FloorsClimbed", timeRangeFilter }),
          aggregateRecord({ recordType: "RestingHeartRate", timeRangeFilter }),
          aggregateRecord({
            recordType: "SleepSession",
            timeRangeFilter: {
              operator: "between" as const,
              startTime: new Date(today.getTime() - 18 * 3_600_000).toISOString(), // 6 PM yesterday
              endTime: now.toISOString(),
            },
          }),
        ]);

      if (stepsResult.status === "fulfilled") {
        setSteps(stepsResult.value.COUNT_TOTAL ?? 0);
      }
      if (caloriesResult.status === "fulfilled") {
        setActiveEnergy(Math.round(caloriesResult.value.ACTIVE_CALORIES_TOTAL?.inKilocalories ?? 0));
      }
      if (exerciseResult.status === "fulfilled") {
        setExerciseMinutes(Math.round((exerciseResult.value.EXERCISE_DURATION_TOTAL?.inSeconds ?? 0) / 60));
      }
      if (distanceResult.status === "fulfilled") {
        const meters = distanceResult.value.DISTANCE?.inMeters ?? 0;
        setDistanceMiles(parseFloat((meters / 1609.344).toFixed(2)));
      }
      if (floorsResult.status === "fulfilled") {
        setFloorsClimbed(floorsResult.value.FLOORS_CLIMBED_TOTAL ?? 0);
      }
      if (heartRateResult.status === "fulfilled") {
        setRestingHeartRate(heartRateResult.value.BPM_AVG ?? 0);
      }
      if (sleepResult.status === "fulfilled") {
        const durationMs = sleepResult.value.SLEEP_DURATION_TOTAL ?? 0;
        setSleepHours(parseFloat((durationMs / 3_600_000).toFixed(1)));
      }
    } catch (err) {
      console.error("Health Connect fetch failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthorized]);

  const fetchWeeklySteps = useCallback(async () => {
    if (!isAuthorized) return;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    try {
      const result = await aggregateGroupByPeriod({
        recordType: "Steps",
        timeRangeFilter: {
          operator: "between" as const,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
        timeRangeSlicer: { period: "DAYS", duration: 1 },
      });

      setWeeklyStepHistory(result.map((day) => day.result.COUNT_TOTAL ?? 0));
    } catch (err) {
      console.error("Health Connect weekly steps failed:", err);
    }
  }, [isAuthorized]);

  const requestHealthPermission = useCallback(async () => {
    if (!isAvailable) return;

    try {
      await initialize();
      const granted = await requestPermission([
        { accessType: "read", recordType: "Steps" },
        { accessType: "read", recordType: "ActiveCaloriesBurned" },
        { accessType: "read", recordType: "ExerciseSession" },
        { accessType: "read", recordType: "Distance" },
        { accessType: "read", recordType: "FloorsClimbed" },
        { accessType: "read", recordType: "RestingHeartRate" },
        { accessType: "read", recordType: "SleepSession" },
      ]);

      if (granted.length > 0) {
        setIsAuthorized(true);
      }
    } catch (err) {
      console.error("Health Connect permission request failed:", err);
    }
  }, [isAvailable]);

  useEffect(() => {
    if (isAuthorized) {
      fetchData();
      fetchWeeklySteps();
    }
  }, [isAuthorized, fetchData, fetchWeeklySteps]);

  return {
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
    isLoading,
    requestPermission: requestHealthPermission,
    refresh: () => {
      fetchData();
      fetchWeeklySteps();
    },
  };
}
