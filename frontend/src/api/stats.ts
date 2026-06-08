import { apiRequest } from "./client";

export type ScorePoint = {
  date: string;
  total_score: number;
  grade: string;
};

export type ScoreHistory = {
  period: string;
  points: ScorePoint[];
};

export async function getScoreHistory(period = "30D", token?: string) {
  return apiRequest<{ data: ScoreHistory }>(
    `/dashboard/statistics?period=${period}`,
    { token },
  );
}
