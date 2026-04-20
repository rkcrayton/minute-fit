import api from "./api";

// ----- Shared types ------------------------------------------------------

export type PlanEntry = {
  exercise_id: number;
  times_per_day: number;
  duration_seconds: number;
  order: number;
};

export type PlanEntryEnriched = PlanEntry & {
  name: string;
  primary_muscle: string;
  difficulty: string;
  equipment?: string | null;
  image_url?: string | null;
};

export type PlanSchedule = Record<string, PlanEntryEnriched[]>;

export type GenerationPrefs = {
  days_per_week: number;
  minutes_per_session: number;
  equipment: string[];
  avoid?: string | null;
  goal?: string | null;
};

export type WorkoutPlan = {
  id: number;
  title: string;
  subtitle?: string | null;
  schedule: PlanSchedule;
  generation_prefs?: GenerationPrefs | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ExerciseLibraryItem = {
  id: number;
  name: string;
  primary_muscle: string;
  secondary_muscle?: string | null;
  tertiary_muscle?: string | null;
  difficulty: string;
  equipment?: string | null;
  category?: string | null;
  description?: string | null;
  image_url?: string | null;
};

export const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type Day = (typeof DAYS)[number];

// ----- API --------------------------------------------------------------

export async function getMyPlan(): Promise<WorkoutPlan | null> {
  try {
    const res = await api.get("/workout-plans/me");
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

type PutPlanPayload = {
  title?: string;
  subtitle?: string | null;
  schedule: Record<string, PlanEntry[]>;
};

export async function putMyPlan(plan: PutPlanPayload): Promise<WorkoutPlan> {
  const res = await api.put("/workout-plans/me", plan);
  return res.data;
}

export async function patchDay(day: Day, entries: PlanEntry[]): Promise<WorkoutPlan> {
  const res = await api.patch(`/workout-plans/me/day/${day}`, { entries });
  return res.data;
}

export async function deleteMyPlan(): Promise<void> {
  await api.delete("/workout-plans/me");
}

export async function generatePlan(prefs: GenerationPrefs): Promise<WorkoutPlan> {
  const res = await api.post("/workout-plans/generate", prefs);
  return res.data;
}

export type LibraryQuery = {
  q?: string;
  muscle?: string;
  equipment?: string;
  category?: string;
  difficulty?: string;
  limit?: number;
  offset?: number;
};

export async function searchLibrary(params: LibraryQuery = {}): Promise<ExerciseLibraryItem[]> {
  const res = await api.get("/exercises/library", { params });
  return res.data;
}

export async function getTodaySummary() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const res = await api.get("/workout-plans/me/today-summary", { params: { tz } });
  return res.data;
}
