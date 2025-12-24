"use client";

import { useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import type { Placement } from "@popperjs/core";
import { ChevronDown } from "lucide-react";
// plane imports
import { useTranslation } from "@plane/i18n";
import { SuspendedUserIcon, MembersPropertyIcon } from "@plane/propel/icons";
import { Button } from "@plane/propel/button";
import { SelectCombobox } from "@plane/propel/combobox";
import { EPillSize, EPillVariant, Pill } from "@plane/propel/pill";
import { Tooltip } from "@plane/propel/tooltip";
import type { IUserLite, IWorkspaceMember } from "@plane/types";
import { Avatar, AvatarGroup } from "@plane/ui";
import { cn, getFileURL } from "@plane/utils";
// hooks
import { useUser } from "@/hooks/store/user";
import { usePlatformOS } from "@/hooks/use-platform-os";
import { useWorkspaceMembers, useProjectMembers, getWorkspaceMembersMap } from "@/store/queries/member";
// types
import type { TButtonVariants } from "../types";
import { BUTTON_VARIANTS_WITH_TEXT, BORDER_BUTTON_VARIANTS, BACKGROUND_BUTTON_VARIANTS } from "../constants";

// =============================================================================
// Types
// =============================================================================

type MemberComboboxBaseProps = {
  buttonClassName?: string;
  buttonContainerClassName?: string;
  buttonVariant?: TButtonVariants;
  className?: string;
  disabled?: boolean;
  hideIcon?: boolean;
  placeholder?: string;
  placement?: Placement;
  showTooltip?: boolean;
  tabIndex?: number;
  button?: React.ReactNode;
  dropdownArrow?: boolean;
  dropdownArrowClassName?: string;
  tooltipContent?: string;
  onClose?: () => void;
  showUserDetails?: boolean;
  memberIds?: string[];
  projectId?: string;
  optionsClassName?: string;
};

type MemberComboboxSingleProps = MemberComboboxBaseProps & {
  multiple: false;
  onChange: (val: string | null) => void;
  value: string | null;
};

type MemberComboboxMultiProps = MemberComboboxBaseProps & {
  multiple: true;
  onChange: (val: string[]) => void;
  value: string[];
};

export type MemberComboboxProps = MemberComboboxSingleProps | MemberComboboxMultiProps;

// =============================================================================
// Component
// =============================================================================

export function MemberCombobox(props: MemberComboboxProps) {
  const {
    button,
    buttonClassName,
    buttonContainerClassName,
    buttonVariant = "border-with-text",
    className,
    disabled = false,
    dropdownArrow = false,
    dropdownArrowClassName = "",
    hideIcon = false,
    memberIds: propsMemberIds,
    multiple,
    onChange,
    onClose,
    optionsClassName = "",
    placeholder,
    placement,
    projectId,
    showTooltip = false,
    showUserDetails = false,
    tabIndex,
    tooltipContent,
    value,
  } = props;

  // hooks
  const { t } = useTranslation();
  const { workspaceSlug } = useParams();
  const { data: currentUser } = useUser();
  const { isMobile } = usePlatformOS();

  // data fetching
  const { data: workspaceMembers } = useWorkspaceMembers(workspaceSlug?.toString() ?? "");
  const { data: projectMembers } = useProjectMembers(workspaceSlug?.toString() ?? "", projectId ?? "");

  // Create member maps for lookup
  const workspaceMembersMap = useMemo((): Map<string, IWorkspaceMember> => {
    if (!workspaceMembers) return new Map<string, IWorkspaceMember>();
    return getWorkspaceMembersMap(workspaceMembers);
  }, [workspaceMembers]);

  // Determine member IDs
  const memberIds = useMemo(() => {
    if (propsMemberIds) return propsMemberIds;
    if (projectId && projectMembers) {
      return projectMembers
        .map((m) => (typeof m.member === "string" ? m.member : (m.member as { id?: string })?.id))
        .filter((id): id is string => Boolean(id));
    }
    if (workspaceMembers) {
      return workspaceMembers
        .map((m) => (typeof m.member === "string" ? m.member : (m.member as { id?: string })?.id))
        .filter((id): id is string => Boolean(id));
    }
    return [];
  }, [propsMemberIds, projectId, projectMembers, workspaceMembers]);

  // Helper functions
  const getUserDetails = useCallback(
    (userId: string): IUserLite | undefined => {
      const workspaceMember = workspaceMembersMap.get(userId);
      return workspaceMember?.member;
    },
    [workspaceMembersMap]
  );

  const isUserSuspended = useCallback(
    (userId: string): boolean => {
      const workspaceMember = workspaceMembersMap.get(userId);
      return workspaceMember?.is_active === false;
    },
    [workspaceMembersMap]
  );

  // Get display text
  const displayText = useMemo(() => {
    const defaultPlaceholder = placeholder ?? t("members");

    if (Array.isArray(value)) {
      if (value.length === 0) return defaultPlaceholder;
      if (value.length === 1) {
        return getUserDetails(value[0])?.display_name ?? defaultPlaceholder;
      }
      return showUserDetails ? `${value.length} ${t("members").toLowerCase()}` : "";
    } else {
      if (!value) return defaultPlaceholder;
      return showUserDetails ? getUserDetails(value)?.display_name ?? defaultPlaceholder : defaultPlaceholder;
    }
  }, [value, placeholder, showUserDetails, t, getUserDetails]);

  // Handle value change
  const handleValueChange = (newValue: string | string[] | null) => {
    if (multiple) {
      (onChange as (val: string[]) => void)(Array.isArray(newValue) ? newValue : []);
    } else {
      (onChange as (val: string | null) => void)(typeof newValue === "string" ? newValue : null);
    }
  };

  // Convert placement to side/align for SelectCombobox
  const sideAlign = useMemo(() => {
    if (!placement) return { side: "bottom" as const, align: "start" as const };

    const parts = placement.split("-");
    const side = parts[0] as "top" | "bottom" | "left" | "right";
    const align = parts[1] === "end" ? "end" : parts[1] === "start" ? "start" : "center";

    return { side, align: align as "start" | "center" | "end" };
  }, [placement]);

  // Render avatar button content
  const renderAvatars = () => {
    if (hideIcon) return null;

    if (Array.isArray(value) && value.length > 0) {
      return (
        <AvatarGroup size="md" showTooltip={!showTooltip}>
          {value.map((userId) => {
            const userDetails = getUserDetails(userId);
            if (!userDetails) return null;
            return (
              <Avatar key={userId} src={getFileURL(userDetails.avatar_url)} name={userDetails.display_name} />
            );
          })}
        </AvatarGroup>
      );
    } else if (typeof value === "string" && value) {
      const userDetails = getUserDetails(value);
      return (
        <Avatar
          src={getFileURL(userDetails?.avatar_url ?? "")}
          name={userDetails?.display_name}
          size="md"
          showTooltip={!showTooltip}
        />
      );
    }

    return <MembersPropertyIcon className="h-3 w-3 mx-[4px] flex-shrink-0" />;
  };

  // Button styling based on variant
  const getButtonClassName = () => {
    const baseClasses = "h-full w-full flex items-center justify-start gap-1.5";

    if (BORDER_BUTTON_VARIANTS.includes(buttonVariant)) {
      return cn(baseClasses, "border-[0.5px] border-strong");
    }
    if (BACKGROUND_BUTTON_VARIANTS.includes(buttonVariant)) {
      return cn(baseClasses, "bg-layer-3 hover:bg-layer-1-hover");
    }
    return baseClasses;
  };

  // The trigger button
  const triggerButton = button ? (
    <div className={cn("clickable block h-full w-full outline-none", buttonContainerClassName)}>{button}</div>
  ) : (
    <Tooltip
      tooltipHeading={placeholder ?? t("members")}
      tooltipContent={
        <>{tooltipContent ?? `${Array.isArray(value) ? value.length : value ? 1 : 0} ${t("assignees")}`}</>
      }
      disabled={!showTooltip}
      isMobile={isMobile}
    >
      <Button
        variant="ghost"
        size="sm"
        className={cn(getButtonClassName(), "text-11", buttonClassName)}
        disabled={disabled}
        tabIndex={tabIndex}
      >
        {renderAvatars()}
        {BUTTON_VARIANTS_WITH_TEXT.includes(buttonVariant) && (
          <span className="flex-grow truncate leading-5 text-left text-body-xs-medium">{displayText}</span>
        )}
        {dropdownArrow && (
          <ChevronDown className={cn("h-2.5 w-2.5 flex-shrink-0", dropdownArrowClassName)} aria-hidden="true" />
        )}
      </Button>
    </Tooltip>
  );

  return (
    <div className={cn("h-full", className)}>
      <SelectCombobox
        value={multiple ? value : value ?? null}
        onValueChange={handleValueChange}
        onOpenChange={(open) => {
          if (!open) onClose?.();
        }}
        multiple={multiple}
        disabled={disabled}
      >
        <SelectCombobox.Trigger className={cn("h-full", buttonContainerClassName)}>
          {triggerButton}
        </SelectCombobox.Trigger>

        <SelectCombobox.Content
          className={cn("w-48", optionsClassName)}
          searchPlaceholder={t("search")}
          emptyMessage={t("no_matching_results")}
          showSearch={true}
          maxHeight="md"
          side={sideAlign.side}
          align={sideAlign.align}
          width="auto"
        >
          {memberIds.map((userId) => {
            const userDetails = getUserDetails(userId);
            const isSuspended = isUserSuspended(userId);

            return (
              <SelectCombobox.Item
                key={userId}
                value={userId}
                disabled={isSuspended}
                keywords={[
                  userDetails?.display_name ?? "",
                  userDetails?.first_name ?? "",
                  userDetails?.last_name ?? "",
                ]}
                className={cn(
                  "flex items-center justify-between gap-2",
                  isSuspended && "cursor-not-allowed opacity-50"
                )}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-4 flex-shrink-0">
                    {isSuspended ? (
                      <SuspendedUserIcon className="h-3.5 w-3.5 text-placeholder" />
                    ) : (
                      <Avatar name={userDetails?.display_name} src={getFileURL(userDetails?.avatar_url ?? "")} />
                    )}
                  </div>
                  <span className={cn("flex-grow truncate", isSuspended && "text-placeholder")}>
                    {currentUser?.id === userId ? t("you") : userDetails?.display_name}
                  </span>
                </div>
                {isSuspended && (
                  <Pill variant={EPillVariant.DEFAULT} size={EPillSize.XS} className="border-none flex-shrink-0">
                    Suspended
                  </Pill>
                )}
              </SelectCombobox.Item>
            );
          })}
        </SelectCombobox.Content>
      </SelectCombobox>
    </div>
  );
}
