import { apiRequest } from "./client";

export type ExerciseTypeCode = "RUNNING" | "WALKING" | "CYCLING" | "SWIMMING" | "OTHER";

export const EXERCISE_TYPE_LABELS: Record<ExerciseTypeCode, string> = {
  RUNNING: "달리기",
  WALKING: "걷기",
  CYCLING: "자전거",
  SWIMMING: "수영",
  OTHER: "기타",
};

export const EXERCISE_TYPE_ICONS: Record<ExerciseTypeCode, string> = {
  RUNNING: "🏃",
  WALKING: "🚶",
  CYCLING: "🚴",
  SWIMMING: "🏊",
  OTHER: "✏️",
};

export const EXERCISE_TYPES: ExerciseTypeCode[] = [
  "RUNNING",
  "WALKING",
  "CYCLING",
  "SWIMMING",
  "OTHER",
];

export type ExerciseLog = {
  id: number;
  exercise_type: string;
  duration_minutes: number;
  calories_burned?: number | null;
  memo?: string | null;
  exercise_date: string;
  created_at: string;
};

export type ExerciseSummary = {
  total_duration_minutes: number;
  total_calories_burned: number;
  logged_days: number;
  logged_count: number;
};

export type ExerciseListData = {
  summary: ExerciseSummary;
  total: number;
  items: ExerciseLog[];
};

export type ExerciseQuery = {
  from?: string;
  to?: string;
  period?: "TODAY" | "7D" | "1M" | "3M";
  limit?: number;
};

export type CreateExerciseBody = {
  exercise_type: string;
  duration_minutes: number;
  calories_burned?: number;
  memo?: string;
  exercise_date: string;
};

export type UpdateExerciseBody = Partial<CreateExerciseBody>;

export async function getExerciseLogs(query: ExerciseQuery = {}, token?: string) {
  const params = new URLSearchParams();
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.period) params.set("period", query.period);
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  return apiRequest<{ data: ExerciseListData }>(`/health/exercise-logs${qs ? `?${qs}` : ""}`, {
    token,
  });
}

export async function createExerciseLog(body: CreateExerciseBody, token?: string) {
  return apiRequest<{ data: ExerciseLog }>("/health/exercise-logs", {
    method: "POST",
    body: JSON.stringify(body),
    token,
  });
}

export async function updateExerciseLog(id: number, body: UpdateExerciseBody, token?: string) {
  return apiRequest<{ data: ExerciseLog }>(`/health/exercise-logs/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
    token,
  });
}

export async function deleteExerciseLog(id: number, token?: string) {
  return apiRequest<void>(`/health/exercise-logs/${id}`, { method: "DELETE", token });
}
