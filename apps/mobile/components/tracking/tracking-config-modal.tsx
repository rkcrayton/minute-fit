import { ThemedText } from "@/components/themed-text";
import { ALL_STATS, MAX_SELECTED_STATS, type StatId } from "@/constants/tracking-stats";
import { useTrackingPreferences } from "@/contexts/tracking-preferences";
import { useThemeColor } from "@/hooks/use-theme-color";
import React, { useEffect, useState } from "react";
import { AccessibilityInfo, Dimensions, Modal, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type TrackingConfigModalProps = {
  visible: boolean;
  onClose: () => void;
};

export default function TrackingConfigModal({ visible, onClose }: TrackingConfigModalProps) {
  const { selectedIds, save } = useTrackingPreferences();
  const [draftIds, setDraftIds] = useState<StatId[]>(selectedIds);

  useEffect(() => {
    if (visible) {
      setDraftIds(selectedIds);
    }
  }, [visible, selectedIds]);

  const sheetBgColor = useThemeColor({}, "surface");
  const borderColor = useThemeColor({}, "border");
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
    AccessibilityInfo.announceForAccessibility(
      `Saved. Tracking ${draftIds.length} stat${draftIds.length !== 1 ? "s" : ""}.`
    );
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.overlay}>
        {/* Backdrop — tap to close */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        {/* Sheet — plain View so ScrollView gestures aren't blocked */}
        <View
          style={[
            styles.sheet,
            { backgroundColor: sheetBgColor, borderColor, height: SCREEN_HEIGHT * 0.75 },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <ThemedText style={styles.title}>Daily Tracking</ThemedText>
            <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
              Select up to {MAX_SELECTED_STATS} stats to display.
              {atMax ? " Deselect one to add another." : ""}
            </ThemedText>

            {/* Counter dots */}
            <View style={styles.dotsRow}>
              {ALL_STATS.map((stat) => (
                <View
                  key={stat.id}
                  style={[
                    styles.dot,
                    { backgroundColor: draftIds.includes(stat.id) ? tint : borderColor },
                  ]}
                />
              ))}
              <ThemedText style={[styles.counter, { color: textSecondary }]}>
                {draftIds.length} / {MAX_SELECTED_STATS}
              </ThemedText>
            </View>
          </View>

          {/* Scrollable stat list */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            <View style={[styles.statList, { borderColor }]}>
              {ALL_STATS.map((stat, index) => {
                const selected = draftIds.includes(stat.id);
                const disabled = !selected && atMax;
                const isLast = index === ALL_STATS.length - 1;

                return (
                  <View
                    key={stat.id}
                    style={[
                      styles.statRow,
                      !isLast && { borderBottomWidth: 1, borderBottomColor: borderColor },
                      disabled && styles.disabled,
                    ]}
                  >
                    <View style={[styles.colorDot, { backgroundColor: stat.ringColor }]} />
                    <View style={styles.statLabels}>
                      <ThemedText style={styles.statTitle}>{stat.title}</ThemedText>
                      <ThemedText style={[styles.statDesc, { color: textSecondary }]}>
                        {stat.description}
                      </ThemedText>
                    </View>
                    <Switch
                      value={selected}
                      onValueChange={() => !disabled && toggle(stat.id)}
                      disabled={disabled}
                      trackColor={{ false: borderColor, true: tint }}
                      thumbColor="#FFFFFF"
                      accessibilityLabel={`${stat.title}: ${stat.description}`}
                      accessibilityRole="switch"
                      accessibilityState={{ checked: selected, disabled }}
                    />
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer actions */}
          <View style={styles.footer}>
            <Pressable
              onPress={handleSave}
              style={styles.saveBtn}
              accessibilityRole="button"
              accessibilityLabel="Save tracking changes"
            >
              <ThemedText style={styles.saveBtnText}>Save Changes</ThemedText>
            </Pressable>
            <Pressable
              style={styles.cancelBtn}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <ThemedText style={[styles.cancelText, { opacity: 0.6 }]}>Cancel</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
  },
  header: {
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  counter: {
    fontSize: 12,
    marginLeft: 6,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  statList: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  disabled: {
    opacity: 0.4,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  statLabels: {
    flex: 1,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  statDesc: {
    fontSize: 12,
    marginTop: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  saveBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
