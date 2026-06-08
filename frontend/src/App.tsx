import { useEffect, useMemo, useState } from "react";

import { AppLayout } from "./layouts/AppLayout";
import { AdviceHistoryPage } from "./pages/AdviceHistoryPage";
import { AdviceTodayPage } from "./pages/AdviceTodayPage";
import { PublicLayout } from "./layouts/PublicLayout";
import { HomePage } from "./pages/HomePage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { MyProfilePage } from "./pages/MyProfilePage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { PredictionFeedbackPage } from "./pages/PredictionFeedbackPage";
import { PredictionHistoryPage } from "./pages/PredictionHistoryPage";
import { PredictionProgressPage } from "./pages/PredictionProgressPage";
import { PredictionRequestPage } from "./pages/PredictionRequestPage";
import { PredictionResultPage } from "./pages/PredictionResultPage";
import { ActivityPage } from "./pages/health/ActivityPage";
import { ExercisePage } from "./pages/health/ExercisePage";
import { GoalEditPage } from "./pages/health/GoalEditPage";
import { GoalPage } from "./pages/health/GoalPage";
import { HealthHubPage } from "./pages/health/HealthHubPage";
import { HealthProfilePage } from "./pages/health/HealthProfilePage";
import { VitalsDetailPage } from "./pages/health/VitalsDetailPage";
import { VitalsInputPage } from "./pages/health/VitalsInputPage";
import { VitalsListPage } from "./pages/health/VitalsListPage";

export type AppRoute =
  | "/"
  | "/login"
  | "/home"
  | "/notifications"
  | "/advices/today"
  | "/advices/history"
  | "/prediction/request"
  | "/prediction/progress"
  | "/prediction/result"
  | "/prediction/history"
  | "/prediction/feedback"
  | "/mypage"
  | "/mypage/profile"
  | "/health"
  | "/health/goal"
  | "/health/goal/edit"
  | "/health/profile"
  | "/health/vitals"
  | "/health/vitals/detail"
  | "/health/vitals/input"
  | "/health/exercise"
  | "/health/activity"
  | "/food"
  | "/reports"
  | "/challenges"
  | "/pet";

const publicRoutes = new Set<AppRoute>(["/", "/login"]);

function normalizePath(pathname: string): AppRoute {
  const knownRoutes: AppRoute[] = [
    "/",
    "/login",
    "/home",
    "/notifications",
    "/advices/today",
    "/advices/history",
    "/prediction/request",
    "/prediction/progress",
    "/prediction/result",
    "/prediction/history",
    "/prediction/feedback",
    "/mypage",
    "/mypage/profile",
    "/health",
    "/health/goal",
    "/health/goal/edit",
    "/health/profile",
    "/health/vitals",
    "/health/vitals/detail",
    "/health/vitals/input",
    "/health/exercise",
    "/health/activity",
    "/food",
    "/reports",
    "/challenges",
    "/pet",
  ];

  return knownRoutes.includes(pathname as AppRoute) ? (pathname as AppRoute) : "/home";
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() => normalizePath(window.location.pathname));

  useEffect(() => {
    const onPopState = () => setRoute(normalizePath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (nextRoute: AppRoute) => {
    window.history.pushState({}, "", nextRoute);
    setRoute(nextRoute);
  };

  const page = useMemo(() => {
    switch (route) {
      case "/":
        return <LandingPage onNavigate={navigate} />;
      case "/login":
        return <LoginPage onLogin={() => navigate("/home")} />;
      case "/home":
        return <HomePage onNavigate={navigate} />;
      case "/notifications":
        return <NotificationsPage onNavigate={navigate} />;
      case "/advices/today":
        return <AdviceTodayPage onNavigate={navigate} />;
      case "/advices/history":
        return <AdviceHistoryPage />;
      case "/prediction/request":
        return <PredictionRequestPage onNavigate={navigate} />;
      case "/prediction/progress":
        return <PredictionProgressPage onNavigate={navigate} />;
      case "/prediction/result":
        return <PredictionResultPage onNavigate={navigate} />;
      case "/prediction/history":
        return <PredictionHistoryPage onNavigate={navigate} />;
      case "/prediction/feedback":
        return <PredictionFeedbackPage onNavigate={navigate} />;
      case "/mypage":
      case "/mypage/profile":
        return <MyProfilePage />;
      case "/health":
        return <HealthHubPage onNavigate={navigate} />;
      case "/health/goal":
        return <GoalPage onNavigate={navigate} />;
      case "/health/goal/edit":
        return <GoalEditPage onNavigate={navigate} />;
      case "/health/profile":
        return <HealthProfilePage onNavigate={navigate} />;
      case "/health/vitals":
        return <VitalsListPage onNavigate={navigate} />;
      case "/health/vitals/detail":
        return <VitalsDetailPage onNavigate={navigate} />;
      case "/health/vitals/input":
        return <VitalsInputPage onNavigate={navigate} />;
      case "/health/exercise":
        return <ExercisePage onNavigate={navigate} />;
      case "/health/activity":
        return <ActivityPage onNavigate={navigate} />;
      case "/food":
        return <PlaceholderPage title="식단 관리" description="식단 입력, 분석 결과, 기록 목록 화면을 연결할 영역입니다." />;
      case "/reports":
        return <PlaceholderPage title="리포트" description="주간 리포트 목록과 상세 화면을 연결할 영역입니다." />;
      case "/challenges":
        return <PlaceholderPage title="챌린지 관리" description="챌린지 목록, 참여, 체크인 화면을 연결할 영역입니다." />;
      case "/pet":
        return <PlaceholderPage title="마이펫" description="펫 현황, 보상 과제, 도감 화면을 연결할 영역입니다." />;
      default:
        return <HomePage />;
    }
  }, [route]);

  if (publicRoutes.has(route)) {
    return <PublicLayout onNavigate={navigate}>{page}</PublicLayout>;
  }

  return (
    <AppLayout currentRoute={route} onNavigate={navigate}>
      {page}
    </AppLayout>
  );
}
