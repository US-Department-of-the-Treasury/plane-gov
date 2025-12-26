import type { ReactNode } from "react";
import { useLocation, useParams } from "react-router";
// components
import { AppSidebarToggleButton } from "@/components/sidebar/sidebar-toggle-button";
// hooks
import { useAppTheme } from "@/hooks/store/use-app-theme";

export function ExtendedAppHeader(props: { header: ReactNode }) {
  const { header } = props;
  // params
  const { projectId, workItem } = useParams();
  const location = useLocation();
  // store hooks
  const { sidebarCollapsed, wikiSidebarCollapsed, toggleWikiSidebar } = useAppTheme();

  // Detect if we're in Wiki mode
  const isWikiMode = location.pathname.includes("/wiki");

  // Show sidebar toggle button only when sidebar is collapsed AND not in project/work item context
  // (project/work item pages have the tab navigation header which includes its own toggle)
  const shouldShowSidebarToggleButton = !projectId && !workItem;

  // Use appropriate sidebar state based on mode
  const isCollapsed = isWikiMode ? wikiSidebarCollapsed : sidebarCollapsed;
  const onToggle = isWikiMode ? toggleWikiSidebar : undefined;

  return (
    <>
      {isCollapsed && shouldShowSidebarToggleButton && <AppSidebarToggleButton onToggle={onToggle} />}
      <div className="w-full">{header}</div>
    </>
  );
}
