import { memo } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
// plane imports
import type { IWorkspaceSidebarNavigationItem } from "@plane/constants";
import { EUserPermissionsLevel } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
// components
import { SidebarNavItem } from "@/components/sidebar/sidebar-navigation";
// hooks
import { useAppTheme } from "@/hooks/store/use-app-theme";
import { useUser, useUserPermissions } from "@/hooks/store/user";
// local imports
import { getSidebarNavigationItemIcon } from "./helper";

type TExtendedSidebarItemProps = {
  item: IWorkspaceSidebarNavigationItem;
  isLastChild: boolean;
};

/**
 * Extended sidebar navigation item - simple navigation link.
 * No customization (drag/drop, pinning) - items shown in fixed order.
 */
export const ExtendedSidebarItem = memo(function ExtendedSidebarItem(props: TExtendedSidebarItemProps) {
  const { item } = props;
  const { t } = useTranslation();

  // nextjs hooks
  const pathname = usePathname();
  const { workspaceSlug } = useParams();
  // store hooks
  const { toggleExtendedSidebar } = useAppTheme();
  const { data } = useUser();
  const { allowPermissions } = useUserPermissions();

  const handleLinkClick = () => toggleExtendedSidebar(true);

  const itemHref =
    item.key === "your_work"
      ? `/${workspaceSlug.toString()}${item.href}${data?.id}`
      : `/${workspaceSlug.toString()}${item.href}`;
  const isActive = itemHref === pathname;

  const icon = getSidebarNavigationItemIcon(item.key);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
  if (!allowPermissions(item.access as any, EUserPermissionsLevel.WORKSPACE, workspaceSlug.toString())) {
    return null;
  }

  return (
    <div id={`sidebar-${item.key}`} className="relative">
      <div className="relative w-full flex items-center rounded-md text-primary hover:bg-surface-2" id={`${item.key}`}>
        <SidebarNavItem isActive={isActive}>
          <Link href={itemHref} onClick={() => handleLinkClick()} className="group flex-grow">
            <div className="flex items-center gap-1.5 py-[1px]">
              {icon}
              <p className="text-13 leading-5 font-medium">{t(item.labelTranslationKey)}</p>
            </div>
          </Link>
        </SidebarNavItem>
      </div>
    </div>
  );
});
