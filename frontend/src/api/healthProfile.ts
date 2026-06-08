import { apiRequest } from "./client";

export type FamilyHistoryItem = {
  condition: string;
  relation: string;
};

export type HealthProfile = {
  name: string;
  email: string;
  birth_date: string;
  gender: string;
  managed_diseases: string[];
  height_cm: number | null;
  weight_kg: number | null;
  bmi: number | null;
  family_history: FamilyHistoryItem[];
  smoking: string;
  alcohol: string;
};

export type UpdateHealthProfileBody = {
  name?: string;
  height_cm?: number | null;
  weight_kg?: number | null;
  smoking?: string;
  alcohol?: string;
};

export async function getHealthProfile(token?: string) {
  return apiRequest<{ data: HealthProfile }>("/health/profile", { token });
}

export async function updateHealthProfile(body: UpdateHealthProfileBody, token?: string) {
  return apiRequest<{ data: HealthProfile }>("/health/profile", {
    method: "PUT",
    body: JSON.stringify(body),
    token,
  });
}
