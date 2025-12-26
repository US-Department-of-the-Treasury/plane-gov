"use client";

import * as React from "react";
import { useMemo, useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
// plane imports
import { useTranslation } from "@plane/i18n";
import { SuspendedUserIcon, MembersPropertyIcon } from "@plane/propel/icons";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@plane/propel/primitives";
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
  placement?: string;
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
    showTooltip = false,
    showUserDetails = false,
    tabIndex,
    tooltipContent,
    value,
    projectId,
  } = props;

  // State
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
      return showUserDetails ? (getUserDetails(value)?.display_name ?? defaultPlaceholder) : defaultPlaceholder;
    }
  }, [value, placeholder, showUserDetails, t, getUserDetails]);

  // Handle selection
  const handleSelect = useCallback(
    (userId: string) => {
      const isSuspended = isUserSuspended(userId);
      if (isSuspended) return;

      if (multiple) {
        const currentValues = Array.isArray(value) ? value : [];
        const isSelected = currentValues.includes(userId);
        if (isSelected) {
          (onChange as (val: string[]) => void)(currentValues.filter((v) => v !== userId));
        } else {
          (onChange as (val: string[]) => void)([...currentValues, userId]);
        }
      } else {
        const isSelected = value === userId;
        if (isSelected) {
          (onChange as (val: string | null) => void)(null);
        } else {
          (onChange as (val: string | null) => void)(userId);
        }
        setOpen(false);
      }
    },
    [multiple, value, onChange, isUserSuspended]
  );

  // Check if selected
  const isSelected = useCallback(
    (userId: string) => {
      if (Array.isArray(value)) {
        return value.includes(userId);
      }
      return value === userId;
    },
    [value]
  );

  // Filter members by search
  const filteredMembers = useMemo(() => {
    if (!searchQuery) return memberIds;
    const searchLower = searchQuery.toLowerCase();
    return memberIds.filter((userId) => {
      const userDetails = getUserDetails(userId);
      if (!userDetails) return false;
      return (
        userDetails.display_name?.toLowerCase().includes(searchLower) ||
        userDetails.first_name?.toLowerCase().includes(searchLower) ||
        userDetails.last_name?.toLowerCase().includes(searchLower)
      );
    });
  }, [memberIds, searchQuery, getUserDetails]);

  // Handle open change
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      setOpen(newOpen);
      if (!newOpen) {
        setSearchQuery("");
        onClose?.();
      }
    },
    [onClose]
  );

  // Render avatar button content
  const renderAvatars = () => {
    if (hideIcon) return null;

    if (Array.isArray(value) && value.length > 0) {
      return (
        <AvatarGroup size="md" showTooltip={!showTooltip}>
          {value.map((userId) => {
            const userDetails = getUserDetails(userId);
            if (!userDetails) return null;
            return <Avatar key={userId} src={getFileURL(userDetails.avatar_url)} name={userDetails.display_name} />;
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

  // The trigger button content
  const triggerContent = button ? (
    button
  ) : (
    <Tooltip
      tooltipHeading={placeholder ?? t("members")}
      tooltipContent={
        <>{tooltipContent ?? `${Array.isArray(value) ? value.length : value ? 1 : 0} ${t("assignees")}`}</>
      }
      disabled={!showTooltip}
      isMobile={isMobile}
    >
      <div
        role="button"
        tabIndex={disabled ? -1 : (tabIndex ?? 0)}
        className={cn(
          getButtonClassName(),
          "text-11 rounded-sm px-2 py-0.5",
          {
            "cursor-not-allowed text-secondary pointer-events-none": disabled,
            "cursor-pointer": !disabled,
          },
          buttonClassName
        )}
      >
        {renderAvatars()}
        {BUTTON_VARIANTS_WITH_TEXT.includes(buttonVariant) && (
          <span className="flex-grow truncate leading-5 text-left text-body-xs-medium">{displayText}</span>
        )}
        {dropdownArrow && (
          <ChevronDown className={cn("h-2.5 w-2.5 flex-shrink-0", dropdownArrowClassName)} aria-hidden="true" />
        )}
      </div>
    </Tooltip>
  );

  return (
    <div className={cn("h-full", className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild disabled={disabled}>
          <div
            className={cn("h-full cursor-pointer outline-none", buttonContainerClassName)}
            tabIndex={disabled ? -1 : 0}
          >
            {triggerContent}
          </div>
        </PopoverTrigger>
        <PopoverContent className={cn("w-48 p-0", optionsClassName)} align="start" sideOffset={4}>
          <Command shouldFilter={false}>
            <CommandInput
              value={searchQuery}
              onValueChange={setSearchQuery}
              placeholder={t("search")}
              className="h-9"
            />
            <CommandList>
              <CommandEmpty>{t("no_matching_results")}</CommandEmpty>
              <CommandGroup>
                {filteredMembers.map((userId) => {
                  const userDetails = getUserDetails(userId);
                  const isSuspended = isUserSuspended(userId);
                  const selected = isSelected(userId);

                  return (
                    <CommandItem
                      key={userId}
                      value={userId}
                      disabled={isSuspended}
                      onSelect={() => handleSelect(userId)}
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
                      {isSuspended ? (
                        <Pill variant={EPillVariant.DEFAULT} size={EPillSize.XS} className="border-none flex-shrink-0">
                          Suspended
                        </Pill>
                      ) : (
                        <Check className={cn("h-4 w-4 flex-shrink-0", selected ? "opacity-100" : "opacity-0")} />
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
