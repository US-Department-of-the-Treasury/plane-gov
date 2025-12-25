import type { ReactNode } from "react";
import { useParams } from "react-router";
// components
import { AppSidebarToggleButton } from "@/components/sidebar/sidebar-toggle-button";
// hooks
import { useAppTheme } from "@/hooks/store/use-app-theme";

export function ExtendedAppHeader(props: { header: ReactNode }) {
  const { header } = props;
  // params
  const { projectId, workItem } = useParams();
  // store hooks
  const { sidebarCollapsed } = useAppTheme();
  // Show sidebar toggle button only when sidebar is collapsed AND not in project/work item context
  // (project/work item pages have the tab navigation header which includes its own toggle)
  const shouldShowSidebarToggleButton = !projectId && !workItem;

  return (
    <>
      {sidebarCollapsed && shouldShowSidebarToggleButton && <AppSidebarToggleButton />}
      <div className="w-full">{header}</div>
    </>
  );
}
