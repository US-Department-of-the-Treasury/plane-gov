import { useEffect, useMemo, useRef } from "react";
import type { Placement } from "@popperjs/core";
import { useParams } from "next/navigation";
import { Check, Search } from "lucide-react";
// plane imports
import { useTranslation } from "@plane/i18n";
import { SuspendedUserIcon } from "@plane/propel/icons";
import { EPillSize, EPillVariant, Pill } from "@plane/propel/pill";
import type { IUserLite } from "@plane/types";
import { Avatar, RadixComboOptions, RadixComboInput, RadixComboOption, RadixComboList, useRadixCombo } from "@plane/ui";
import { cn, getFileURL } from "@plane/utils";
// hooks
import { useUser } from "@/hooks/store/user";
import { usePlatformOS } from "@/hooks/use-platform-os";
import { useWorkspaceMembers, getWorkspaceMembersMap } from "@/store/queries/member";

interface Props {
  className?: string;
  getUserDetails: (userId: string) => IUserLite | undefined;
  isOpen: boolean;
  memberIds?: string[];
  onDropdownOpen?: () => void;
  optionsClassName?: string;
  placement?: Placement;
  referenceElement?: HTMLElement | null;
}

export function MemberOptions(props: Props) {
  const {
    getUserDetails,
    isOpen,
    memberIds,
    onDropdownOpen,
    optionsClassName = "",
    placement,
    referenceElement,
  } = props;
  // router
  const { workspaceSlug } = useParams();
  // refs
  const inputRef = useRef<HTMLInputElement | null>(null);
  // plane hooks
  const { t } = useTranslation();
  // store hooks
  const { data: currentUser } = useUser();
  const { data: workspaceMembers } = useWorkspaceMembers(workspaceSlug?.toString());
  const { isMobile } = usePlatformOS();
  // Get query state from Radix context
  const { query, setQuery } = useRadixCombo();

  // Create members map for checking suspension status
  const membersMap = useMemo(() => {
    if (!workspaceMembers) return new Map();
    return getWorkspaceMembersMap(workspaceMembers);
  }, [workspaceMembers]);

  // Helper function to check if user is suspended
  const isUserSuspended = (userId: string) => {
    const workspaceMember = membersMap.get(userId);
    return workspaceMember?.is_active === false;
  };

  // Helper function to check if user is invited (pending)
  const isUserInvited = (userId: string) => {
    const userDetails = getUserDetails(userId);
    return userDetails?.status === "invited";
  };

  useEffect(() => {
    if (isOpen) {
      onDropdownOpen?.();
      if (!isMobile && inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [isOpen, isMobile, onDropdownOpen]);

  const searchInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (query !== "" && e.key === "Escape") {
      e.stopPropagation();
      setQuery("");
    }
  };

  const options = memberIds
    ?.map((userId) => {
      const userDetails = getUserDetails(userId);
      return {
        value: userId,
        query: `${userDetails?.display_name} ${userDetails?.first_name} ${userDetails?.last_name}`,
        content: (
          <div className="flex items-center gap-2">
            <div className="w-4">
              {isUserSuspended(userId) ? (
                <SuspendedUserIcon className="h-3.5 w-3.5 text-placeholder" />
              ) : (
                <Avatar name={userDetails?.display_name} src={getFileURL(userDetails?.avatar_url ?? "")} />
              )}
            </div>
            <span className={cn("flex-grow truncate", isUserSuspended(userId) ? "text-placeholder" : "")}>
              {currentUser?.id === userId ? t("you") : userDetails?.display_name}
            </span>
          </div>
        ),
      };
    })
    .filter((o) => !!o);

  const filteredOptions =
    query === "" ? options : options?.filter((o) => o?.query.toLowerCase().includes(query.toLowerCase()));

  return (
    <RadixComboOptions
      static
      placement={placement ?? "bottom-start"}
      referenceElement={referenceElement}
    >
      <div
        className={cn(
          "my-1 w-48 rounded-sm border-[0.5px] border-strong bg-surface-1 px-2 py-2.5 text-11 shadow-raised-200 focus:outline-none",
          optionsClassName
        )}
      >
        <div className="flex items-center gap-1.5 rounded-sm border border-subtle bg-surface-2 px-2">
          <Search className="h-3.5 w-3.5 text-placeholder" strokeWidth={1.5} />
          <RadixComboInput
            ref={inputRef}
            className="w-full bg-transparent py-1 text-11 text-secondary placeholder:text-placeholder focus:outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search")}
            onKeyDown={searchInputKeyDown}
          />
        </div>
        <RadixComboList className="mt-2 space-y-1">
          {filteredOptions ? (
            filteredOptions.length > 0 ? (
              filteredOptions.map(
                (option) =>
                  option && (
                    <RadixComboOption
                      key={option.value}
                      value={option.value}
                      className={({ active, selected }) =>
                        cn(
                          "flex w-full select-none items-center justify-between gap-2 truncate rounded-sm px-1 py-1.5",
                          active && "bg-layer-transparent-hover",
                          selected ? "text-primary" : "text-secondary",
                          isUserSuspended(option.value) ? "cursor-not-allowed" : "cursor-pointer"
                        )
                      }
                      disabled={isUserSuspended(option.value)}
                    >
                      {({ selected }) => (
                        <>
                          <span className="flex-grow truncate">{option.content}</span>
                          {selected && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                          {isUserSuspended(option.value) && (
                            <Pill variant={EPillVariant.DEFAULT} size={EPillSize.XS} className="border-none">
                              Suspended
                            </Pill>
                          )}
                          {!isUserSuspended(option.value) && isUserInvited(option.value) && (
                            <Pill variant={EPillVariant.WARNING} size={EPillSize.XS} className="border-none">
                              Pending
                            </Pill>
                          )}
                        </>
                      )}
                    </RadixComboOption>
                  )
              )
            ) : (
              <p className="px-1.5 py-1 italic text-placeholder">{t("no_matching_results")}</p>
            )
          ) : (
            <p className="px-1.5 py-1 italic text-placeholder">{t("loading")}</p>
          )}
        </RadixComboList>
      </div>
    </RadixComboOptions>
  );
}
