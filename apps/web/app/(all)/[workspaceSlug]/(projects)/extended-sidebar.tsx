import { useCallback, useMemo, useRef } from "react";

import { useParams } from "next/navigation";
// plane imports
import { WORKSPACE_SIDEBAR_DYNAMIC_NAVIGATION_ITEMS_LINKS, EUserPermissionsLevel } from "@plane/constants";
// hooks
import { useAppTheme } from "@/hooks/store/use-app-theme";
import { useUserPermissions } from "@/hooks/store/user";
// plane-web imports
import { ExtendedSidebarItem } from "@/plane-web/components/workspace/sidebar/extended-sidebar-item";
import { ExtendedSidebarWrapper } from "./extended-sidebar-wrapper";

/**
 * Extended sidebar showing workspace navigation items in fixed order.
 * No customization - items are displayed based on permissions only.
 */
export function ExtendedAppSidebar() {
  // refs
  const extendedSidebarRef = useRef<HTMLDivElement | null>(null);
  // routers
  const { workspaceSlug } = useParams();
  // store hooks
  const { isExtendedSidebarOpened, toggleExtendedSidebar } = useAppTheme();
  const { allowPermissions } = useUserPermissions();

  // Filter items by permission, maintain fixed order from constants
  const navigationItems = useMemo(() => {
    const slug = workspaceSlug.toString();

    return WORKSPACE_SIDEBAR_DYNAMIC_NAVIGATION_ITEMS_LINKS.filter((item) =>
      allowPermissions(item.access, EUserPermissionsLevel.WORKSPACE, slug)
    );
  }, [workspaceSlug, allowPermissions]);

  const handleClose = useCallback(() => toggleExtendedSidebar(false), [toggleExtendedSidebar]);

  return (
    <ExtendedSidebarWrapper
      isExtendedSidebarOpened={!!isExtendedSidebarOpened}
      extendedSidebarRef={extendedSidebarRef}
      handleClose={handleClose}
      excludedElementId="extended-sidebar-toggle"
    >
      {navigationItems.map((item, index) => (
        <ExtendedSidebarItem key={item.key} item={item} isLastChild={index === navigationItems.length - 1} />
      ))}
    </ExtendedSidebarWrapper>
  );
}
