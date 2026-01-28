import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ProgressRing } from "@/components/progress-ring";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { WorkoutCard } from "@/components/workout-card";
import { Image } from "react-native";
import tw from "twrnc";

export default function HomeScreen() {
  // Example stats (replace with state/props later)
  const totalWorkoutsDone = 3;
  const totalMinutes = 7;

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
      headerImage={
        <Image
          source={require("@/assets/images/stopwatch.png")}
          style={tw`absolute bottom-0 left-0 h-60 w-64`}
        />
      }
    >
      {/* Title */}
      <ThemedView style={tw`flex-row items-center gap-2 mb-6`}>
        <ThemedText type="title">GottaMinute</ThemedText>
      </ThemedView>

      {/* Next Workout Card */}
      <WorkoutCard
        title="Push Ups"
        duration="1 Minute"
        description="To target your chest, do some push ups."
        onPress={() => alert("Start 1-minute workout!")}
      />

      {/* Daily Stats */}
      <ThemedView style={tw`flex-row justify-around mb-6`}>
        <ProgressRing
          value={totalWorkoutsDone}
          maxValue={10}
          label="Workouts Done"
        />
        <ProgressRing
          value={totalMinutes}
          maxValue={60}
          label="Minutes"
          unit="min"
        />
      </ThemedView>
    </ParallaxScrollView>
  );
}
