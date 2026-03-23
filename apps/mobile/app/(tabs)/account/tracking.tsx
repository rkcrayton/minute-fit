import { ALL_STATS, MAX_SELECTED_STATS, type StatId } from "@/constants/tracking-stats";
import { useTrackingPreferences } from "@/contexts/tracking-preferences";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Check } from "lucide-react-native";
import { Pressable, ScrollView, Switch, View } from "react-native";
import tw from "twrnc";
import { useState } from "react";
import { router } from "expo-router";

export default function TrackingCustomizeScreen() {
  const { selectedIds, save } = useTrackingPreferences();
  const [draftIds, setDraftIds] = useState<StatId[]>(selectedIds);

  const backgroundColor = useThemeColor({}, "background");
  const surface = useThemeColor({}, "surface");
  const border = useThemeColor({}, "border");
  const textSecondary = useThemeColor({}, "textSecondary");
  const tint = useThemeColor({}, "tint");

  const atMax = draftIds.length >= MAX_SELECTED_STATS;

  const toggle = (id: StatId) => {
    setDraftIds((prev) => {
      const isSelected = prev.includes(id);
      if (!isSelected && prev.length >= MAX_SELECTED_STATS) return prev;
      return isSelected ? prev.filter((x) => x !== id) : [...prev, id];
    });
  };

  const handleSave = () => {
    save(draftIds);
    router.back();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header info */}
      <ThemedView
        style={[
          tw`p-4 rounded-xl mb-5 border`,
          { backgroundColor: surface, borderColor: border },
        ]}
      >
        <ThemedText type="defaultSemiBold" style={tw`mb-1`}>
          Choose Your Stats
        </ThemedText>
        <ThemedText style={{ color: textSecondary, fontSize: 13, lineHeight: 20 }}>
          Select up to {MAX_SELECTED_STATS} stats to show in Daily Tracking on the home screen.
          {atMax ? " Deselect one to add another." : ""}
        </ThemedText>

        {/* Selection counter */}
        <View style={tw`flex-row items-center mt-3 gap-1`}>
          {ALL_STATS.map((stat) => {
            const selected = draftIds.includes(stat.id);
            return (
              <View
                key={stat.id}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: selected ? tint : border,
                }}
              />
            );
          })}
          <ThemedText style={{ color: textSecondary, fontSize: 12, marginLeft: 8 }}>
            {draftIds.length} / {MAX_SELECTED_STATS}
          </ThemedText>
        </View>
      </ThemedView>

      {/* Stat rows */}
      <ThemedView
        style={[
          tw`rounded-xl border overflow-hidden`,
          { backgroundColor: surface, borderColor: border },
        ]}
      >
        {ALL_STATS.map((stat, index) => {
          const selected = draftIds.includes(stat.id);
          const disabled = !selected && atMax;
          const isLast = index === ALL_STATS.length - 1;

          return (
            <View
              key={stat.id}
              style={[
                tw`flex-row items-center px-4 py-4`,
                !isLast && { borderBottomWidth: 1, borderBottomColor: border },
                disabled && { opacity: 0.4 },
              ]}
            >
              {/* Color dot */}
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: stat.ringColor,
                  marginRight: 12,
                }}
              />

              {/* Labels */}
              <View style={tw`flex-1`}>
                <ThemedText type="defaultSemiBold" style={{ fontSize: 15 }}>
                  {stat.title}
                </ThemedText>
                <ThemedText style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>
                  {stat.description}
                </ThemedText>
              </View>

              {/* Toggle */}
              <Switch
                value={selected}
                onValueChange={() => !disabled && toggle(stat.id)}
                disabled={disabled}
                trackColor={{ false: border, true: tint }}
                thumbColor="#FFFFFF"
              />
            </View>
          );
        })}
      </ThemedView>

      <ThemedText
        style={{ color: textSecondary, fontSize: 12, textAlign: "center", marginTop: 16, marginBottom: 24 }}
      >
        Apple Health stats require HealthKit permission on iOS.
      </ThemedText>

      {/* Save button */}
      <Pressable
        onPress={handleSave}
        style={{
          backgroundColor: "#2563EB",
          padding: 16,
          borderRadius: 14,
          alignItems: "center",
        }}
      >
        <ThemedText style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 16 }}>
          Save Changes
        </ThemedText>
      </Pressable>
    </ScrollView>
  );
}
