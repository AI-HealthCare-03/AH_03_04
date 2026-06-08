import { useEffect, useState } from "react";

import type { AppRoute } from "../../App";  
import { getStoredAccessToken } from "../../api/auth";
import { 
  getHealthGoals,
  updateHealthGoals,
  type ChronicDiseaseGoal,
  type HealthGoals,
  type LifestyleGoal,
} from "../../api/goal";
import { ErrorState } from "../../components/common/ErrorState";
import { LoadingState } from "../../components/common/LoadingState";

const fallbackHealthGoals: HealthGoals = {
  chronic_disease_goal: {
    target_systolic_bp: 130,
    target_diastolic_bp: 80,
    target_fasting_glucose: 100,
    target_postprandial_glucose: 140,
    target_hba1c: 6.5,
    target_ldl_cholesterol: 100,
    target_hdl_cholesterol: 60,
    target_triglycerides: 150,
    target_bmi: 23.0,
    target_weight_kg: null,
    target_egfr: null,
    updated_at: "2026-06-05T08:00:00",
  },
  lifestyle_goal: {
    target_steps: 10000,
    target_water_ml: 2000,
    target_exercise_minutes: 30,
    target_sleep_hours: 7.0,
    target_diet_score: null,
    updated_at: "2026-06-05T08:00:00",
  },
};

type CdgKey = keyof Omit<ChronicDiseaseGoal, "updated_at">;
type LgKey = keyof Omit<LifestyleGoal, "updated_at">;

type MetaItem<K extends string> = {
  key: K;
  label: string;
  unit: string;
  step: string;
};

const CDG_GROUPS: { group: string; items: MetaItem<CdgKey>[] }[] = [
  {
    group: "혈압",
    items: [
      { key: "target_systolic_bp", label: "수축기 혈압", unit: "mmHg", step: "1" },
      { key: "target_diastolic_bp", label: "이완기 혈압", unit: "mmHg", step: "1" },
    ],
  },
  {
    group: "혈당",
    items: [
      { key: "target_fasting_glucose", label: "공복 혈당", unit: "mg/dL", step: "1" },
      { key: "target_postprandial_glucose", label: "식후 혈당", unit: "mg/dL", step: "1" },
      { key: "target_hba1c", label: "당화혈색소 (HbA1c)", unit: "%", step: "0.1" },
    ],
  },
  {
    group: "지질",
    items: [
      { key: "target_ldl_cholesterol", label: "LDL 콜레스테롤", unit: "mg/dL", step: "1" },
      { key: "target_hdl_cholesterol", label: "HDL 콜레스테롤", unit: "mg/dL", step: "1" },
      { key: "target_triglycerides", label: "중성지방", unit: "mg/dL", step: "1" },
    ],
  },
  {
    group: "신체조성",
    items: [
      { key: "target_bmi", label: "체질량지수 (BMI)", unit: "kg/m²", step: "0.1" },
      { key: "target_weight_kg", label: "체중", unit: "kg", step: "0.1" },
    ],
  },
  {
    group: "신장",
    items: [{ key: "target_egfr", label: "사구체여과율 (eGFR)", unit: "mL/min/1.73m²", step: "0.1" }],
  },
];

const LG_ITEMS: MetaItem<LgKey>[] = [
  { key: "target_steps", label: "일일 걸음 수", unit: "보/일", step: "100" },
  { key: "target_water_ml", label: "수분 섭취", unit: "mL/일", step: "100" },
  { key: "target_exercise_minutes", label: "운동 시간", unit: "분/일", step: "5" },
  { key: "target_sleep_hours", label: "수면 시간", unit: "시간", step: "0.5" },
  { key: "target_diet_score", label: "식단 점수", unit: "점", step: "0.1" },
];

type DraftValues = {
  cdg: Partial<Record<CdgKey, string>>;
  lg: Partial<Record<LgKey, string>>;
};

function numToString(v: number | null): string {
  return v === null ? "" : String(v);
}

function stringToNum(s: string): number | null {
  if (s === "" || s === null) return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

function initDraft(goals: HealthGoals): DraftValues {
  const cdg: Partial<Record<CdgKey, string>> = {};
  const lg: Partial<Record<LgKey, string>> = {};

  (Object.keys(goals.chronic_disease_goal) as (CdgKey | "updated_at")[]).forEach((k) => {
    if (k !== "updated_at") {
      cdg[k as CdgKey] = numToString(goals.chronic_disease_goal[k as CdgKey]);
    }
  });

  (Object.keys(goals.lifestyle_goal) as (LgKey | "updated_at")[]).forEach((k) => {
    if (k !== "updated_at") {
      lg[k as LgKey] = numToString(goals.lifestyle_goal[k as LgKey]);
    }
  });

  return { cdg, lg };
}

function formatUpdatedAt(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} 업데이트`;
}

type GoalPageProps = {
  onNavigate?: (route: AppRoute) => void;
};

export function GoalPage({ onNavigate: _onNavigate }: GoalPageProps) {
  const [goals, setGoals] = useState<HealthGoals>(fallbackHealthGoals);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasApiError, setHasApiError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<DraftValues>({ cdg: {}, lg: {} });

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) return;

    setIsLoading(true);
    getHealthGoals(token)
      .then((res) => {
        setGoals(res.data);
        setHasApiError(false);
      })
      .catch(() => setHasApiError(true))
      .finally(() => setIsLoading(false));
  }, []);

  function handleEditStart() {
    setDraft(initDraft(goals));
    setIsEditing(true);
  }

  function handleCancel() {
    setIsEditing(false);
    setDraft({ cdg: {}, lg: {} });
  }

  async function handleSave() {
    const token = getStoredAccessToken();
    const cdgPatch: Partial<Omit<typeof goals.chronic_disease_goal, "updated_at">> = {};
    const lgPatch: Partial<Omit<typeof goals.lifestyle_goal, "updated_at">> = {};

    (Object.keys(draft.cdg) as CdgKey[]).forEach((k) => {
      (cdgPatch as Record<string, number | null>)[k] = stringToNum(draft.cdg[k] ?? "");
    });
    (Object.keys(draft.lg) as LgKey[]).forEach((k) => {
      (lgPatch as Record<string, number | null>)[k] = stringToNum(draft.lg[k] ?? "");
    });

    setIsSaving(true);
    try {
      const res = await updateHealthGoals(
        { chronic_disease_goal: cdgPatch, lifestyle_goal: lgPatch },
        token,
      );
      setGoals(res.data);
      setIsEditing(false);
      setDraft({ cdg: {}, lg: {} });
    } catch {
      /* 저장 실패 시 편집 상태 유지 */
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <LoadingState message="건강 목표를 불러오는 중입니다." />;
  }

  return (
    <div className="goal-page page-stack">
      <section className="section-header-row page-heading-row">
        <div className="page-heading">
          <p className="eyebrow">건강 관리</p>
          <h1>건강 목표</h1>
        </div>
        <div className="button-row">
          {isEditing ? (
            <>
              <button
                type="button"
                className="wide-subtle-button goal-cancel-btn"
                onClick={handleCancel}
                disabled={isSaving}
              >
                취소
              </button>
              <button
                type="button"
                className="green-button"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "저장 중..." : "저장"}
              </button>
            </>
          ) : (
            <button type="button" className="green-button" onClick={handleEditStart}>
              목표 수정
            </button>
          )}
        </div>
      </section>

      {hasApiError && (
        <ErrorState
          title="건강 목표 데이터를 불러오지 못했습니다."
          description="현재 화면은 예시 데이터로 표시됩니다."
        />
      )}

      {/* 만성질환 목표 */}
      <section className="dashboard-card goal-section">
        <div className="goal-section-header">
          <h2>만성질환 목표</h2>
          <small className="goal-updated-at">
            {formatUpdatedAt(goals.chronic_disease_goal.updated_at)}
          </small>
        </div>

        {CDG_GROUPS.map(({ group, items }) => (
          <div key={group} className="goal-group">
            <h3 className="goal-group-label">{group}</h3>
            <div className="goal-metric-grid">
              {items.map(({ key, label, unit, step }) => {
                const val = goals.chronic_disease_goal[key];
                return (
                  <div key={key} className="goal-metric-card">
                    <span className="field-label">{label}</span>
                    {isEditing ? (
                      <div className="goal-edit-field">
                        <input
                          type="number"
                          step={step}
                          className="goal-edit-input"
                          value={draft.cdg[key] ?? ""}
                          placeholder="미설정"
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              cdg: { ...prev.cdg, [key]: e.target.value },
                            }))
                          }
                        />
                        <span className="goal-edit-unit">{unit}</span>
                      </div>
                    ) : (
                      <strong className={val === null ? "goal-val-empty" : "goal-val"}>
                        {val === null ? "미설정" : `${val} ${unit}`}
                      </strong>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* 생활습관 목표 */}
      <section className="dashboard-card goal-section">
        <div className="goal-section-header">
          <h2>생활습관 목표</h2>
          <small className="goal-updated-at">
            {formatUpdatedAt(goals.lifestyle_goal.updated_at)}
          </small>
        </div>

        <div className="goal-metric-grid goal-metric-grid--wide">
          {LG_ITEMS.map(({ key, label, unit, step }) => {
            const val = goals.lifestyle_goal[key];
            return (
              <div key={key} className="goal-metric-card">
                <span className="field-label">{label}</span>
                {isEditing ? (
                  <div className="goal-edit-field">
                    <input
                      type="number"
                      step={step}
                      className="goal-edit-input"
                      value={draft.lg[key] ?? ""}
                      placeholder="미설정"
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          lg: { ...prev.lg, [key]: e.target.value },
                        }))
                      }
                    />
                    <span className="goal-edit-unit">{unit}</span>
                  </div>
                ) : (
                  <strong className={val === null ? "goal-val-empty" : "goal-val"}>
                    {val === null ? "미설정" : `${val} ${unit}`}
                  </strong>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
