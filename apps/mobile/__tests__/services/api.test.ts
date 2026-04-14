/**
 * Tests for the api service module — getBaseURL function.
 *
 * Note on EXPO_PUBLIC_* env vars: Expo's babel preset inlines
 * `process.env.EXPO_PUBLIC_*` at compile time (not at runtime), so these
 * variables cannot be injected via `process.env` mutation in Jest.
 * The env-var branch is a build-time concern documented separately.
 *
 * We test the Platform.OS runtime branching, which IS readable at call time
 * because `Platform.OS` is a live property on the mocked react-native object.
 */

// Mock react-native BEFORE the module under test is imported so that
// the api module sees a predictable Platform object we can mutate per-test.
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  NativeModules: {},
}));

import { Platform } from 'react-native';
import { getBaseURL } from '@/services/api';

describe('getBaseURL — Platform.OS branching', () => {
  beforeEach(() => {
    (Platform as any).OS = 'ios'; // reset to iOS default before each test
  });

  it('returns the Android emulator loopback address when Platform.OS is "android"', () => {
    (Platform as any).OS = 'android';
    expect(getBaseURL()).toBe('http://10.0.2.2:8000');
  });

  it('returns localhost when Platform.OS is "ios"', () => {
    (Platform as any).OS = 'ios';
    expect(getBaseURL()).toBe('http://localhost:8000');
  });

  it('returns localhost for any non-android platform (e.g. "web")', () => {
    (Platform as any).OS = 'web';
    expect(getBaseURL()).toBe('http://localhost:8000');
  });

  it('android-specific URL is different from the iOS/default URL', () => {
    (Platform as any).OS = 'android';
    const androidUrl = getBaseURL();

    (Platform as any).OS = 'ios';
    const iosUrl = getBaseURL();

    expect(androidUrl).not.toBe(iosUrl);
  });
});
