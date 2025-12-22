import { useEffect } from "react";
// hooks
import { useCurrentUser, useInstanceAdmins, useThemeStore } from "@/store/queries";

export function UserProvider({ children }: React.PropsWithChildren) {
  // Trigger fetches (TanStack Query handles caching and deduplication)
  const { data: currentUser } = useCurrentUser();
  useInstanceAdmins();

  // Theme store
  const isSidebarCollapsed = useThemeStore((s) => s.isSidebarCollapsed);
  const toggleSidebar = useThemeStore((s) => s.toggleSidebar);

  useEffect(() => {
    const localValue = localStorage && localStorage.getItem("god_mode_sidebar_collapsed");
    const localBoolValue = localValue ? (localValue === "true" ? true : false) : false;
    if (isSidebarCollapsed === undefined && localBoolValue != isSidebarCollapsed) toggleSidebar(localBoolValue);
  }, [isSidebarCollapsed, currentUser, toggleSidebar]);

  return <>{children}</>;
}
