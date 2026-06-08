import { apiRequest } from "./client";

export type KidneyRecord = {
  id: number;
  creatinine: number | null;
  bun?: number | null;
  egfr?: number | null;
  urine_protein_pos: boolean;
  measured_date: string;
  memo?: string | null;
  created_at: string;
};

export type CreateKidneyBody = {
  creatinine?: number;
  bun?: number;
  egfr?: number;
  urine_protein_pos?: boolean;
  measured_date: string;
  memo?: string;
};

export async function createKidneyRecord(body: CreateKidneyBody, token?: string) {
  return apiRequest<{ data: KidneyRecord }>("/health/kidney-records", {
    method: "POST",
    body: JSON.stringify(body),
    token,
  });
}
