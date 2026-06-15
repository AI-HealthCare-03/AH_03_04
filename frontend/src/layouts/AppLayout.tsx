import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";

import type { AppRoute } from "../App";
import { getStoredAccessToken } from "../api/auth";
import { getCurrentUser } from "../api/users";
import { Sidebar } from "../components/common/Sidebar";
import { getStoredProfileImage, profileImageUpdatedEvent } from "../utils/profileImage";

type AppLayoutProps = PropsWithChildren<{
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
}>;

const sidebarStorageKey = "all4health.sidebarCollapsed";

export function AppLayout({ children, currentRoute, onNavigate }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(sidebarStorageKey) === "true");
  const [userName, setUserName] = useState("사용자");
  const [userId, setUserId] = useState<number | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(sidebarStorageKey, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) return;

    getCurrentUser(token)
      .then((user) => {
        setUserId(user.id);
        setUserName(user.name);
        setProfileImageUrl(getStoredProfileImage(user.id) ?? user.profile_image_url);
      })
      .catch(() => {
        setUserId(null);
        setUserName("사용자");
        setProfileImageUrl(null);
      });
  }, []);

  useEffect(() => {
    const handleProfileImageUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: number; profileImageUrl: string }>).detail;
      if (userId !== null && detail?.userId === userId) {
        setProfileImageUrl(detail.profileImageUrl);
      }
    };

    window.addEventListener(profileImageUpdatedEvent, handleProfileImageUpdated);
    return () => window.removeEventListener(profileImageUpdatedEvent, handleProfileImageUpdated);
  }, [userId]);

  return (
    <div className={`app-shell ${collapsed ? "is-sidebar-collapsed" : ""}`}>
      <Sidebar
        collapsed={collapsed}
        currentRoute={currentRoute}
        onNavigate={onNavigate}
        onToggle={() => setCollapsed((value) => !value)}
        userName={userName}
        profileImageUrl={profileImageUrl}
      />
      <div className="app-main">
        <main className="page-container">{children}</main>
      </div>
    </div>
  );
}
