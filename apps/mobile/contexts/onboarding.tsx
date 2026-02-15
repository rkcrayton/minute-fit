import React, { createContext, useContext, useState } from "react";

export type UserProfile = {
  name: string;
  heightFeet: string;
  heightInches: string;
  weight: string;
};

type OnboardingContextValue = {
  hasOnboarded: boolean;
  setOnboarded: (v: boolean) => void;
  userProfile: UserProfile;
  setUserProfile: (p: UserProfile) => void;
};

const OnboardingContext = createContext<OnboardingContextValue>({
  hasOnboarded: false,
  setOnboarded: () => {},
  userProfile: { name: "", heightFeet: "", heightInches: "", weight: "" },
  setUserProfile: () => {},
});

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [hasOnboarded, setOnboarded] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "",
    heightFeet: "",
    heightInches: "",
    weight: "",
  });

  return (
    <OnboardingContext.Provider
      value={{ hasOnboarded, setOnboarded, userProfile, setUserProfile }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  return useContext(OnboardingContext);
}
