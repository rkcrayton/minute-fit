import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { logWorkout } from "@/services/workouts";
import { ChevronLeft, CheckCircle } from "lucide-react-native";
import Svg, { Circle } from "react-native-svg";

type Phase = "ready" | "running" | "done" | "logging";

const TIMER_SIZE = 240;
const STROKE_WIDTH = 12;
const RADIUS = (TIMER_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function WorkoutScreen() {
  const params = useLocalSearchParams<{
    exerciseId: string;
    name: string;
    primaryMuscle: string;
    difficulty: string;
    timesPerDay: string;
    doneToday: string;
    durationSeconds: string;
  }>();

  const exerciseId = Number(params.exerciseId);
  const name = params.name ?? "Exercise";
  const primaryMuscle = params.primaryMuscle ?? "";
  const difficulty = params.difficulty ?? "easy";
  const timesPerDay = Number(params.timesPerDay ?? 1);
  const doneToday = Number(params.doneToday ?? 0);
  const durationSeconds = Number(params.durationSeconds ?? 60);

  const roundNumber = doneToday + 1; // 1-based current round

  const [phase, setPhase] = useState<Phase>("ready");
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressAnim = useRef(new Animated.Value(1)).current;

  const tint = useThemeColor({}, "tint");
  const surface = useThemeColor({}, "surface");
  const border = useThemeColor({}, "border");
  const textColor = useThemeColor({}, "text");
  const iconColor = useThemeColor({}, "icon");
  const successColor = "#10B981";

  const getDifficultyColor = () => {
    if (difficulty === "easy") return "#10B981";
    if (difficulty === "medium") return "#F59E0B";
    return "#EF4444";
  };

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    setPhase("running");
    setSecondsLeft(durationSeconds);

    Animated.timing(progressAnim, {
      toValue: 0,
      duration: durationSeconds * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [durationSeconds, progressAnim, clearTimer]);

  // Watch for timer reaching 0
  useEffect(() => {
    if (phase === "running" && secondsLeft === 0) {
      handleTimerComplete();
    }
  }, [secondsLeft, phase]);

  const handleTimerComplete = useCallback(async () => {
    clearTimer();
    setPhase("logging");
    try {
      await logWorkout(exerciseId, durationSeconds);
    } catch (e) {
      Alert.alert("Error", "Could not save your workout. Please try again.");
    }
    setPhase("done");
  }, [exerciseId, durationSeconds, clearTimer]);

  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  const handleBack = () => {
    clearTimer();
    router.back();
  };

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeDisplay =
    durationSeconds >= 60
      ? `${minutes}:${secs.toString().padStart(2, "0")}`
      : `${secondsLeft}`;

  return (
    <ThemedView style={styles.container}>
      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <ChevronLeft size={28} color={iconColor} />
      </TouchableOpacity>

      {/* Header info */}
      <View style={styles.header}>
        <View style={[styles.difficultyBadge, { borderColor: getDifficultyColor() }]}>
          <ThemedText style={[styles.difficultyText, { color: getDifficultyColor() }]}>
            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
          </ThemedText>
        </View>
        <ThemedText style={styles.roundLabel}>
          Round {roundNumber} of {timesPerDay}
        </ThemedText>
      </View>

      {/* Exercise name */}
      <ThemedText type="title" style={styles.exerciseName}>
        {name}
      </ThemedText>
      <ThemedText style={styles.muscleText}>{primaryMuscle}</ThemedText>

      {/* Timer ring */}
      <View style={styles.timerContainer}>
        {phase === "done" || phase === "logging" ? (
          <View style={styles.doneCircle}>
            <CheckCircle
              size={80}
              color={successColor}
              fill={successColor + "22"}
            />
          </View>
        ) : (
          <>
            <View style={StyleSheet.absoluteFill}>
              <Svg width={TIMER_SIZE} height={TIMER_SIZE}>
                {/* Background track */}
                <Circle
                  cx={TIMER_SIZE / 2}
                  cy={TIMER_SIZE / 2}
                  r={RADIUS}
                  stroke={border}
                  strokeWidth={STROKE_WIDTH}
                  fill="none"
                />
                {/* Progress arc */}
                <AnimatedCircle
                  cx={TIMER_SIZE / 2}
                  cy={TIMER_SIZE / 2}
                  r={RADIUS}
                  stroke={tint}
                  strokeWidth={STROKE_WIDTH}
                  fill="none"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  rotation="-90"
                  origin={`${TIMER_SIZE / 2}, ${TIMER_SIZE / 2}`}
                />
              </Svg>
            </View>
          </>
        )}

        {/* Time centered over ring */}
        {phase !== "done" && phase !== "logging" && (
          <View style={styles.timerTextCenter}>
            <ThemedText style={styles.timerText}>{timeDisplay}</ThemedText>
          </View>
        )}

        {phase === "done" && (
          <ThemedText style={[styles.doneText, { color: successColor }]}>
            Done!
          </ThemedText>
        )}
        {phase === "logging" && (
          <ThemedText style={styles.loggingText}>Saving...</ThemedText>
        )}
      </View>

      {/* Instructions */}
      {phase === "ready" && (
        <ThemedText style={styles.instructions}>
          Do {name.toLowerCase()} continuously for {durationSeconds} seconds.
          Go at a comfortable pace.
        </ThemedText>
      )}

      {/* Action button */}
      <View style={styles.actions}>
        {phase === "ready" && (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: tint }]}
            onPress={startTimer}
            activeOpacity={0.85}
          >
            <ThemedText style={styles.primaryButtonText}>Start</ThemedText>
          </TouchableOpacity>
        )}

        {phase === "running" && (
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: border, backgroundColor: surface }]}
            onPress={() => {
              clearTimer();
              setPhase("ready");
              setSecondsLeft(durationSeconds);
              progressAnim.setValue(1);
            }}
            activeOpacity={0.85}
          >
            <ThemedText style={styles.secondaryButtonText}>Reset</ThemedText>
          </TouchableOpacity>
        )}

        {phase === "done" && (
          <>
            {roundNumber < timesPerDay ? (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: tint }]}
                onPress={() => {
                  setPhase("ready");
                  setSecondsLeft(durationSeconds);
                  progressAnim.setValue(1);
                  // Pass updated doneToday so round counter increments
                  router.replace({
                    pathname: "/workout",
                    params: {
                      ...params,
                      doneToday: String(doneToday + 1),
                    },
                  });
                }}
                activeOpacity={0.85}
              >
                <ThemedText style={styles.primaryButtonText}>
                  Next Round ({roundNumber + 1}/{timesPerDay})
                </ThemedText>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: successColor }]}
                onPress={handleBack}
                activeOpacity={0.85}
              >
                <ThemedText style={styles.primaryButtonText}>All Done!</ThemedText>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: border, backgroundColor: surface }]}
              onPress={handleBack}
              activeOpacity={0.85}
            >
              <ThemedText style={styles.secondaryButtonText}>Back to Home</ThemedText>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  backButton: {
    position: "absolute",
    top: 56,
    left: 16,
    padding: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  difficultyBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: "600",
  },
  roundLabel: {
    fontSize: 14,
    opacity: 0.6,
  },
  exerciseName: {
    textAlign: "center",
    marginBottom: 6,
  },
  muscleText: {
    fontSize: 15,
    opacity: 0.6,
    marginBottom: 40,
  },
  timerContainer: {
    width: TIMER_SIZE,
    height: TIMER_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  timerTextCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  timerText: {
    fontSize: 56,
    fontWeight: "700",
    letterSpacing: -2,
    lineHeight: 60,
    includeFontPadding: false,
  },
  timerSublabel: {
    fontSize: 13,
    opacity: 0.5,
    marginTop: 2,
  },
  doneCircle: {
    width: TIMER_SIZE,
    height: TIMER_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  doneText: {
    position: "absolute",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 8,
    bottom: 20,
  },
  loggingText: {
    position: "absolute",
    fontSize: 16,
    opacity: 0.5,
    bottom: 20,
  },
  instructions: {
    textAlign: "center",
    opacity: 0.6,
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  actions: {
    width: "100%",
    gap: 12,
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: "600",
  },
});
