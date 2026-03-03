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

export default function ScanResultsScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const bg = isDark ? "#0B0B0F" : "#FFFFFF";
  const cardBg = isDark ? "rgba(255,255,255,0.06)" : "#F6F7FB";
  const text = isDark ? "#FFFFFF" : "#111111";
  const subtext = isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)";
  const border = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";

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
            style={{ padding: 12, borderRadius: 12, backgroundColor: isDark ? "#111827" : "#E5E7EB" }}
          >
            <Text style={{ color: isDark ? "white" : "#111827", fontWeight: "800" }}>
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
      <Text style={{ fontSize: 26, fontWeight: "900", marginBottom: 6, color: text }}>
        Scan Results
      </Text>
      <Text style={{ color: subtext, marginBottom: 14 }}>
        Session: {result.session_id}
      </Text>

      <Card title="Health Assessment">
        <Text style={{ color: text, fontSize: 16, fontWeight: "900" }}>
          {ha.category} <Text style={{ color: subtext, fontWeight: "700" }}>({ha.risk_level} risk)</Text>
        </Text>
        <Text style={{ color: subtext, marginTop: 6, lineHeight: 20 }}>
          {ha.recommendation}
        </Text>
      </Card>

      <Card title="Body Composition">
        <View style={{ gap: 6 }}>
          <Text style={{ color: text }}>BMI: <Text style={{ fontWeight: "900" }}>{fmtNum(bc.bmi)}</Text></Text>
          <Text style={{ color: text }}>Body Fat %: <Text style={{ fontWeight: "900" }}>{fmtNum(bc.body_fat_percentage)}</Text></Text>
          <Text style={{ color: text }}>Fat Mass (lbs): <Text style={{ fontWeight: "900" }}>{fmtNum(bc.fat_mass_lbs)}</Text></Text>
          <Text style={{ color: text }}>Lean Mass (lbs): <Text style={{ fontWeight: "900" }}>{fmtNum(bc.lean_mass_lbs)}</Text></Text>
          <Text style={{ color: text }}>Waist/Hip Ratio: <Text style={{ fontWeight: "900" }}>{fmtNum(bc.waist_to_hip_ratio)}</Text></Text>
        </View>
      </Card>

      <Card title="Measurements (inches)">
        <View style={{ gap: 6 }}>
          {sortedMeasurements.map(([k, v]) => (
            <View key={k} style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: subtext }}>{prettyLabel(k)}</Text>
              <Text style={{ color: text, fontWeight: "900" }}>{fmtNum(v)}</Text>
            </View>
          ))}

          {otherMeasurements.length > 0 && (
            <View style={{ marginTop: 10, gap: 6 }}>
              {otherMeasurements.map(([k, v]) => (
                <View key={k} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: subtext }}>{prettyLabel(k)}</Text>
                  <Text style={{ color: text, fontWeight: "900" }}>{fmtNum(v)}</Text>
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
