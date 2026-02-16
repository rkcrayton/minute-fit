import { useEffect, useState, useCallback } from "react";
import { NativeModules, Platform } from "react-native";

// -- WHY WE ACCESS NativeModules DIRECTLY --
// react-native-health's index.js does this:
//   const { AppleHealthKit } = require('react-native').NativeModules
//   export const HealthKit = Object.assign({}, AppleHealthKit, { Constants: {...} })
//
// If the native module isn't loaded yet when that runs, AppleHealthKit is undefined,
// and Object.assign({}, undefined, ...) silently drops all the methods.
// So we grab it directly from NativeModules ourselves.

const AppleHealthKit = NativeModules.AppleHealthKit;

// Permission constants — these string values match what the native module expects.
// They come from react-native-health's src/constants/Permissions.js
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

  // Fetch today's data from HealthKit
  const fetchData = useCallback(() => {
    if (!AppleHealthKit) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    setIsLoading(true);

    // getStepCount — returns total steps for the given date
    AppleHealthKit.getStepCount(
      { date: today.toISOString() },
      (err: any, results: { value: number }) => {
        if (!err && results) {
          setSteps(Math.round(results.value));
        }
      },
    );

    // getActiveEnergyBurned — returns array of calorie samples for date range
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

  // Request permission — triggers the native iOS health permission popup
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

  // On mount, try to initialize silently.
  // If the user already granted permission, this succeeds with no popup.
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