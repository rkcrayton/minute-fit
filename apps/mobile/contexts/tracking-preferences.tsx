import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  DEFAULT_STAT_IDS,
  type StatId,
} from "@/constants/tracking-stats";

const STORAGE_KEY = "tracking_preferences";

type TrackingPreferencesContextValue = {
  selectedIds: StatId[];
  save: (ids: StatId[]) => void;
};

const TrackingPreferencesContext = createContext<TrackingPreferencesContextValue>({
  selectedIds: DEFAULT_STAT_IDS,
  save: () => {},
});

export function TrackingPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [selectedIds, setSelectedIds] = useState<StatId[]>(DEFAULT_STAT_IDS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        const parsed = JSON.parse(raw) as StatId[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedIds(parsed);
        }
      }
    });
  }, []);

  const save = useCallback((ids: StatId[]) => {
    setSelectedIds(ids);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, []);

  return (
    <TrackingPreferencesContext.Provider value={{ selectedIds, save }}>
      {children}
    </TrackingPreferencesContext.Provider>
  );
}

export function useTrackingPreferences() {
  return useContext(TrackingPreferencesContext);
}
