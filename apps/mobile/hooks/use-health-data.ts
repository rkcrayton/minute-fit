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

  const isAvailable = Platform.OS === "ios" && AppleHealthKit != null;

  const fetchData = useCallback(() => {
    if (!AppleHealthKit) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    setIsLoading(true);

    AppleHealthKit.getStepCount(
      { date: today.toISOString() },
      (err: any, results: { value: number }) => {
        if (!err && results) {
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
        if (!err && results) {
          const total = results.reduce((sum, sample) => sum + sample.value, 0);
          setActiveEnergy(Math.round(total));
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
    });
  }, [isAvailable, fetchData]);

  useEffect(() => {
    if (!isAvailable) return;

    AppleHealthKit.initHealthKit(permissions, (err: any) => {
      if (!err) {
        setIsAuthorized(true);
        fetchData();
      }
    });
  }, [isAvailable, fetchData]);

  return {
    steps,
    activeEnergy,
    isAvailable,
    isAuthorized,
    isLoading,
    requestPermission,
    refresh: fetchData,
  };
}