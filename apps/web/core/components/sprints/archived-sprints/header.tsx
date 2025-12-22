import type { FC } from "react";
import { useCallback, useRef, useState } from "react";
import { useParams } from "next/navigation";
// icons
import { ListFilter, Search } from "lucide-react";
import { useOutsideClickDetector } from "@plane/hooks";
import { CloseIcon } from "@plane/propel/icons";
// plane helpers
// types
import type { TSprintFilters } from "@plane/types";
import { cn, calculateTotalFilters } from "@plane/utils";
// components
import { ArchiveTabsList } from "@/components/archives";
import { FiltersDropdown } from "@/components/issues/issue-layouts/filters";
// hooks
import { useSprintFilter } from "@/hooks/store/use-sprint-filter";
// local imports
import { SprintFiltersSelection } from "../dropdowns";

export function ArchivedSprintsHeader() {
  // router
  const { projectId } = useParams();
  // refs
  const inputRef = useRef<HTMLInputElement>(null);
  // hooks
  const { currentProjectArchivedFilters, archivedSprintsSearchQuery, updateFilters, updateArchivedSprintsSearchQuery } =
    useSprintFilter();
  // states
  const [isSearchOpen, setIsSearchOpen] = useState(archivedSprintsSearchQuery !== "" ? true : false);
  // outside click detector hook
  useOutsideClickDetector(inputRef, () => {
    if (isSearchOpen && archivedSprintsSearchQuery.trim() === "") setIsSearchOpen(false);
  });

  const handleFilters = useCallback(
    (key: keyof TSprintFilters, value: string | string[]) => {
      if (!projectId) return;
      const newValues = currentProjectArchivedFilters?.[key] ?? [];

      if (Array.isArray(value))
        value.forEach((val) => {
          if (!newValues.includes(val)) newValues.push(val);
          else newValues.splice(newValues.indexOf(val), 1);
        });
      else {
        if (currentProjectArchivedFilters?.[key]?.includes(value)) newValues.splice(newValues.indexOf(value), 1);
        else newValues.push(value);
      }

      updateFilters(projectId.toString(), { [key]: newValues }, "archived");
    },
    [currentProjectArchivedFilters, projectId, updateFilters]
  );

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (archivedSprintsSearchQuery && archivedSprintsSearchQuery.trim() !== "") updateArchivedSprintsSearchQuery("");
      else {
        setIsSearchOpen(false);
        inputRef.current?.blur();
      }
    }
  };

  const isFiltersApplied = calculateTotalFilters(currentProjectArchivedFilters ?? {}) !== 0;

  return (
    <div className="group relative flex border-b border-subtle">
      <div className="flex w-full items-center overflow-x-auto px-4 gap-2 horizontal-scrollbar scrollbar-sm">
        <ArchiveTabsList />
      </div>
      {/* filter options */}
      <div className="h-full flex items-center gap-3 self-end px-8">
        {!isSearchOpen && (
          <button
            type="button"
            className="-mr-5 p-2 hover:bg-layer-1 rounded-sm text-placeholder grid place-items-center"
            onClick={() => {
              setIsSearchOpen(true);
              inputRef.current?.focus();
            }}
          >
            <Search className="h-3.5 w-3.5" />
          </button>
        )}
        <div
          className={cn(
            "ml-auto flex items-center justify-start gap-1 rounded-md border border-transparent bg-surface-1 text-placeholder w-0 transition-[width] ease-linear overflow-hidden opacity-0",
            {
              "w-64 px-2.5 py-1.5 border-subtle opacity-100": isSearchOpen,
            }
          )}
        >
          <Search className="h-3.5 w-3.5" />
          <input
            ref={inputRef}
            className="w-full max-w-[234px] border-none bg-transparent text-13 text-primary placeholder:text-placeholder focus:outline-none"
            placeholder="Search"
            value={archivedSprintsSearchQuery}
            onChange={(e) => updateArchivedSprintsSearchQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
          />
          {isSearchOpen && (
            <button
              type="button"
              className="grid place-items-center"
              onClick={() => {
                updateArchivedSprintsSearchQuery("");
                setIsSearchOpen(false);
              }}
            >
              <CloseIcon className="h-3 w-3" />
            </button>
          )}
        </div>
        <FiltersDropdown
          icon={<ListFilter className="h-3 w-3" />}
          title="Filters"
          placement="bottom-end"
          isFiltersApplied={isFiltersApplied}
        >
          <SprintFiltersSelection
            filters={currentProjectArchivedFilters ?? {}}
            handleFiltersUpdate={handleFilters}
            isArchived
          />
        </FiltersDropdown>
      </div>
    </div>
  );
}
