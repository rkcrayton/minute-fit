import { getTodaySummary, getRecentWorkouts, logWorkout } from '@/services/workouts';

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import api from '@/services/api';
const mockedApi = api as jest.Mocked<typeof api>;

// ─── getTodaySummary ──────────────────────────────────────────────────────────

describe('getTodaySummary', () => {
  it('calls GET /workout-plans/me/today-summary with a tz param and returns data', async () => {
    const payload = {
      day: 'monday',
      is_rest_day: false,
      exercises: [],
      next_exercise: null,
      workouts_done_today: 2,
      workouts_goal_today: 4,
    };
    mockedApi.get.mockResolvedValueOnce({ data: payload });

    const result = await getTodaySummary();

    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    const [url, config] = mockedApi.get.mock.calls[0];
    expect(url).toBe('/workout-plans/me/today-summary');
    expect(config?.params).toHaveProperty('tz');
    expect(typeof config?.params.tz).toBe('string');
    expect(result).toEqual(payload);
  });

  it('returns data on a rest day', async () => {
    const payload = {
      day: 'sunday',
      is_rest_day: true,
      exercises: [],
      next_exercise: null,
      workouts_done_today: 0,
      workouts_goal_today: 0,
    };
    mockedApi.get.mockResolvedValueOnce({ data: payload });

    const result = await getTodaySummary();

    expect(result.is_rest_day).toBe(true);
    expect(result.exercises).toEqual([]);
  });

  it('propagates network errors', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'));
    await expect(getTodaySummary()).rejects.toThrow('Network Error');
  });
});

// ─── getRecentWorkouts ────────────────────────────────────────────────────────

describe('getRecentWorkouts', () => {
  it('calls GET /user-exercises/recent with default limit of 3', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] });

    await getRecentWorkouts();

    expect(mockedApi.get).toHaveBeenCalledWith('/user-exercises/recent', {
      params: { limit: 3 },
    });
  });

  it('forwards a custom limit', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] });

    await getRecentWorkouts(10);

    expect(mockedApi.get).toHaveBeenCalledWith('/user-exercises/recent', {
      params: { limit: 10 },
    });
  });

  it('returns the workouts array from the response', async () => {
    const workouts = [
      { name: 'Push-ups', primary_muscle: 'chest', duration_seconds: 60, created_at: '2026-04-13T10:00:00Z' },
    ];
    mockedApi.get.mockResolvedValueOnce({ data: workouts });

    const result = await getRecentWorkouts();

    expect(result).toEqual(workouts);
  });

  it('returns an empty array when the user has no recent workouts', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] });

    const result = await getRecentWorkouts();

    expect(result).toEqual([]);
  });

  it('propagates network errors', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'));
    await expect(getRecentWorkouts()).rejects.toThrow('Network Error');
  });
});

// ─── logWorkout ───────────────────────────────────────────────────────────────

describe('logWorkout', () => {
  it('calls POST /user-exercises/ with the exercise id and default duration of 60s', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} });

    await logWorkout(42);

    expect(mockedApi.post).toHaveBeenCalledTimes(1);
    expect(mockedApi.post).toHaveBeenCalledWith('/user-exercises/', {
      exercise_id: 42,
      duration_seconds: 60,
    });
  });

  it('forwards a custom duration', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} });

    await logWorkout(7, 120);

    expect(mockedApi.post).toHaveBeenCalledWith('/user-exercises/', {
      exercise_id: 7,
      duration_seconds: 120,
    });
  });

  it('resolves without returning a value (void)', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} });

    const result = await logWorkout(1);

    expect(result).toBeUndefined();
  });

  it('propagates server errors', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('Request failed with status code 422'));
    await expect(logWorkout(99)).rejects.toThrow('422');
  });
});
