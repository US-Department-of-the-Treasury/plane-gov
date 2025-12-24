import { usePathname } from "next/navigation";
import { Outlet } from "react-router";
// components
import { NotAuthorizedView } from "@/components/auth-screens/not-authorized-view";
import { getWorkspaceActivePath, pathnameToAccessKey } from "@/components/settings/helper";
import { SettingsMobileNav } from "@/components/settings/mobile";
// plane imports
import { WORKSPACE_SETTINGS_ACCESS } from "@plane/constants";
import type { EUserWorkspaceRoles } from "@plane/types";
// plane web components
import { WorkspaceSettingsRightSidebar } from "@/plane-web/components/workspace/right-sidebar";
// hooks
import { useWorkspaceDetails } from "@/store/queries/workspace";
// local components
import { WorkspaceSettingsSidebar } from "./sidebar";

import type { Route } from "./+types/layout";

function WorkspaceSettingLayout({ params }: Route.ComponentProps) {
  // router
  const { workspaceSlug } = params;
  // Use TanStack Query for workspace details - properly triggers re-renders when data loads
  const { data: currentWorkspace, isLoading } = useWorkspaceDetails(workspaceSlug);
  // next hooks
  const pathname = usePathname();
  // derived values
  const { accessKey } = pathnameToAccessKey(pathname);
  const userWorkspaceRole = currentWorkspace?.role as EUserWorkspaceRoles | undefined;

  let isAuthorized: boolean | string = false;
  if (pathname && workspaceSlug && userWorkspaceRole) {
    isAuthorized = WORKSPACE_SETTINGS_ACCESS[accessKey]?.includes(userWorkspaceRole);
  }

  return (
    <>
      <SettingsMobileNav
        hamburgerContent={WorkspaceSettingsSidebar}
        activePath={getWorkspaceActivePath(pathname) || ""}
      />
      <div className="inset-y-0 flex flex-row w-full h-full">
        {!isLoading && currentWorkspace && !isAuthorized ? (
          <NotAuthorizedView section="settings" className="h-auto" />
        ) : (
          <div className="relative flex h-full w-full">
            <div className="hidden md:block">{<WorkspaceSettingsSidebar />}</div>
            <div className="w-full h-full overflow-y-scroll md:pt-page-y">
              <Outlet />
            </div>
            <WorkspaceSettingsRightSidebar workspaceSlug={workspaceSlug} />
          </div>
        )}
      </div>
    </>
  );
}

export default WorkspaceSettingLayout;
