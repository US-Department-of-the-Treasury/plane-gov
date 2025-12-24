import { useEffect, useMemo, useRef, useState } from "react";
import type { Placement } from "@popperjs/core";
import { useParams } from "next/navigation";
import { createPortal } from "react-dom";
import { usePopper } from "react-popper";
import { Check, Search } from "lucide-react";
import { Combobox } from "@headlessui/react";
// plane imports
import { useTranslation } from "@plane/i18n";
import { SuspendedUserIcon } from "@plane/propel/icons";
import { EPillSize, EPillVariant, Pill } from "@plane/propel/pill";
import type { IUserLite } from "@plane/types";
import { Avatar } from "@plane/ui";
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
  placement: Placement | undefined;
  referenceElement: HTMLButtonElement | null;
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
  // states
  const [query, setQuery] = useState("");
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
  const [isPositioned, setIsPositioned] = useState(false);
  // plane hooks
  const { t } = useTranslation();
  // store hooks
  const { data: currentUser } = useUser();
  const { data: workspaceMembers } = useWorkspaceMembers(workspaceSlug?.toString());
  const { isMobile } = usePlatformOS();

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
  // popper-js init
  const { styles, attributes, update } = usePopper(referenceElement, popperElement, {
    placement: placement ?? "bottom-start",
    strategy: "fixed",
    modifiers: [
      {
        name: "preventOverflow",
        options: {
          padding: 12,
        },
      },
    ],
  });

  // Force popper to recalculate position when dropdown opens or popper element mounts
  useEffect(() => {
    if (isOpen && popperElement) {
      // Use double rAF to ensure browser has laid out the element before showing
      // First rAF: element is in DOM but not yet painted
      // Second rAF: element is painted, position can be calculated correctly
      let cancelled = false;
      let rafId2: number | undefined;
      const rafId1 = requestAnimationFrame(() => {
        if (cancelled) return;
        rafId2 = requestAnimationFrame(() => {
          if (cancelled) return;
          const updatePromise = update?.();
          if (updatePromise) {
            updatePromise
              .then(() => {
                if (!cancelled) setIsPositioned(true);
                return undefined;
              })
              .catch(() => {
                if (!cancelled) setIsPositioned(true);
              });
          } else {
            setIsPositioned(true);
          }
        });
      });
      return () => {
        cancelled = true;
        cancelAnimationFrame(rafId1);
        if (rafId2 !== undefined) cancelAnimationFrame(rafId2);
      };
    }
  }, [isOpen, update, popperElement]);

  useEffect(() => {
    if (isOpen) {
      onDropdownOpen?.();
      if (!isMobile) {
        inputRef.current && inputRef.current.focus();
      }
    }
  }, [isOpen, isMobile]);

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

  return createPortal(
    <div
      ref={setPopperElement}
      className="z-50"
      style={{
        ...styles.popper,
        opacity: isPositioned ? 1 : 0,
      }}
      {...attributes.popper}
    >
      <Combobox.Options data-prevent-outside-click static>
        <div
          className={cn(
            "my-1 w-48 rounded-sm border-[0.5px] border-strong bg-surface-1 px-2 py-2.5 text-11 shadow-raised-200 focus:outline-none",
            optionsClassName
          )}
        >
        <div className="flex items-center gap-1.5 rounded-sm border border-subtle bg-surface-2 px-2">
          <Search className="h-3.5 w-3.5 text-placeholder" strokeWidth={1.5} />
          <Combobox.Input
            as="input"
            ref={inputRef}
            className="w-full bg-transparent py-1 text-11 text-secondary placeholder:text-placeholder focus:outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search")}
            displayValue={(assigned: any) => assigned?.name}
            onKeyDown={searchInputKeyDown}
          />
        </div>
        <div className="mt-2 max-h-48 space-y-1 overflow-y-scroll">
          {filteredOptions ? (
            filteredOptions.length > 0 ? (
              filteredOptions.map(
                (option) =>
                  option && (
                    <Combobox.Option
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
                        </>
                      )}
                    </Combobox.Option>
                  )
              )
            ) : (
              <p className="px-1.5 py-1 italic text-placeholder">{t("no_matching_results")}</p>
            )
          ) : (
            <p className="px-1.5 py-1 italic text-placeholder">{t("loading")}</p>
          )}
        </div>
        </div>
      </Combobox.Options>
    </div>,
    document.body
  );
}
