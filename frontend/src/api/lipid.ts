import { apiRequest } from "./client";

export type LipidRecord = {
  id: number;
  total_cholesterol?: number | null;
  ldl: number | null;
  hdl: number | null;
  triglycerides?: number | null;
  waist_cm?: number | null;
  record_date: string;
  source?: string | null;
  memo?: string | null;
  created_at: string;
};

export type CreateLipidBody = {
  total_cholesterol?: number;
  ldl?: number;
  hdl?: number;
  triglycerides?: number;
  waist_cm?: number;
  record_date: string;
  source?: string;
  memo?: string;
};

export async function createLipidRecord(body: CreateLipidBody, token?: string) {
  return apiRequest<{ data: LipidRecord }>("/health/lipid-records", {
    method: "POST",
    body: JSON.stringify(body),
    token,
  });
}
