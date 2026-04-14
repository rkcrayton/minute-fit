/**
 * Tests for useHealthData hook.
 *
 * Key design constraint: `isAvailable` is computed inside the hook body on each
 * render (`Platform.OS === 'ios' && AppleHealthKit != null`), so we can control
 * it by mutating Platform.OS before each renderHook call.
 *
 * We avoid jest.resetModules() + dynamic import() because babel-jest does not
 * support --experimental-vm-modules. A static import + Platform mutation is
 * sufficient since isAvailable is evaluated per-render, not at module load.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { NativeModules, Platform } from 'react-native';
import { useHealthData } from '@/hooks/use-health-data';

const mockAppleHealthKit = NativeModules.AppleHealthKit as {
  initHealthKit: jest.Mock;
  getStepCount: jest.Mock;
  getActiveEnergyBurned: jest.Mock;
  getAppleExerciseTime: jest.Mock;
  getDistanceWalkingRunning: jest.Mock;
  getFlightsClimbed: jest.Mock;
  getRestingHeartRate: jest.Mock;
  getSleepSamples: jest.Mock;
  getDailyStepCountSamples: jest.Mock;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Sets up all HealthKit callbacks to succeed with neutral/zero data. */
function setUpSuccessfulHealthKit() {
  mockAppleHealthKit.initHealthKit.mockImplementation((_p: any, cb: (err: any) => void) => cb(null));
  mockAppleHealthKit.getStepCount.mockImplementation((_o: any, cb: any) => cb(null, { value: 0 }));
  mockAppleHealthKit.getActiveEnergyBurned.mockImplementation((_o: any, cb: any) => cb(null, []));
  mockAppleHealthKit.getAppleExerciseTime.mockImplementation((_o: any, cb: any) => cb(null, []));
  mockAppleHealthKit.getDistanceWalkingRunning.mockImplementation((_o: any, cb: any) => cb(null, { value: 0 }));
  mockAppleHealthKit.getFlightsClimbed.mockImplementation((_o: any, cb: any) => cb(null, { value: 0 }));
  mockAppleHealthKit.getRestingHeartRate.mockImplementation((_o: any, cb: any) => cb(null, []));
  mockAppleHealthKit.getSleepSamples.mockImplementation((_o: any, cb: any) => cb(null, []));
  mockAppleHealthKit.getDailyStepCountSamples.mockImplementation((_o: any, cb: any) => cb(null, []));
}

// ─── Non-iOS environment ──────────────────────────────────────────────────────

describe('useHealthData — non-iOS platform', () => {
  beforeEach(() => {
    (Platform as any).OS = 'android';
  });

  afterEach(() => {
    (Platform as any).OS = 'ios';
  });

  it('reports isAvailable = false on Android', () => {
    const { result } = renderHook(() => useHealthData());
    expect(result.current.isAvailable).toBe(false);
  });

  it('never calls initHealthKit on non-iOS platforms', () => {
    renderHook(() => useHealthData());
    expect(mockAppleHealthKit.initHealthKit).not.toHaveBeenCalled();
  });

  it('returns zero for all health metrics', () => {
    const { result } = renderHook(() => useHealthData());
    expect(result.current.steps).toBe(0);
    expect(result.current.activeEnergy).toBe(0);
    expect(result.current.exerciseMinutes).toBe(0);
    expect(result.current.distanceMiles).toBe(0);
    expect(result.current.floorsClimbed).toBe(0);
    expect(result.current.restingHeartRate).toBe(0);
    expect(result.current.sleepHours).toBe(0);
    expect(result.current.weeklyStepHistory).toEqual([]);
  });

  it('requestPermission is a no-op on non-iOS platforms', () => {
    const { result } = renderHook(() => useHealthData());
    act(() => { result.current.requestPermission(); });
    expect(mockAppleHealthKit.initHealthKit).not.toHaveBeenCalled();
  });
});

// ─── iOS — HealthKit available ────────────────────────────────────────────────

describe('useHealthData — iOS with HealthKit', () => {
  beforeEach(() => {
    (Platform as any).OS = 'ios';
    setUpSuccessfulHealthKit();
  });

  it('reports isAvailable = true on iOS with HealthKit module present', () => {
    const { result } = renderHook(() => useHealthData());
    expect(result.current.isAvailable).toBe(true);
  });

  it('calls initHealthKit on mount and sets isAuthorized = true on success', async () => {
    const { result } = renderHook(() => useHealthData());

    await waitFor(() => {
      expect(mockAppleHealthKit.initHealthKit).toHaveBeenCalledTimes(1);
      expect(result.current.isAuthorized).toBe(true);
    });
  });

  it('does NOT set isAuthorized when initHealthKit returns an error', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockAppleHealthKit.initHealthKit.mockImplementationOnce((_p: any, cb: any) => {
      cb(new Error('HealthKit unavailable'));
    });

    const { result } = renderHook(() => useHealthData());

    await waitFor(() => expect(mockAppleHealthKit.initHealthKit).toHaveBeenCalled());
    expect(result.current.isAuthorized).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith('HealthKit init failed:', expect.any(Error));
    errorSpy.mockRestore();
  });

  it('rounds step count to the nearest integer', async () => {
    mockAppleHealthKit.getStepCount.mockImplementation((_o: any, cb: any) =>
      cb(null, { value: 7842.7 }),
    );

    const { result } = renderHook(() => useHealthData());

    await waitFor(() => expect(result.current.steps).toBe(7843));
  });

  it('sums all active-energy samples and rounds to nearest integer', async () => {
    mockAppleHealthKit.getActiveEnergyBurned.mockImplementation((_o: any, cb: any) =>
      cb(null, [{ value: 150.3 }, { value: 220.8 }]),
    );

    const { result } = renderHook(() => useHealthData());

    // 150.3 + 220.8 = 371.1 → 371
    await waitFor(() => expect(result.current.activeEnergy).toBe(371));
  });

  it('converts distance from meters to miles with 2 decimal places', async () => {
    // 4828.032 m = exactly 3.00 miles (4828.032 / 1609.344)
    mockAppleHealthKit.getDistanceWalkingRunning.mockImplementation((_o: any, cb: any) =>
      cb(null, { value: 4828.032 }),
    );

    const { result } = renderHook(() => useHealthData());

    await waitFor(() => expect(result.current.distanceMiles).toBe(3.0));
  });

  it('counts only asleep stages when computing sleep hours', async () => {
    const start = new Date('2024-01-15T23:00:00Z');
    const end = new Date('2024-01-16T07:00:00Z'); // 8 hrs

    mockAppleHealthKit.getSleepSamples.mockImplementation((_o: any, cb: any) =>
      cb(null, [
        { value: 'ASLEEP', startDate: start.toISOString(), endDate: end.toISOString() },
        // AWAKE should be ignored
        {
          value: 'AWAKE',
          startDate: new Date('2024-01-16T03:00:00Z').toISOString(),
          endDate: new Date('2024-01-16T03:30:00Z').toISOString(),
        },
      ]),
    );

    const { result } = renderHook(() => useHealthData());

    await waitFor(() => expect(result.current.sleepHours).toBe(8.0));
  });

  it('counts ASLEEP_CORE, ASLEEP_DEEP, and ASLEEP_REM stages', async () => {
    const hour = 3_600_000; // ms per hour

    mockAppleHealthKit.getSleepSamples.mockImplementation((_o: any, cb: any) =>
      cb(null, [
        { value: 'ASLEEP_CORE', startDate: new Date(0).toISOString(), endDate: new Date(2 * hour).toISOString() },
        { value: 'ASLEEP_DEEP', startDate: new Date(0).toISOString(), endDate: new Date(1.5 * hour).toISOString() },
        { value: 'ASLEEP_REM',  startDate: new Date(0).toISOString(), endDate: new Date(0.5 * hour).toISOString() },
      ]),
    );

    const { result } = renderHook(() => useHealthData());

    // 2 + 1.5 + 0.5 = 4.0 hrs
    await waitFor(() => expect(result.current.sleepHours).toBe(4.0));
  });

  it('populates weeklyStepHistory from getDailyStepCountSamples, rounding each value', async () => {
    mockAppleHealthKit.getDailyStepCountSamples.mockImplementation((_o: any, cb: any) =>
      cb(null, [{ value: 5000 }, { value: 8200.6 }, { value: 10000 }]),
    );

    const { result } = renderHook(() => useHealthData());

    await waitFor(() => {
      expect(result.current.weeklyStepHistory).toEqual([5000, 8201, 10000]);
    });
  });

  it('refresh() triggers a new round of data fetching', async () => {
    const { result } = renderHook(() => useHealthData());

    await waitFor(() => expect(result.current.isAuthorized).toBe(true));

    const callsBefore = mockAppleHealthKit.getStepCount.mock.calls.length;

    act(() => { result.current.refresh(); });

    await waitFor(() => {
      expect(mockAppleHealthKit.getStepCount.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });
});
