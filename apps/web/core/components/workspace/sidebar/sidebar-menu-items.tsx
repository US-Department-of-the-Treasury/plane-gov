import { memo } from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@plane/propel/primitives";
// plane imports
import {
  WORKSPACE_SIDEBAR_DYNAMIC_NAVIGATION_ITEMS_LINKS,
  WORKSPACE_SIDEBAR_STATIC_NAVIGATION_ITEMS,
  WORKSPACE_SIDEBAR_STATIC_NAVIGATION_ITEMS_LINKS,
  WORKSPACE_SIDEBAR_STATIC_PINNED_NAVIGATION_ITEMS_LINKS,
} from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { ChevronRightIcon } from "@plane/propel/icons";
import { cn } from "@plane/utils";
// store hooks
import useLocalStorage from "@/hooks/use-local-storage";
// plane-web imports
import { SidebarItem } from "@/plane-web/components/workspace/sidebar/sidebar-item";

/**
 * Personal items in fixed order: Home, Your Work, Drafts
 * All items always visible.
 */
const PERSONAL_ITEMS = [
  ...WORKSPACE_SIDEBAR_STATIC_NAVIGATION_ITEMS_LINKS, // Home
  WORKSPACE_SIDEBAR_STATIC_NAVIGATION_ITEMS["your-work"],
  WORKSPACE_SIDEBAR_STATIC_NAVIGATION_ITEMS["drafts"],
].filter(Boolean);

/**
 * Workspace items in fixed order: Projects (pinned), Views, Analytics, Archives
 * All items always visible.
 */
const WORKSPACE_ITEMS = [
  ...WORKSPACE_SIDEBAR_STATIC_PINNED_NAVIGATION_ITEMS_LINKS, // Projects
  ...WORKSPACE_SIDEBAR_DYNAMIC_NAVIGATION_ITEMS_LINKS, // Views, Analytics, Archives
];

export const SidebarMenuItems = memo(function SidebarMenuItems() {
  // localStorage for workspace section collapse state
  const { setValue: toggleWorkspaceMenu, storedValue: isWorkspaceMenuOpen } = useLocalStorage<boolean>(
    "is_workspace_menu_open",
    true
  );

  // translation
  const { t } = useTranslation();

  const toggleListDisclosure = (isOpen: boolean) => {
    toggleWorkspaceMenu(isOpen);
  };

  return (
    <>
      {/* Personal Section: Home, Your Work, Drafts - fixed order, all visible */}
      <div className="flex flex-col gap-0.5">
        {PERSONAL_ITEMS.map((item, _index) => (
          <SidebarItem key={`personal_${_index}`} item={item} />
        ))}
      </div>

      {/* Workspace Section: Projects, Views, Analytics, Archives - fixed order, all visible */}
      <Collapsible open={!!isWorkspaceMenuOpen} onOpenChange={toggleListDisclosure} className="flex flex-col">
        <div className="group w-full flex items-center justify-between px-2 py-1.5 rounded-sm text-placeholder hover:bg-layer-transparent-hover">
          <CollapsibleTrigger
            className="w-full flex items-center gap-1 whitespace-nowrap text-left text-13 font-semibold text-placeholder"
            aria-label={t(
              isWorkspaceMenuOpen
                ? "aria_labels.app_sidebar.close_workspace_menu"
                : "aria_labels.app_sidebar.open_workspace_menu"
            )}
          >
            <span className="text-13 font-semibold">{t("workspace")}</span>
          </CollapsibleTrigger>
          <div className="flex items-center opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto">
            <CollapsibleTrigger
              className="p-0.5 rounded-sm hover:bg-layer-1 flex-shrink-0"
              aria-label={t(
                isWorkspaceMenuOpen
                  ? "aria_labels.app_sidebar.close_workspace_menu"
                  : "aria_labels.app_sidebar.open_workspace_menu"
              )}
            >
              <ChevronRightIcon
                className={cn("flex-shrink-0 size-3 transition-all", {
                  "rotate-90": isWorkspaceMenuOpen,
                })}
              />
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
          <div className="flex flex-col gap-0.5">
            {WORKSPACE_ITEMS.map((item, _index) => (
              <SidebarItem key={`workspace_${_index}`} item={item} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
});
