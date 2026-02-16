import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useHealthData } from "@/hooks/use-health-data";
import { Heart, Footprints, Flame, Check } from "lucide-react-native";
import { TouchableOpacity, View } from "react-native";
import tw from "twrnc";

export function HealthPermissionCard() {
  // This hook handles everything — permissions, fetching data, platform checks.
  // Any component can call useHealthData() to get the same data.
  const {
    steps,
    activeEnergy,
    isAvailable,
    isAuthorized,
    requestPermission,
  } = useHealthData();

  // Theme colors — same pattern used across the app
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

  // On Android, show a "coming soon" message since we only support iOS for now
  if (!isAvailable) {
    return (
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
          Permissions
        </ThemedText>
        <ThemedText style={[tw`text-sm`, { color: subtextColor }]}>
          Health integration is currently available on iOS only. Android Health
          Connect support is coming soon.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView
      style={[
        tw`p-5 rounded-xl mb-6 border`,
        { backgroundColor: cardBgColor, borderColor },
      ]}
    >
      {/* Section title — matches the style of "Preferences & Settings" */}
      <ThemedText
        type="defaultSemiBold"
        style={tw`mb-4 opacity-60 text-xs uppercase tracking-wide`}
      >
        Permissions
      </ThemedText>

      {/* Apple Health connection row */}
      <TouchableOpacity
        style={tw`flex-row items-center justify-between mb-4`}
        onPress={isAuthorized ? undefined : requestPermission}
        activeOpacity={isAuthorized ? 1 : 0.7}
      >
        <View style={tw`flex-row items-center gap-3`}>
          {/* Icon circle — green when connected, red when not */}
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
          <View>
            <ThemedText type="defaultSemiBold" style={tw`text-base`}>
              Apple Health
            </ThemedText>
            <ThemedText style={[tw`text-xs`, { color: subtextColor }]}>
              {isAuthorized ? "Connected" : "Tap to connect"}
            </ThemedText>
          </View>
        </View>

        {/* Status badge */}
        {isAuthorized ? (
          <View
            style={[tw`px-3 py-1 rounded-full`, { backgroundColor: "#ECFDF5" }]}
          >
            <View style={tw`flex-row items-center gap-1`}>
              <Check size={14} color="#10B981" />
              <ThemedText
                style={[tw`text-xs font-semibold`, { color: "#10B981" }]}
              >
                Active
              </ThemedText>
            </View>
          </View>
        ) : (
          <View
            style={[tw`px-3 py-1 rounded-full`, { backgroundColor: "#3B82F6" }]}
          >
            <ThemedText
              style={[tw`text-xs font-semibold`, { color: "#FFFFFF" }]}
            >
              Connect
            </ThemedText>
          </View>
        )}
      </TouchableOpacity>

      {/* Health stats — only visible after user grants permission */}
      {isAuthorized && (
        <View style={tw`flex-row gap-3`}>
          {/* Steps card */}
          <View
            style={[
              tw`flex-1 p-4 rounded-xl items-center`,
              { backgroundColor: statBgColor },
            ]}
          >
            <Footprints size={22} color={accentColor} style={tw`mb-2`} />
            <ThemedText type="defaultSemiBold" style={tw`text-lg`}>
              {steps.toLocaleString()}
            </ThemedText>
            <ThemedText style={[tw`text-xs`, { color: subtextColor }]}>
              Steps Today
            </ThemedText>
          </View>

          {/* Active energy card */}
          <View
            style={[
              tw`flex-1 p-4 rounded-xl items-center`,
              { backgroundColor: statBgColor },
            ]}
          >
            <Flame size={22} color="#F97316" style={tw`mb-2`} />
            <ThemedText type="defaultSemiBold" style={tw`text-lg`}>
              {activeEnergy.toLocaleString()}
            </ThemedText>
            <ThemedText style={[tw`text-xs`, { color: subtextColor }]}>
              Cal Burned
            </ThemedText>
          </View>
        </View>
      )}
    </ThemedView>
  );
}