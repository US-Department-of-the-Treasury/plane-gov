import { memo, useMemo } from "react";
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
import {
  usePersonalNavigationPreferences,
  useWorkspaceNavigationPreferences,
} from "@/hooks/use-navigation-preferences";
// plane-web imports
import { SidebarItem } from "@/plane-web/components/workspace/sidebar/sidebar-item";

export const SidebarMenuItems = memo(function SidebarMenuItems() {
  // routers
  const { setValue: toggleWorkspaceMenu, storedValue: isWorkspaceMenuOpen } = useLocalStorage<boolean>(
    "is_workspace_menu_open",
    true
  );

  // hooks
  const { preferences: personalPreferences } = usePersonalNavigationPreferences();
  const { preferences: workspacePreferences } = useWorkspaceNavigationPreferences();
  // translation
  const { t } = useTranslation();

  const toggleListDisclosure = (isOpen: boolean) => {
    toggleWorkspaceMenu(isOpen);
  };

  // Filter static navigation items based on personal preferences
  const filteredStaticNavigationItems = useMemo(() => {
    const items = [...WORKSPACE_SIDEBAR_STATIC_NAVIGATION_ITEMS_LINKS];
    const personalItems: Array<(typeof items)[0] & { sort_order: number }> = [];

    // Add personal items based on preferences with their sort_order
    if (personalPreferences.items.your_work?.enabled && WORKSPACE_SIDEBAR_STATIC_NAVIGATION_ITEMS["your-work"]) {
      personalItems.push({
        ...WORKSPACE_SIDEBAR_STATIC_NAVIGATION_ITEMS["your-work"],
        sort_order: personalPreferences.items.your_work.sort_order,
      });
    }
    if (personalPreferences.items.drafts?.enabled && WORKSPACE_SIDEBAR_STATIC_NAVIGATION_ITEMS["drafts"]) {
      personalItems.push({
        ...WORKSPACE_SIDEBAR_STATIC_NAVIGATION_ITEMS["drafts"],
        sort_order: personalPreferences.items.drafts.sort_order,
      });
    }

    // Sort personal items by sort_order
    personalItems.sort((a, b) => a.sort_order - b.sort_order);

    // Merge static items with sorted personal items
    return [...items, ...personalItems];
  }, [personalPreferences]);

  const sortedNavigationItems = useMemo(
    () =>
      WORKSPACE_SIDEBAR_DYNAMIC_NAVIGATION_ITEMS_LINKS.map((item) => {
        const preference = workspacePreferences.items[item.key];
        return {
          ...item,
          sort_order: preference ? preference.sort_order : 0,
        };
      }).sort((a, b) => a.sort_order - b.sort_order),
    [workspacePreferences]
  );

  return (
    <>
      <div className="flex flex-col gap-0.5">
        {filteredStaticNavigationItems.map((item, _index) => (
          <SidebarItem key={`static_${_index}`} item={item} />
        ))}
      </div>
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
            {WORKSPACE_SIDEBAR_STATIC_PINNED_NAVIGATION_ITEMS_LINKS.map((item, _index) => (
              <SidebarItem key={`static_${_index}`} item={item} />
            ))}
            {sortedNavigationItems.map((item, _index) => (
              <SidebarItem key={`dynamic_${_index}`} item={item} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
});
