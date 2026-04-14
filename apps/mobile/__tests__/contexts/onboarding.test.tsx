import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { OnboardingProvider, useOnboarding, type UserProfile } from '@/contexts/onboarding';

function wrapper({ children }: { children: React.ReactNode }) {
  return <OnboardingProvider>{children}</OnboardingProvider>;
}

const EMPTY_PROFILE: UserProfile = {
  firstName: '',
  lastName: '',
  heightFeet: '',
  heightInches: '',
  weight: '',
  age: '',
};

// ─── Initial state ────────────────────────────────────────────────────────────

describe('OnboardingProvider — initial state', () => {
  it('starts with hasOnboarded = false', () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });
    expect(result.current.hasOnboarded).toBe(false);
  });

  it('starts with an empty user profile', () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });
    expect(result.current.userProfile).toEqual(EMPTY_PROFILE);
  });
});

// ─── setOnboarded ─────────────────────────────────────────────────────────────

describe('useOnboarding — setOnboarded', () => {
  it('sets hasOnboarded to true', () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    act(() => {
      result.current.setOnboarded(true);
    });

    expect(result.current.hasOnboarded).toBe(true);
  });

  it('can be toggled back to false', () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    act(() => { result.current.setOnboarded(true); });
    act(() => { result.current.setOnboarded(false); });

    expect(result.current.hasOnboarded).toBe(false);
  });
});

// ─── setUserProfile ───────────────────────────────────────────────────────────

describe('useOnboarding — setUserProfile', () => {
  it('replaces the user profile with the provided values', () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    const profile: UserProfile = {
      firstName: 'Jane',
      lastName: 'Doe',
      heightFeet: '5',
      heightInches: '6',
      weight: '135',
      age: '30',
    };

    act(() => {
      result.current.setUserProfile(profile);
    });

    expect(result.current.userProfile).toEqual(profile);
  });

  it('can update individual fields by spreading the existing profile', () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    const initial: UserProfile = {
      firstName: 'John',
      lastName: '',
      heightFeet: '',
      heightInches: '',
      weight: '',
      age: '',
    };

    act(() => { result.current.setUserProfile(initial); });
    act(() => {
      result.current.setUserProfile({ ...result.current.userProfile, lastName: 'Smith' });
    });

    expect(result.current.userProfile.firstName).toBe('John');
    expect(result.current.userProfile.lastName).toBe('Smith');
  });
});

// ─── Context default (outside provider) ──────────────────────────────────────

describe('useOnboarding — context default', () => {
  it('returns safe defaults when consumed outside the provider', () => {
    const { result } = renderHook(() => useOnboarding());

    expect(result.current.hasOnboarded).toBe(false);
    expect(result.current.userProfile).toEqual(EMPTY_PROFILE);
    expect(typeof result.current.setOnboarded).toBe('function');
    expect(typeof result.current.setUserProfile).toBe('function');
  });
});
