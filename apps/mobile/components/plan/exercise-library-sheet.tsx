import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  View,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { searchLibrary, type ExerciseLibraryItem } from "@/services/workout-plans";

const EQUIPMENT_FILTERS = [
  { value: "", label: "All" },
  { value: "bodyweight", label: "Bodyweight" },
  { value: "dumbbell", label: "Dumbbell" },
  { value: "barbell", label: "Barbell" },
  { value: "machine", label: "Machine" },
];

const DIFFICULTY_FILTERS = [
  { value: "", label: "Any" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: ExerciseLibraryItem) => void;
};

export function ExerciseLibrarySheet({ visible, onClose, onSelect }: Props) {
  const tint = useThemeColor({}, "tint");
  const textColor = useThemeColor({}, "text");

  const [query, setQuery] = useState("");
  const [equipment, setEquipment] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [items, setItems] = useState<ExerciseLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const params = useMemo(
    () => ({
      q: query.trim() || undefined,
      equipment: equipment || undefined,
      difficulty: difficulty || undefined,
      limit: 30,
    }),
    [query, equipment, difficulty]
  );

  useEffect(() => {
    if (!visible) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchLibrary(params);
        setItems(data);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [visible, params]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={styles.container}>
        <View style={styles.headerRow}>
          <ThemedText type="title">Exercise library</ThemedText>
          <TouchableOpacity onPress={onClose}>
            <ThemedText style={[styles.closeText, { color: tint }]}>Close</ThemedText>
          </TouchableOpacity>
        </View>

        <TextInput
          placeholder="Search exercises…"
          placeholderTextColor="rgba(150,150,150,0.6)"
          value={query}
          onChangeText={setQuery}
          style={[styles.searchInput, { color: textColor }]}
          autoCapitalize="none"
        />

        <View style={styles.filterRow}>
          {EQUIPMENT_FILTERS.map((f) => {
            const selected = equipment === f.value;
            return (
              <Pressable
                key={f.value || "all"}
                onPress={() => setEquipment(f.value)}
                style={[
                  styles.filterBlock,
                  selected && { backgroundColor: tint, borderColor: tint },
                ]}
              >
                <ThemedText
                  style={[
                    styles.filterBlockText,
                    selected && { color: "#FFFFFF" },
                  ]}
                >
                  {f.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.filterRow}>
          {DIFFICULTY_FILTERS.map((f) => {
            const selected = difficulty === f.value;
            return (
              <Pressable
                key={f.value || "any"}
                onPress={() => setDifficulty(f.value)}
                style={[
                  styles.filterBlock,
                  selected && { backgroundColor: tint, borderColor: tint },
                ]}
              >
                <ThemedText
                  style={[
                    styles.filterBlockText,
                    selected && { color: "#FFFFFF" },
                  ]}
                >
                  {f.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 16 }} />
        ) : (
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {items.length === 0 ? (
              <ThemedText style={styles.empty}>No exercises match your filters.</ThemedText>
            ) : (
              items.map((ex) => (
                <TouchableOpacity
                  key={ex.id}
                  style={styles.row}
                  onPress={() => onSelect(ex)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText type="defaultSemiBold">{ex.name}</ThemedText>
                    <ThemedText style={styles.rowMeta}>
                      {ex.primary_muscle}
                      {ex.equipment ? ` · ${ex.equipment}` : ""}
                    </ThemedText>
                  </View>
                  <View style={[styles.badge, { borderColor: tint }]}>
                    <ThemedText style={[styles.badgeText, { color: tint }]}>
                      {ex.difficulty}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        )}
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  closeText: { fontWeight: "700", fontSize: 15 },

  searchInput: {
    borderWidth: 1,
    borderColor: "rgba(150,150,150,0.3)",
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
  },

  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingVertical: 4 },
  filterBlock: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(150,150,150,0.3)",
  },
  filterBlockText: { fontSize: 13, fontWeight: "600", textAlign: "center" },

  list: { flex: 1 },
  listContent: { paddingVertical: 8, gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(150,150,150,0.2)",
  },
  rowMeta: { opacity: 0.65, fontSize: 12 },

  badge: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: "700", textTransform: "capitalize" },

  empty: { opacity: 0.6, textAlign: "center", marginTop: 24 },
});
