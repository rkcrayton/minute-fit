import { View, Switch, useColorScheme, Platform } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useHealthData } from "@/hooks/use-health-data";
import { Heart, Footprints, Flame } from "lucide-react-native";
import tw from "twrnc";

export default function HealthSettingsScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const {
    steps,
    activeEnergy,
    isAvailable,
    isAuthorized,
    requestPermission,
  } = useHealthData();

  const cardBgColor = useThemeColor(
    { light: "#F9FAFB", dark: "#1F2937" },
    "background",
  );
  const borderColor = useThemeColor(
    { light: "#E5E7EB", dark: "#374151" },
    "icon",
  );
  const subtextColor = useThemeColor(
    { light: "#6B7280", dark: "#9CA3AF" },
    "icon",
  );
  const statBgColor = useThemeColor(
    { light: "#F3F4F6", dark: "#111827" },
    "background",
  );
  const accentColor = useThemeColor(
    { light: "#10B981", dark: "#34D399" },
    "tint",
  );

  const handleToggle = (value: boolean) => {
    if (value && !isAuthorized) {
      requestPermission();
    }
  };

  return (
    <View
      style={[
        tw`flex-1 p-4`,
        { backgroundColor: isDark ? "#111827" : "#FFFFFF" },
      ]}
    >
      {/* Apple Health Connection Toggle */}
      <ThemedView
        style={[
          tw`p-5 rounded-xl mb-6 border`,
          { backgroundColor: cardBgColor, borderColor },
        ]}
      >
        <View style={tw`flex-row items-center justify-between`}>
          <View style={tw`flex-row items-center gap-3 flex-1`}>
            <View
              style={[
                tw`w-10 h-10 rounded-full items-center justify-center`,
                { backgroundColor: isAuthorized ? "#ECFDF5" : "#FEF2F2" },
              ]}
            >
              <Heart
                size={20}
                color={isAuthorized ? "#10B981" : "#EF4444"}
                fill={isAuthorized ? "#10B981" : "none"}
              />
            </View>
            <View style={tw`flex-1`}>
              <ThemedText type="defaultSemiBold" style={tw`text-base`}>
                {Platform.OS === "ios" ? "Apple Health" : "Health Connect"}
              </ThemedText>
              <ThemedText style={[tw`text-xs`, { color: subtextColor }]}>
                {isAuthorized
                  ? "Connected — syncing steps & activity"
                  : isAvailable
                    ? "Enable to sync your health data"
                    : "Not available on this device"}
              </ThemedText>
            </View>
          </View>

          <Switch
            value={isAuthorized}
            onValueChange={handleToggle}
            disabled={!isAvailable || isAuthorized}
            trackColor={{ false: "#767577", true: "#10B981" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </ThemedView>

      {/* Data being synced — visible when connected */}
      {isAuthorized && (
        <ThemedView
          style={[
            tw`p-5 rounded-xl mb-6 border`,
            { backgroundColor: cardBgColor, borderColor },
          ]}
        >
          <ThemedText
            type="defaultSemiBold"
            style={tw`mb-4 opacity-60 text-xs uppercase tracking-wide`}
          >
            Today's Data
          </ThemedText>

          <View style={tw`gap-4`}>
            {/* Steps row */}
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-row items-center gap-3`}>
                <View
                  style={[
                    tw`w-10 h-10 rounded-xl items-center justify-center`,
                    { backgroundColor: statBgColor },
                  ]}
                >
                  <Footprints size={20} color={accentColor} />
                </View>
                <View>
                  <ThemedText type="defaultSemiBold">Steps</ThemedText>
                  <ThemedText style={[tw`text-xs`, { color: subtextColor }]}>
                    Total today
                  </ThemedText>
                </View>
              </View>
              <ThemedText type="defaultSemiBold" style={tw`text-lg`}>
                {steps.toLocaleString()}
              </ThemedText>
            </View>

            {/* Divider */}
            <View style={[tw`h-px`, { backgroundColor: borderColor }]} />

            {/* Active Energy row */}
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-row items-center gap-3`}>
                <View
                  style={[
                    tw`w-10 h-10 rounded-xl items-center justify-center`,
                    { backgroundColor: statBgColor },
                  ]}
                >
                  <Flame size={20} color="#F97316" />
                </View>
                <View>
                  <ThemedText type="defaultSemiBold">Active Energy</ThemedText>
                  <ThemedText style={[tw`text-xs`, { color: subtextColor }]}>
                    Calories burned
                  </ThemedText>
                </View>
              </View>
              <ThemedText type="defaultSemiBold" style={tw`text-lg`}>
                {activeEnergy.toLocaleString()}
              </ThemedText>
            </View>
          </View>
        </ThemedView>
      )}

      {/* Info note */}
      <ThemedView style={tw`px-2`}>
        <ThemedText style={[tw`text-xs leading-relaxed`, { color: subtextColor }]}>
          {isAuthorized
            ? "GottaMinute reads your step count and active energy from Apple Health. You can manage permissions in your device's Settings > Health > Data Access."
            : "Connect Apple Health to automatically track your steps and calories burned. GottaMinute will only read data — we never write to your health records."}
        </ThemedText>
      </ThemedView>
    </View>
  );
}