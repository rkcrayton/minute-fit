import api from "./api";

export type TodayExercise = {
  exercise_id: number;
  name: string;
  primary_muscle: string;
  difficulty: string;
  times_per_day: number;
  done_today: number;
  duration_seconds: number;
};

export type TodaySummary = {
  day: string;
  is_rest_day: boolean;
  exercises: TodayExercise[];
  next_exercise: TodayExercise | null;
  workouts_done_today: number;
  workouts_goal_today: number;
};

export async function getTodaySummary(): Promise<TodaySummary> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const res = await api.get("/workout-plans/me/today-summary", { params: { tz } });
  return res.data;
}

export type RecentWorkout = {
  name: string;
  primary_muscle: string;
  duration_seconds: number;
  created_at: string;
};

export async function getRecentWorkouts(limit = 3): Promise<RecentWorkout[]> {
  const res = await api.get("/user-exercises/recent", { params: { limit } });
  return res.data;
}

export async function logWorkout(exerciseId: number, durationSeconds = 60): Promise<void> {
  await api.post("/user-exercises/", {
    exercise_id: exerciseId,
    duration_seconds: durationSeconds,
  });
}
