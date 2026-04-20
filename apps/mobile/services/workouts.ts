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

/**
 * Calculate the current workout streak (consecutive days with at least one workout).
 * Fetches recent workout history and counts backward from today/yesterday.
 */
export async function getWorkoutStreak(): Promise<number> {
  const workouts = await getRecentWorkouts(200);
  if (workouts.length === 0) return 0;

  // Collect unique local-date strings (YYYY-MM-DD)
  const uniqueDates = new Set<string>();
  for (const w of workouts) {
    const d = new Date(w.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    uniqueDates.add(key);
  }

  const sorted = Array.from(uniqueDates).sort().reverse(); // newest first

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Start counting from today, or yesterday if today has no workout yet
  let checkDate = new Date(today);
  if (sorted[0] !== todayKey) {
    // Check if the most recent workout was yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
    if (sorted[0] !== yesterdayKey) return 0;
    checkDate = yesterday;
  }

  let streak = 0;
  for (let i = 0; i < 200; i++) {
    const key = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;
    if (!uniqueDates.has(key)) break;
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
}
