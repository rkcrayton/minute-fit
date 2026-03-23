import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
  Pressable,
  useColorScheme,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import api from "@/services/api";
import { useAuth } from "@/contexts/auth";

type ScanResult = {
  session_id: string;
  measurements: Record<string, number>;
  body_composition: {
    bmi: number;
    body_fat_percentage: number;
    fat_mass_lbs: number;
    lean_mass_lbs: number;
    waist_to_hip_ratio: number;
  };
  health_assessment: {
    category: string;
    risk_level: string;
    recommendation: string;
  };
  created_at?: string;
};

function prettyLabel(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtNum(v: unknown) {
  if (typeof v === "number") return Number.isFinite(v) ? v.toFixed(1) : String(v);
  return String(v ?? "");
}

const GREEN = "#22c55e";
const RED = "#ef4444";

function getCompositionColor(
  key: string,
  value: number,
  category: string,
  gender: string | null,
  neutralColor: string,
): string {
  if (!Number.isFinite(value)) return neutralColor;
  switch (key) {
    case "bmi":
      if (value >= 18.5 && value <= 24.9) return GREEN;
      if (value < 15.0 || value >= 30.0) return RED;
      return neutralColor;
    case "body_fat_percentage":
    case "fat_mass_lbs":
      if (category === "Athletic" || category === "Fit") return GREEN;
      if (category === "Obese") return RED;
      return neutralColor;
    case "lean_mass_lbs":
      if (category === "Athletic" || category === "Fit") return GREEN;
      return neutralColor;
    case "waist_to_hip_ratio": {
      const isMale = gender === "male";
      const isFemale = gender === "female";
      if (isMale) {
        if (value < 0.90) return GREEN;
        if (value < 1.00) return neutralColor;
        return RED;
      }
      if (isFemale) {
        if (value < 0.80) return GREEN;
        if (value < 0.85) return neutralColor;
        return RED;
      }
      if (value < 0.85) return GREEN;
      if (value < 0.95) return neutralColor;
      return RED;
    }
    default:
      return neutralColor;
  }
}

function getMeasurementColor(
  key: string,
  value: number,
  category: string,
  gender: string | null,
  neutralColor: string,
): string {
  if (!Number.isFinite(value)) return neutralColor;
  const isMale = gender === "male";
  const isFemale = gender === "female";
  switch (key) {
    case "waist": {
      const [g, r] = isMale ? [35, 40] : isFemale ? [31.5, 35] : [33, 38];
      if (value < g) return GREEN;
      if (value < r) return neutralColor;
      return RED;
    }
    case "abdomen": {
      const [g, r] = isMale ? [37, 42] : isFemale ? [33, 37] : [35, 40];
      if (value < g) return GREEN;
      if (value < r) return neutralColor;
      return RED;
    }
    case "neck": {
      const [g, r] = isMale ? [15.75, 17] : isFemale ? [13.75, 15] : [14.75, 16];
      if (value < g) return GREEN;
      if (value < r) return neutralColor;
      return RED;
    }
    case "shoulder_width":
    case "calf":
      if (category === "Athletic" || category === "Fit") return GREEN;
      return neutralColor;
    case "thigh":
      if (category === "Athletic" || category === "Fit") return GREEN;
      if (category === "Obese") return RED;
      return neutralColor;
    case "hip":
    case "knee":
    case "ankle":
    default:
      return neutralColor;
  }
}

export default function ScanResultsScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const bg = isDark ? "#111111" : "#FFFFFF";
  const cardBg = isDark ? "#1C1C1E" : "#F5F5F5";
  const text = isDark ? "#F2F2F7" : "#111111";
  const subtext = isDark ? "#8E8E93" : "rgba(0,0,0,0.55)";
  const border = isDark ? "#3A3A3A" : "rgba(0,0,0,0.08)";

  const { user } = useAuth();
  const gender = user?.gender ?? null;

  const params = useLocalSearchParams<{ sessionId?: string; session_id?: string }>();
  const sessionId = params.sessionId ?? params.session_id;

  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const load = async () => {
    if (!sessionId) {
      setErrMsg("Missing sessionId (this screen must be opened from the Scan page).");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrMsg(null);

    try {
      const res = await api.get<ScanResult>(`/scan/results/${sessionId}`);
      setResult(res.data);
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ??
        e?.message ??
        "Failed to load scan results";
      setErrMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View
      style={{
        backgroundColor: cardBg,
        borderWidth: 1,
        borderColor: border,
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <Text style={{ color: text, fontWeight: "900", marginBottom: 8, fontSize: 15 }}>
        {title}
      </Text>
      {children}
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, alignItems: "center", justifyContent: "center", gap: 12 }}>
        <ActivityIndicator />
        <Text style={{ color: subtext }}>Loading results…</Text>
      </View>
    );
  }

  if (errMsg || !result) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, padding: 16, justifyContent: "center", gap: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: "900", color: text }}>Could not load results</Text>
        <Text style={{ color: "#ef4444" }}>{errMsg ?? "Unknown error"}</Text>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
          <Pressable
            onPress={load}
            style={{ padding: 12, borderRadius: 12, backgroundColor: "#2563eb" }}
          >
            <Text style={{ color: "white", fontWeight: "800" }}>Retry</Text>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            style={{ padding: 12, borderRadius: 12, backgroundColor: isDark ? "#252525" : "#E5E7EB" }}
          >
            <Text style={{ color: isDark ? "#F2F2F7" : "#111827", fontWeight: "800" }}>
              Go Back
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const bc = result.body_composition;
  const ha = result.health_assessment;

  // Order these so it feels “real” to the user
  const measurementOrder = [
    "neck",
    "shoulder_width",
    "waist",
    "abdomen",
    "hip",
    "thigh",
    "knee",
    "calf",
    "ankle",
  ];

  const sortedMeasurements = measurementOrder
    .filter((k) => k in result.measurements)
    .map((k) => [k, result.measurements[k]] as const);

  const otherMeasurements = Object.entries(result.measurements).filter(
    ([k]) => !measurementOrder.includes(k)
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
      <Text style={{ fontSize: 26, fontWeight: "900", marginBottom: 14, color: text }}>
        Scan Results
      </Text>

      <Card title="Health Assessment">
        <Text style={{
          color: (ha.category === "Athletic" || ha.category === "Fit") ? GREEN : ha.category === "Obese" ? RED : text,
          fontSize: 16,
          fontWeight: "900",
        }}>
          {ha.category}{" "}
          <Text style={{
            color: ha.risk_level === "low" ? GREEN : ha.risk_level === "high" ? RED : subtext,
            fontWeight: "700",
          }}>
            ({ha.risk_level} risk)
          </Text>
        </Text>
        <Text style={{ color: subtext, marginTop: 6, lineHeight: 20 }}>
          {ha.recommendation}
        </Text>
      </Card>

      <Card title="Body Composition">
        <View style={{ gap: 6 }}>
          <Text style={{ color: text }}>BMI: <Text style={{ fontWeight: "900", color: getCompositionColor("bmi", bc.bmi, ha.category, gender, text) }}>{fmtNum(bc.bmi)}</Text></Text>
          <Text style={{ color: text }}>Body Fat %: <Text style={{ fontWeight: "900", color: getCompositionColor("body_fat_percentage", bc.body_fat_percentage, ha.category, gender, text) }}>{fmtNum(bc.body_fat_percentage)}</Text></Text>
          <Text style={{ color: text }}>Fat Mass (lbs): <Text style={{ fontWeight: "900", color: getCompositionColor("fat_mass_lbs", bc.fat_mass_lbs, ha.category, gender, text) }}>{fmtNum(bc.fat_mass_lbs)}</Text></Text>
          <Text style={{ color: text }}>Lean Mass (lbs): <Text style={{ fontWeight: "900", color: getCompositionColor("lean_mass_lbs", bc.lean_mass_lbs, ha.category, gender, text) }}>{fmtNum(bc.lean_mass_lbs)}</Text></Text>
          <Text style={{ color: text }}>Waist/Hip Ratio: <Text style={{ fontWeight: "900", color: getCompositionColor("waist_to_hip_ratio", bc.waist_to_hip_ratio, ha.category, gender, text) }}>{fmtNum(bc.waist_to_hip_ratio)}</Text></Text>
        </View>
      </Card>

      <Card title="Measurements (inches)">
        <View style={{ gap: 6 }}>
          {sortedMeasurements.map(([k, v]) => (
            <View key={k} style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: subtext }}>{prettyLabel(k)}</Text>
              <Text style={{ fontWeight: "900", color: getMeasurementColor(k, v, ha.category, gender, text) }}>{fmtNum(v)}</Text>
            </View>
          ))}

          {otherMeasurements.length > 0 && (
            <View style={{ marginTop: 10, gap: 6 }}>
              {otherMeasurements.map(([k, v]) => (
                <View key={k} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: subtext }}>{prettyLabel(k)}</Text>
                  <Text style={{ fontWeight: "900", color: getMeasurementColor(k, v, ha.category, gender, text) }}>{fmtNum(v)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Card>

      <Pressable
        onPress={() => router.replace("/(tabs)/scan")}
        style={{
          marginTop: 8,
          padding: 14,
          borderRadius: 14,
          backgroundColor: "#2563eb",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "900" }}>New Scan</Text>
      </Pressable>
    </ScrollView>
  );
}
