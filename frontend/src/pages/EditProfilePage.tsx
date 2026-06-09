import { useState, useEffect } from "react";
import type { AppRoute } from "../App";

interface EditProfilePageProps {
  onNavigate: (route: AppRoute) => void;
}

const DISEASE_OPTIONS = [
  { code: "HYPERTENSION", label: "고혈압" },
  { code: "DIABETES", label: "당뇨" },
  { code: "DYSLIPIDEMIA", label: "고지혈증" },
  { code: "OBESITY", label: "비만" },
  { code: "CKD", label: "만성신장질환" },
];

// 더미 데이터 — API 연결 시 교체 (GET /api/v1/users/me)
const INITIAL = {
  name: "홍길동",
  email: "hong@example.com",
  birth_date: "1985-03-15",
  gender: "M",
  phone_number: "010-1234-5678",
  height: 175,
  weight: 72,
  managed_diseases: ["HYPERTENSION", "DIABETES"],
};

export function EditProfilePage({ onNavigate }: EditProfilePageProps) {
  const [name, setName] = useState(INITIAL.name);
  const [phone, setPhone] = useState(INITIAL.phone_number);
  const [height, setHeight] = useState(String(INITIAL.height));
  const [weight, setWeight] = useState(String(INITIAL.weight));
  const [diseases, setDiseases] = useState<string[]>(INITIAL.managed_diseases);
  const [bmi, setBmi] = useState<number | null>(null);
  const [showDiseaseWarning, setShowDiseaseWarning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (h > 0 && w > 0) setBmi(parseFloat((w / Math.pow(h / 100, 2)).toFixed(1)));
    else setBmi(null);
  }, [height, weight]);

  const toggleDisease = (code: string) => {
    const prev = diseases;
    const next = prev.includes(code) ? prev.filter(d => d !== code) : [...prev, code];
    setDiseases(next);
    // 관리 질환 변경 시 경고 안내
    if (next.length !== prev.length) setShowDiseaseWarning(true);
  };

  const handleSave = () => {
    setIsSaving(true);
    // TODO: API 연결 — PATCH /api/v1/users/me
    // body: { name, phone_number: phone, height: Number(height), weight: Number(weight), managed_diseases: diseases }
    // BMI는 서버에서 height/weight 기준 자동 계산
    // email은 수정 불가, birth_date/gender는 MVP에서 읽기 전용
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => { setSaveSuccess(false); onNavigate("/mypage"); }, 1500);
    }, 500);
  };

  return (
    <div className="page-container">
      <h1 className="page-title">내 정보 수정</h1>

      {saveSuccess && (
        <div style={{ padding: "12px 16px", background: "#e8f5e9", border: "1px solid #a5d6a7", borderRadius: 6, marginBottom: 16, fontSize: 12, color: "#2e7d32" }}>
          정보가 저장되었습니다.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 14 }}>
        {/* 좌측 */}
        <div>
          {/* 기본 정보 */}
          <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10, padding: 20, marginBottom: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 14px" }}>기본 정보</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {/* 이름 */}
              <div>
                <label style={{ fontSize: 10, color: "#555", display: "block", marginBottom: 4 }}>이름</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="홍길동"
                  style={{ width: "100%", height: 34, border: "1.5px solid #ddd", borderRadius: 5, padding: "0 10px", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
              </div>

              {/* 이메일 — 수정 불가 */}
              <div>
                <label style={{ fontSize: 10, color: "#555", display: "block", marginBottom: 4 }}>이메일</label>
                <div style={{ height: 34, border: "1.5px solid #e0e0e0", borderRadius: 5, background: "#fafafa", padding: "0 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: "#aaa" }}>{INITIAL.email}</span>
                  <span style={{ padding: "2px 8px", border: "1px solid #e0e0e0", borderRadius: 20, fontSize: 10, color: "#888", background: "#fff", cursor: "pointer", whiteSpace: "nowrap" }}>인증 후 변경</span>
                </div>
                <p style={{ fontSize: 10, color: "#aaa", margin: "4px 0 0" }}>이메일 변경 시 본인 인증이 필요합니다.</p>
              </div>

              {/* 생년월일 — 읽기 전용 */}
              <div>
                <label style={{ fontSize: 10, color: "#555", display: "block", marginBottom: 4 }}>생년월일 (읽기 전용)</label>
                <div style={{ height: 34, border: "1.5px solid #e0e0e0", borderRadius: 5, background: "#fafafa", padding: "0 10px", display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#aaa" }}>{INITIAL.birth_date}</span>
                </div>
              </div>

              {/* 성별 — 읽기 전용 */}
              <div>
                <label style={{ fontSize: 10, color: "#555", display: "block", marginBottom: 4 }}>성별 (읽기 전용)</label>
                <div style={{ height: 34, border: "1.5px solid #e0e0e0", borderRadius: 5, background: "#fafafa", padding: "0 10px", display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#aaa" }}>{INITIAL.gender === "M" ? "남성" : "여성"}</span>
                </div>
              </div>

              {/* 연락처 */}
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: 10, color: "#555", display: "block", marginBottom: 4 }}>연락처</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-1234-5678"
                  style={{ width: "100%", height: 34, border: "1.5px solid #ddd", borderRadius: 5, padding: "0 10px", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
          </div>

          {/* 건강 프로필 */}
          <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10, padding: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 14px" }}>건강 프로필</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 10, color: "#555", display: "block", marginBottom: 4 }}>신장 (cm)</label>
                <input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="175"
                  style={{ width: "100%", height: 34, border: "1.5px solid #ddd", borderRadius: 5, padding: "0 10px", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: "#555", display: "block", marginBottom: 4 }}>체중 (kg)</label>
                <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="72"
                  style={{ width: "100%", height: 34, border: "1.5px solid #ddd", borderRadius: 5, padding: "0 10px", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: "#555", display: "block", marginBottom: 4 }}>BMI (자동 계산)</label>
                <div style={{ height: 34, border: "1.5px solid #e0e0e0", borderRadius: 5, background: "#fafafa", padding: "0 10px", display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#555", fontWeight: 600 }}>{bmi ?? "—"}</span>
                </div>
                <p style={{ fontSize: 10, color: "#aaa", margin: "4px 0 0" }}>신장/체중 기준 서버 자동 계산</p>
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #e0e0e0", margin: "0 0 14px" }} />

            <h4 style={{ fontSize: 12, fontWeight: 600, margin: "0 0 10px" }}>관리 대상 만성질환</h4>
            {showDiseaseWarning && (
              <div style={{ padding: "8px 12px", background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 6, marginBottom: 10, fontSize: 11, color: "#f57f17" }}>
                ⚠️ 관리 질환 변경 시 건강 목표 및 위험도 예측 기준이 재설정될 수 있습니다.
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {DISEASE_OPTIONS.map(d => (
                <label key={d.code} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={diseases.includes(d.code)} onChange={() => toggleDisease(d.code)} style={{ width: 14, height: 14, cursor: "pointer" }} />
                  <span style={{ fontSize: 12, color: "#333" }}>{d.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* 우측 */}
        <div>
          {/* 프로필 사진 */}
          <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10, padding: 16, marginBottom: 14 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, margin: "0 0 12px" }}>프로필 사진</h3>
            <div style={{ width: "100%", height: 140, background: "#f5f5f5", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, marginBottom: 10 }}>👤</div>
            <button style={{ width: "100%", height: 34, border: "1.5px solid #ddd", borderRadius: 6, background: "#fff", fontSize: 12, cursor: "pointer" }}>
              {/* TODO: 파일 업로드 후 profile_image_url을 PATCH /api/v1/users/me 에 포함 */}
              사진 변경
            </button>
          </div>

          {/* 계정 설정 */}
          <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10, padding: 16 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, margin: "0 0 12px" }}>계정 설정</h3>
            <button onClick={() => onNavigate("/mypage/change-password")}
              style={{ width: "100%", height: 36, border: "1.5px solid #ddd", borderRadius: 6, background: "#fff", fontSize: 12, cursor: "pointer" }}>
              비밀번호 변경
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button onClick={handleSave} disabled={isSaving}
          style={{ padding: "10px 24px", border: "none", borderRadius: 8, background: isSaving ? "#aaa" : "#1a1a1a", color: "#fff", fontSize: 13, fontWeight: 600, cursor: isSaving ? "not-allowed" : "pointer" }}>
          {isSaving ? "저장 중..." : "저장"}
        </button>
        <button onClick={() => onNavigate("/mypage")}
          style={{ padding: "10px 24px", border: "1.5px solid #ddd", borderRadius: 8, background: "#fff", fontSize: 13, cursor: "pointer" }}>
          취소
        </button>
      </div>
    </div>
  );
}
