import api from "@/services/api";

export type WaterTodaySummary = {
  total_oz: number;
  goal_oz: number;
};

export type CreateWaterLogPayload = {
  amount_oz: number;
  logged_at?: string;
};

export async function getTodayWaterSummary(): Promise<WaterTodaySummary> {
  const response = await api.get("/water/today");
  return response.data;
}

export async function createWaterLog(payload: CreateWaterLogPayload) {
  const response = await api.post("/water/logs", payload);
  return response.data;
}