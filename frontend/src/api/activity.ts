import { apiRequest } from "./client";

export type DailyActivity = {
  id?: number;
  activity_date: string;
  steps?: number | null;
  exercise_minutes?: number | null;
  sleep_hours?: number | null;
  water_ml?: number | null;
  stress_level?: number | null;
  diet_score?: number | null;
  exists?: boolean;
};

export type SaveActivityBody = {
  steps?: number;
  exercise_minutes?: number;
  sleep_hours?: number;
  water_ml?: number;
  stress_level?: number;
  diet_score?: number;
};

export async function getTodayActivity(token?: string) {
  return apiRequest<{ data: DailyActivity }>("/health/daily-activities/today", { token });
}

export async function saveActivity(body: SaveActivityBody, token?: string) {
  return apiRequest<{ data: DailyActivity }>("/health/daily-activities", {
    method: "POST",
    body: JSON.stringify(body),
    token,
  });
}
