import { useEffect, useMemo, useState } from "react";

import type { AppRoute } from "../../App";
import { getStoredAccessToken } from "../../api/auth";
import { getExerciseLogs } from "../../api/exercise";
import { createPredictionTask, getLatestHealthSurveyInput } from "../../api/predictions";
import { getVitals, type VitalRecord } from "../../api/vitals";

type PredictionRequestPageProps = {
  onNavigate: (route: AppRoute) => void;
};

const diseases = ["당뇨병", "고혈압", "만성신장질환"];

function latestRecord(items: VitalRecord[], predicate: (item: VitalRecord) => boolean) {
  return items.find(predicate);
}

export function PredictionRequestPage({ onNavigate }: PredictionRequestPageProps) {
  const [selectedDiseases, setSelectedDiseases] = useState(() => new Set(diseases));
  const [analysisMode, setAnalysisMode] = useState<"BASIC" | "DEEP">("BASIC");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [dataRows, setDataRows] = useState([
    ["건강 프로필", "미입력"],
    ["혈압 기록", "미입력"],
    ["혈당 기록", "미입력"],
    ["운동 기록", "미입력"],
    ["생활 습관", "미입력"],
    ["가족력", "미입력"],
  ]);

  const isAllSelected = selectedDiseases.size === diseases.length;
  const selectedCount = selectedDiseases.size;
  const selectedDataRows = useMemo(() => {
    if (analysisMode === "BASIC") {
      return dataRows.slice(0, 3);
    }
    return dataRows;
  }, [analysisMode]);

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) return;

    setIsDataLoading(true);
    Promise.allSettled([
      getLatestHealthSurveyInput(token),
      getVitals({ limit: 50 }, token),
      getExerciseLogs({ limit: 50 }, token),
    ])
      .then(([surveyRes, vitalsRes, exerciseRes]) => {
        const survey = surveyRes.status === "fulfilled" ? surveyRes.value.data : null;
        const vitals = vitalsRes.status === "fulfilled" ? vitalsRes.value.data.items : [];
        const exercises = exerciseRes.status === "fulfilled" ? exerciseRes.value.data : null;
        const latestBp = latestRecord(vitals, (item) => item.measure_type.startsWith("BP_"));
        const latestGlucose = latestRecord(vitals, (item) => item.measure_type.startsWith("GLUCOSE_"));
        const hasFamilyHistory = Boolean(
          survey?.fh_diabetes_father ||
            survey?.fh_diabetes_mother ||
            survey?.fh_diabetes_sibling ||
            survey?.fh_hypertension_father ||
            survey?.fh_hypertension_mother ||
            survey?.fh_hypertension_sibling ||
            survey?.family_history_ckd,
        );
        const hasLifestyle = Boolean(
          survey?.smoking_status != null ||
            survey?.alcohol_frequency != null ||
            survey?.walking_days != null ||
            survey?.exercise_frequency != null ||
            survey?.sleep_hours != null ||
            survey?.stress_level != null ||
            survey?.diet_score != null,
        );

        setDataRows([
          ["건강 프로필", survey ? "완료" : "미입력"],
          [
            "혈압 기록",
            latestBp ? `최근 ${latestBp.sbp ?? latestBp.systolic}/${latestBp.dbp ?? latestBp.diastolic}` : "미입력",
          ],
          [
            "혈당 기록",
            latestGlucose ? `최근 ${latestGlucose.glucose ?? latestGlucose.glucose_value}mg/dL` : "미입력",
          ],
          [
            "운동 기록",
            exercises && exercises.total > 0 ? `${exercises.total}개 · 최근 ${exercises.items[0]?.duration_minutes ?? 0}분` : "미입력",
          ],
          ["생활 습관", hasLifestyle ? "완료" : "미입력"],
          ["가족력", hasFamilyHistory ? "입력됨" : "미입력"],
        ]);
      })
      .finally(() => setIsDataLoading(false));
  }, []);

  const toggleDisease = (disease: string) => {
    setSelectedDiseases((prev) => {
      const next = new Set(prev);
      if (next.has(disease)) {
        next.delete(disease);
      } else {
        next.add(disease);
      }
      return next;
    });
  };

  const toggleAllDiseases = () => {
    setSelectedDiseases(isAllSelected ? new Set() : new Set(diseases));
  };

  const handleStartPrediction = async () => {
    if (selectedDiseases.size === 0) {
      setErrorMessage("예측할 질환을 1개 이상 선택해 주세요.");
      return;
    }

    const token = getStoredAccessToken();
    if (!token) {
      setErrorMessage("로그인 후 예측을 요청할 수 있습니다.");
      onNavigate("/login");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const latestInput = await getLatestHealthSurveyInput(token);
      const task = await createPredictionTask(
        {
          health_input_id: latestInput.data.health_input_id,
          prediction_mode: "SCREENING",
        },
        token,
      );

      sessionStorage.setItem("predictionTaskUuid", task.data.task_uuid);
      sessionStorage.removeItem("predictionResultId");
      sessionStorage.setItem("predictionSelectedDiseases", JSON.stringify([...selectedDiseases]));
      sessionStorage.setItem("predictionAnalysisMode", analysisMode);
      window.history.pushState({}, "", `/prediction/progress?task_uuid=${task.data.task_uuid}`);
      onNavigate("/prediction/progress");
    } catch {
      setErrorMessage("최근 건강설문 입력을 찾을 수 없습니다. 건강설문을 먼저 저장해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-stack">
      <section className="prediction-title-row">
        <h1>질환 예측 요청</h1>
        <span className="usage-badge">오늘 예측 가능 횟수: 2/3회 남음</span>
      </section>
      <div className="prediction-stepper">
        {["질환 선택", "데이터 확인", "예측 실행"].map((label, index) => (
          <div className={index === 0 ? "is-current" : ""} key={label}>
            <span>{index === 0 ? "✓" : index + 1}</span>
            <small>{label}</small>
          </div>
        ))}
      </div>
      <section className="prediction-request-grid">
        <article className="dashboard-card">
          <h2>예측할 질환을 선택하세요 (3대 만성질환)</h2>
          <div className="checkbox-list">
            {diseases.map((disease) => (
              <label key={disease}>
                <input checked={selectedDiseases.has(disease)} type="checkbox" onChange={() => toggleDisease(disease)} />
                {disease}
              </label>
            ))}
          </div>
          <div className="request-footer">
            <span>선택된 질환: {selectedCount}개</span>
            <button className="small-button" type="button" onClick={toggleAllDiseases}>
              {isAllSelected ? "전체 해제" : "전체 선택"}
            </button>
          </div>
        </article>
        <aside className="dashboard-card">
          <h2>분석 모드</h2>
          <div className="segment-control">
            <button className={analysisMode === "BASIC" ? "is-active" : ""} type="button" onClick={() => setAnalysisMode("BASIC")}>
              기본
            </button>
            <button className={analysisMode === "DEEP" ? "is-active" : ""} type="button" onClick={() => setAnalysisMode("DEEP")}>
              심화
            </button>
          </div>
          <h2>분석 데이터</h2>
          <div className="data-check-list">
            {selectedDataRows.map(([label, value]) => (
              <div key={label}>
                <span>{value === "미입력" ? "·" : "✓"} {label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <button className="green-button" disabled={isSubmitting || isDataLoading || selectedCount === 0} type="button" onClick={handleStartPrediction}>
            {isSubmitting ? "예측 요청 중..." : isDataLoading ? "분석 데이터 확인 중..." : "예측 시작"}
          </button>
          {errorMessage && (
            <div className="warning-banner compact">
              <strong>!</strong>
              <span>{errorMessage}</span>
              <button type="button" onClick={() => onNavigate("/health-survey")}>
                건강설문 입력
              </button>
            </div>
          )}
        </aside>
      </section>
      <section className="warning-banner compact">
        <strong>⚠</strong>
        <span>본 결과는 의료 진단이 아닌 생활습관 개선을 위한 참고 지표입니다.</span>
      </section>
    </div>
  );
}
