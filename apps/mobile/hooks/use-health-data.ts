import { useEffect, useState, useCallback } from "react";
import { NativeModules, Platform } from "react-native";

const AppleHealthKit = NativeModules.AppleHealthKit;

const STEP_COUNT = "StepCount";
const ACTIVE_ENERGY = "ActiveEnergyBurned";
const EXERCISE_TIME = "AppleExerciseTime";
const DISTANCE = "DistanceWalkingRunning";
const FLIGHTS = "FlightsClimbed";
const RESTING_HR = "RestingHeartRate";
const SLEEP = "SleepAnalysis";

const permissions = {
  permissions: {
    read: [
      STEP_COUNT,
      ACTIVE_ENERGY,
      EXERCISE_TIME,
      DISTANCE,
      FLIGHTS,
      RESTING_HR,
      SLEEP,
    ],
    write: [] as string[],
  },
};

export function useHealthData() {
  const [steps, setSteps] = useState<number>(0);
  const [activeEnergy, setActiveEnergy] = useState<number>(0);
  const [exerciseMinutes, setExerciseMinutes] = useState<number>(0);
  const [distanceMiles, setDistanceMiles] = useState<number>(0);
  const [floorsClimbed, setFloorsClimbed] = useState<number>(0);
  const [restingHeartRate, setRestingHeartRate] = useState<number>(0);
  const [sleepHours, setSleepHours] = useState<number>(0);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [weeklyStepHistory, setWeeklyStepHistory] = useState<number[]>([]);

  const isAvailable = Platform.OS === "ios" && AppleHealthKit != null;

  const fetchData = useCallback(() => {
    if (!AppleHealthKit) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    const todayStart = today.toISOString();
    const todayEnd = now.toISOString();

    setIsLoading(true);

    // Steps
    AppleHealthKit.getStepCount(
      { date: todayStart },
      (err: any, results: { value: number }) => {
        if (!err && results) setSteps(Math.round(results.value));
      },
    );

    // Active calories burned
    AppleHealthKit.getActiveEnergyBurned(
      { startDate: todayStart, endDate: todayEnd },
      (err: any, results: Array<{ value: number }>) => {
        setIsLoading(false);
        if (!err && results) {
          const total = results.reduce((sum, s) => sum + s.value, 0);
          setActiveEnergy(Math.round(total));
        }
      },
    );

    // Exercise minutes
    AppleHealthKit.getAppleExerciseTime(
      { startDate: todayStart, endDate: todayEnd },
      (err: any, results: Array<{ value: number }>) => {
        if (!err && results) {
          const total = results.reduce((sum, s) => sum + s.value, 0);
          setExerciseMinutes(Math.round(total));
        }
      },
    );

    // Distance walking/running (meters → miles)
    AppleHealthKit.getDistanceWalkingRunning(
      { startDate: todayStart, endDate: todayEnd },
      (err: any, results: Array<{ value: number }>) => {
        if (!err && results) {
          const totalMeters = results.reduce((sum, s) => sum + s.value, 0);
          setDistanceMiles(parseFloat((totalMeters / 1609.344).toFixed(2)));
        }
      },
    );

    // Flights climbed
    AppleHealthKit.getFlightsClimbed(
      { startDate: todayStart, endDate: todayEnd },
      (err: any, results: Array<{ value: number }>) => {
        if (!err && results) {
          const total = results.reduce((sum, s) => sum + s.value, 0);
          setFloorsClimbed(Math.round(total));
        }
      },
    );

    // Resting heart rate (most recent sample)
    AppleHealthKit.getRestingHeartRate(
      { startDate: todayStart, endDate: todayEnd, limit: 1 },
      (err: any, results: Array<{ value: number }>) => {
        if (!err && results && results.length > 0) {
          setRestingHeartRate(Math.round(results[0].value));
        }
      },
    );

    // Sleep — sum of time spent in any asleep stage last night
    const lastNightStart = new Date(today);
    lastNightStart.setDate(lastNightStart.getDate() - 1);
    lastNightStart.setHours(18, 0, 0, 0); // 6 PM yesterday

    AppleHealthKit.getSleepSamples(
      {
        startDate: lastNightStart.toISOString(),
        endDate: todayEnd,
      },
      (err: any, results: Array<{ value: string; startDate: string; endDate: string }>) => {
        if (!err && results) {
          const asleepStages = ["ASLEEP", "ASLEEP_CORE", "ASLEEP_DEEP", "ASLEEP_REM"];
          const totalMs = results
            .filter((s) => asleepStages.includes(s.value))
            .reduce((sum, s) => {
              const ms = new Date(s.endDate).getTime() - new Date(s.startDate).getTime();
              return sum + ms;
            }, 0);
          setSleepHours(parseFloat((totalMs / 3_600_000).toFixed(1)));
        }
      },
    );
  }, []);

  const fetchWeeklySteps = useCallback(() => {
    if (!AppleHealthKit) return;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    AppleHealthKit.getDailyStepCountSamples(
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      (err: any, results: Array<{ value: number }>) => {
        if (!err && results) {
          setWeeklyStepHistory(results.map((s) => Math.round(s.value)));
        }
      },
    );
  }, []);

  const requestPermission = useCallback(() => {
    if (!isAvailable) return;

    AppleHealthKit.initHealthKit(permissions, (err: any) => {
      if (err) {
        console.error("HealthKit init failed:", err);
        return;
      }
      setIsAuthorized(true);
      fetchData();
      fetchWeeklySteps();
    });
  }, [isAvailable, fetchData, fetchWeeklySteps]);

  useEffect(() => {
    if (!isAvailable) return;

    AppleHealthKit.initHealthKit(permissions, (err: any) => {
      if (err) {
        console.error("HealthKit init failed:", err);
        return;
      }
      setIsAuthorized(true);
      fetchData();
      fetchWeeklySteps();
    });
  }, [isAvailable, fetchData, fetchWeeklySteps]);

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
    requestPermission,
    refresh: () => {
      fetchData();
      fetchWeeklySteps();
    },
  };
}
