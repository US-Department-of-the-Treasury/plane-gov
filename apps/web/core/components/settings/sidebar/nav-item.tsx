import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@plane/propel/primitives";
// plane imports
import { useTranslation } from "@plane/i18n";
import type { EUserWorkspaceRoles } from "@plane/types";
import { cn, joinUrlPath } from "@plane/utils";
// hooks
import { useUserSettings } from "@/hooks/store/user";

export type TSettingItem = {
  key: string;
  i18n_label: string;
  href: string;
  access?: EUserWorkspaceRoles[];
  icon?: React.ReactNode;
};
export type TSettingsSidebarNavItemProps = {
  workspaceSlug: string;
  setting: TSettingItem;
  isActive: boolean | ((data: { href: string }) => boolean);
  actionIcons?: (props: { type: string; size?: number; className?: string }) => React.ReactNode;
  appendItemsToTitle?: (key: string) => React.ReactNode;
  renderChildren?: (key: string) => React.ReactNode;
};

function SettingsSidebarNavItem(props: TSettingsSidebarNavItemProps) {
  const { workspaceSlug, setting, isActive, actionIcons, appendItemsToTitle, renderChildren } = props;
  // router
  const { projectId } = useParams();
  // i18n
  const { t } = useTranslation();
  // state
  const [isExpanded, setIsExpanded] = useState(projectId === setting.key);
  // hooks
  const { toggleSidebar } = useUserSettings();
  // derived
  const isItemActive = typeof isActive === "function" ? isActive(setting) : isActive;
  const buttonClass = cn("flex w-full items-center px-2 py-1.5 rounded-sm text-secondary justify-between", {
    "bg-layer-transparent-active hover:bg-layer-transparent-active": isItemActive,
    "hover:bg-layer-transparent-hover": !isItemActive,
  });

  const titleElement = (
    <>
      <div className="flex items-center gap-1.5 overflow-hidden">
        {setting.icon
          ? setting.icon
          : actionIcons && actionIcons({ type: setting.key, size: 16, className: "w-4 h-4" })}
        <div className="text-13 font-medium truncate">{t(setting.i18n_label)}</div>
      </div>
      {appendItemsToTitle?.(setting.key)}
    </>
  );

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="flex flex-col w-full" key={setting.key}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "group w-full flex items-center gap-1 whitespace-nowrap text-left text-13 font-semibold text-placeholder"
          )}
        >
          {renderChildren ? (
            <div className={buttonClass}>{titleElement}</div>
          ) : (
            <Link
              href={joinUrlPath(workspaceSlug, setting.href)}
              className={buttonClass}
              onClick={() => toggleSidebar(true)}
            >
              {titleElement}
            </Link>
          )}
        </button>
      </CollapsibleTrigger>
      {/* Nested Navigation */}
      {renderChildren && (
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
          <div className={cn("relative flex flex-col gap-0.5 mt-1 pl-6 mb-1.5")}>
            <div className="absolute left-[15px] top-0 bottom-1 w-px bg-subtle-1" />
            {renderChildren(setting.key)}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

export default SettingsSidebarNavItem;
