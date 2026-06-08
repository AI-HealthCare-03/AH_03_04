import { apiRequest } from "./client";

export type MeasureCategory = "BP" | "BG";
export type MeasureType =
  | "BP_MORNING"
  | "BP_LUNCH"
  | "BP_EVENING"
  | "BG_FASTING"
  | "BG_POSTPRANDIAL";

export const MEASURE_TYPE_LABELS: Record<MeasureType, string> = {
  BP_MORNING: "혈압 (아침)",
  BP_LUNCH: "혈압 (점심)",
  BP_EVENING: "혈압 (저녁)",
  BG_FASTING: "공복혈당",
  BG_POSTPRANDIAL: "식후혈당",
};

export const MEASURE_TIME_LABELS: Record<string, string> = {
  MORNING: "아침",
  LUNCH: "점심",
  EVENING: "저녁",
};

export function isBpType(t: string): boolean {
  return t.startsWith("BP_");
}

export type VitalRecord = {
  id: number;
  measure_type: MeasureType;
  measured_at: string;
  systolic?: number | null;
  diastolic?: number | null;
  glucose_value?: number | null;
  is_critical: boolean;
  memo?: string | null;
  created_at: string;
};

export type VitalDetail = VitalRecord & {
  avg_systolic_7d?: number | null;
  avg_diastolic_7d?: number | null;
  avg_glucose_7d?: number | null;
  recent_records?: VitalRecord[];
};

export type VitalsListSummary = {
  avg_systolic: number | null;
  avg_diastolic: number | null;
  avg_glucose: number | null;
  critical_count: number;
};

export type VitalsListData = {
  summary: VitalsListSummary;
  total: number;
  items: VitalRecord[];
};

export type VitalsQuery = {
  period?: "7D" | "30D" | "90D";
  type?: "ALL" | "BP" | "BG";
  limit?: number;
};

export type CreateVitalBody = {
  measure_type: MeasureType;
  measured_at: string;
  systolic?: number;
  diastolic?: number;
  glucose_value?: number;
  memo?: string;
};

export type UpdateVitalBody = Partial<CreateVitalBody>;

export async function getVitals(query: VitalsQuery = {}, token?: string) {
  const params = new URLSearchParams();
  if (query.period) params.set("period", query.period);
  if (query.type) params.set("type", query.type);
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  return apiRequest<{ data: VitalsListData }>(`/health/vitals${qs ? `?${qs}` : ""}`, { token });
}

export async function getVitalDetail(id: number, token?: string) {
  return apiRequest<{ data: VitalDetail }>(`/health/vitals/${id}`, { token });
}

export async function createVital(body: CreateVitalBody, token?: string) {
  return apiRequest<{ data: VitalRecord }>("/health/vitals", {
    method: "POST",
    body: JSON.stringify(body),
    token,
  });
}

export async function updateVital(id: number, body: UpdateVitalBody, token?: string) {
  return apiRequest<{ data: VitalRecord }>(`/health/vitals/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
    token,
  });
}

export async function deleteVital(id: number, token?: string) {
  return apiRequest<void>(`/health/vitals/${id}`, { method: "DELETE", token });
}
