import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TrackingPreferencesProvider,
  useTrackingPreferences,
} from '@/contexts/tracking-preferences';
import { DEFAULT_STAT_IDS } from '@/constants/tracking-stats';
import type { StatId } from '@/constants/tracking-stats';

// AsyncStorage is auto-mocked by jest-expo via its built-in mock.
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

function wrapper({ children }: { children: React.ReactNode }) {
  return <TrackingPreferencesProvider>{children}</TrackingPreferencesProvider>;
}

// ─── Initial load ─────────────────────────────────────────────────────────────

describe('TrackingPreferencesProvider — initial load', () => {
  it('starts with the default stat IDs before AsyncStorage resolves', () => {
    // AsyncStorage.getItem hangs so we can observe the synchronous initial state
    mockAsyncStorage.getItem.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useTrackingPreferences(), { wrapper });

    expect(result.current.selectedIds).toEqual(DEFAULT_STAT_IDS);
  });

  it('loads persisted IDs from AsyncStorage on mount', async () => {
    const persisted: StatId[] = ['steps', 'sleep', 'distance'];
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(persisted));

    const { result } = renderHook(() => useTrackingPreferences(), { wrapper });

    await waitFor(() => {
      // Once AsyncStorage resolves the state should reflect persisted data
      expect(result.current.selectedIds).toEqual(persisted);
    });
  });

  it('falls back to DEFAULT_STAT_IDS when AsyncStorage returns null', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useTrackingPreferences(), { wrapper });

    await waitFor(() => {
      expect(result.current.selectedIds).toEqual(DEFAULT_STAT_IDS);
    });
  });

  it('falls back to DEFAULT_STAT_IDS when the stored value is an empty array', async () => {
    // An empty array is treated as "no selection" — fall back to defaults
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([]));

    const { result } = renderHook(() => useTrackingPreferences(), { wrapper });

    await waitFor(() => {
      expect(result.current.selectedIds).toEqual(DEFAULT_STAT_IDS);
    });
  });
});

// ─── save ─────────────────────────────────────────────────────────────────────

describe('TrackingPreferencesProvider — save', () => {
  beforeEach(() => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(null);
  });

  it('updates in-memory state immediately on save', async () => {
    const { result } = renderHook(() => useTrackingPreferences(), { wrapper });
    await waitFor(() => expect(result.current.selectedIds).toEqual(DEFAULT_STAT_IDS));

    const newIds: StatId[] = ['steps', 'sleep'];

    act(() => {
      result.current.save(newIds);
    });

    expect(result.current.selectedIds).toEqual(newIds);
  });

  it('persists the new selection to AsyncStorage', async () => {
    const { result } = renderHook(() => useTrackingPreferences(), { wrapper });
    await waitFor(() => expect(result.current.selectedIds).toEqual(DEFAULT_STAT_IDS));

    const newIds: StatId[] = ['water', 'calories'];

    act(() => {
      result.current.save(newIds);
    });

    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      'tracking_preferences',
      JSON.stringify(newIds),
    );
  });

  it('can save a single stat', async () => {
    const { result } = renderHook(() => useTrackingPreferences(), { wrapper });
    await waitFor(() => expect(result.current.selectedIds).toEqual(DEFAULT_STAT_IDS));

    act(() => {
      result.current.save(['resting_hr']);
    });

    expect(result.current.selectedIds).toEqual(['resting_hr']);
  });

  it('can save all available stat IDs', async () => {
    const { result } = renderHook(() => useTrackingPreferences(), { wrapper });
    await waitFor(() => expect(result.current.selectedIds).toEqual(DEFAULT_STAT_IDS));

    const all: StatId[] = [
      'steps', 'water', 'calories', 'exercise_minutes',
      'distance', 'floors', 'resting_hr', 'sleep',
    ];

    act(() => {
      result.current.save(all);
    });

    expect(result.current.selectedIds).toHaveLength(8);
  });
});

// ─── useTrackingPreferences ───────────────────────────────────────────────────

describe('useTrackingPreferences — context default', () => {
  it('returns the context default when consumed outside the provider', () => {
    // The context default is the initial value passed to createContext, which
    // has selectedIds = DEFAULT_STAT_IDS and a no-op save. This verifies that
    // the default is safe to consume without a provider (no crash).
    const { result } = renderHook(() => useTrackingPreferences());

    expect(result.current.selectedIds).toEqual(DEFAULT_STAT_IDS);
    expect(typeof result.current.save).toBe('function');
  });
});
