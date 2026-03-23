import { useEffect, useState, useCallback } from "react";
import { NativeModules, Platform } from "react-native";

const AppleHealthKit = NativeModules.AppleHealthKit;

const STEP_COUNT = "StepCount";
const ACTIVE_ENERGY = "ActiveEnergyBurned";

const permissions = {
  permissions: {
    read: [STEP_COUNT, ACTIVE_ENERGY],
    write: [] as string[],
  },
};

export function useHealthData() {
  const [steps, setSteps] = useState<number>(0);
  const [activeEnergy, setActiveEnergy] = useState<number>(0);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [weeklyStepHistory, setWeeklyStepHistory] = useState<number[]>([]);

  const isAvailable = Platform.OS === "ios" && AppleHealthKit != null;

  const fetchData = useCallback(() => {
    if (!AppleHealthKit) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    setIsLoading(true);

    AppleHealthKit.getStepCount(
      { date: today.toISOString() },
      (err: any, results: { value: number }) => {
        if (err) {
          console.error("Failed to fetch step count:", err);
          return;
        }

        if (results) {
          setSteps(Math.round(results.value));
        }
      },
    );

    AppleHealthKit.getActiveEnergyBurned(
      {
        startDate: today.toISOString(),
        endDate: new Date().toISOString(),
      },
      (err: any, results: Array<{ value: number }>) => {
        setIsLoading(false);

        if (err) {
          console.error("Failed to fetch active energy:", err);
          return;
        }

        if (results) {
          const total = results.reduce((sum, sample) => sum + sample.value, 0);
          setActiveEnergy(Math.round(total));
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
        if (err) {
          console.error("Failed to fetch weekly step history:", err);
          return;
        }

        if (results) {
          const history = results.map((sample) => Math.round(sample.value));
          setWeeklyStepHistory(history);
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