import { memo } from "react";
// plane imports
import {
  WORKSPACE_SIDEBAR_DYNAMIC_NAVIGATION_ITEMS_LINKS,
  WORKSPACE_SIDEBAR_STATIC_PINNED_NAVIGATION_ITEMS_LINKS,
} from "@plane/constants";
// plane-web imports
import { SidebarItem } from "@/plane-web/components/workspace/sidebar/sidebar-item";

/**
 * Workspace items in fixed order: Projects (pinned), Views, Analytics, Archives
 * All items always visible at top level (no collapsible header).
 */
const WORKSPACE_ITEMS = [
  ...WORKSPACE_SIDEBAR_STATIC_PINNED_NAVIGATION_ITEMS_LINKS, // Projects
  ...WORKSPACE_SIDEBAR_DYNAMIC_NAVIGATION_ITEMS_LINKS, // Views, Analytics, Archives
];

export const SidebarMenuItems = memo(function SidebarMenuItems() {
  return (
    <div className="flex flex-col gap-0.5">
      {WORKSPACE_ITEMS.map((item, _index) => (
        <SidebarItem key={`workspace_${_index}`} item={item} />
      ))}
    </div>
  );
});
