import '@testing-library/jest-native/extend-expect';
import { NativeModules } from 'react-native';

// Provide the official AsyncStorage Jest mock so the native module
// doesn't attempt to link during tests.
jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Mock expo-secure-store (manual mock in __mocks__ handles the rest,
// but we keep NativeModules-level mocks here for react-native internals)

// Mock NativeModules.AppleHealthKit for use-health-data hook tests
NativeModules.AppleHealthKit = {
  initHealthKit: jest.fn(),
  getStepCount: jest.fn(),
  getActiveEnergyBurned: jest.fn(),
  getAppleExerciseTime: jest.fn(),
  getDistanceWalkingRunning: jest.fn(),
  getFlightsClimbed: jest.fn(),
  getRestingHeartRate: jest.fn(),
  getSleepSamples: jest.fn(),
  getDailyStepCountSamples: jest.fn(),
};

// Silence console.error noise from React Native warnings in tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = (...args: any[]) => {
    // Suppress known noisy warnings
    const message = args[0]?.toString() ?? '';
    if (
      message.includes('Warning:') ||
      message.includes('ReactDOM.render') ||
      message.includes('act(')
    ) {
      return;
    }
    originalConsoleError(...args);
  };
});

afterEach(() => {
  console.error = originalConsoleError;
  jest.clearAllMocks();
});
