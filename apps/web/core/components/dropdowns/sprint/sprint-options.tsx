import { useEffect, useRef, useState } from "react";
import type { Placement } from "@popperjs/core";
import { useParams } from "next/navigation";
// components
import { Check, Search } from "lucide-react";
import { RadixComboOptions, RadixComboInput, RadixComboOption } from "@plane/ui";
// i18n
import { useTranslation } from "@plane/i18n";
// icon
import { SprintGroupIcon, SprintIcon } from "@plane/propel/icons";
import type { TSprintGroups } from "@plane/types";
// ui
// store hooks
import { useWorkspaceSprints, getSprintById, getSprintIds } from "@/store/queries/sprint";
import { usePlatformOS } from "@/hooks/use-platform-os";
// types

type DropdownOptions =
  | {
      value: string | null;
      query: string;
      content: React.ReactNode;
    }[]
  | undefined;

type SprintOptionsProps = {
  projectId: string;
  referenceElement: HTMLElement | null;
  placement: Placement | undefined;
  isOpen: boolean;
  canRemoveSprint: boolean;
  currentSprintId?: string;
};

export function SprintOptions(props: SprintOptionsProps) {
  const { projectId: _projectId, isOpen, referenceElement, placement, canRemoveSprint, currentSprintId } = props;
  // i18n
  const { t } = useTranslation();
  //state hooks
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  // store hooks
  const { workspaceSlug } = useParams();
  const { isMobile } = usePlatformOS();

  // TanStack Query
  const { data: sprints } = useWorkspaceSprints(workspaceSlug?.toString() ?? "");

  useEffect(() => {
    if (isOpen && !isMobile) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMobile]);

  const allSprintIds = getSprintIds(sprints);
  const sprintIds = allSprintIds?.filter((sprintId) => {
    const sprintDetails = getSprintById(sprints, sprintId);
    if (currentSprintId && currentSprintId === sprintId) return false;
    return sprintDetails?.status ? (sprintDetails?.status.toLowerCase() != "completed" ? true : false) : true;
  });

  const searchInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (query !== "" && e.key === "Escape") {
      e.stopPropagation();
      setQuery("");
    }
  };

  const options: DropdownOptions = sprintIds?.map((sprintId) => {
    const sprintDetails = getSprintById(sprints, sprintId);
    const sprintStatus = sprintDetails?.status ? (sprintDetails.status.toLocaleLowerCase() as TSprintGroups) : "draft";

    return {
      value: sprintId,
      query: `${sprintDetails?.name}`,
      content: (
        <div className="flex items-center gap-2">
          <SprintGroupIcon sprintGroup={sprintStatus} className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="flex-grow truncate">{sprintDetails?.name}</span>
        </div>
      ),
    };
  });

  if (canRemoveSprint) {
    options?.unshift({
      value: null,
      query: t("sprint.no_sprint"),
      content: (
        <div className="flex items-center gap-2">
          <SprintIcon className="h-3 w-3 flex-shrink-0" />
          <span className="flex-grow truncate">{t("sprint.no_sprint")}</span>
        </div>
      ),
    });
  }

  const filteredOptions =
    query === "" ? options : options?.filter((o) => o.query.toLowerCase().includes(query.toLowerCase()));

  return (
    <RadixComboOptions
      static
      placement={placement ?? "bottom-start"}
      referenceElement={referenceElement}
      className="my-1 w-48 rounded-sm border-[0.5px] border-strong bg-surface-1 px-2 py-2.5 text-11 shadow-raised-200 focus:outline-none"
    >
      <div className="flex items-center gap-1.5 rounded-sm border border-subtle bg-surface-2 px-2">
        <Search className="h-3.5 w-3.5 text-placeholder" strokeWidth={1.5} />
        <RadixComboInput
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("common.search.label")}
          onKeyDown={searchInputKeyDown}
        />
      </div>
      <div className="mt-2 max-h-48 space-y-1 overflow-y-scroll">
        {filteredOptions ? (
          filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <RadixComboOption
                key={option.value ?? "null"}
                value={option.value ?? ""}
                className={({ active, selected }) =>
                  `flex w-full cursor-pointer select-none items-center justify-between gap-2 truncate rounded-sm px-1 py-1.5 ${
                    active ? "bg-layer-transparent-hover" : ""
                  } ${selected ? "text-primary" : "text-secondary"}`
                }
              >
                {({ selected }) => (
                  <>
                    <span className="flex-grow truncate">{option.content}</span>
                    {selected && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                  </>
                )}
              </RadixComboOption>
            ))
          ) : (
            <p className="px-1.5 py-1 italic text-placeholder">{t("common.search.no_matches_found")}</p>
          )
        ) : (
          <p className="px-1.5 py-1 italic text-placeholder">{t("common.loading")}</p>
        )}
      </div>
    </RadixComboOptions>
  );
}
