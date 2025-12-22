import React, { useMemo, useState } from "react";
import { sortBy } from "lodash-es";
import { useParams } from "next/navigation";
// components
import { EpicIcon } from "@plane/propel/icons";
import { Loader } from "@plane/ui";
import { FilterHeader, FilterOption } from "@/components/issues/issue-layouts/filters";
import { useProjectEpics } from "@/store/queries";
// ui

type Props = {
  appliedFilters: string[] | null;
  handleUpdate: (val: string) => void;
  searchQuery: string;
};

export function FilterEpic(props: Props) {
  const { appliedFilters, handleUpdate, searchQuery } = props;
  // hooks
  const { workspaceSlug, projectId } = useParams();
  const { data: epics } = useProjectEpics(workspaceSlug?.toString() ?? "", projectId?.toString() ?? "");
  // states
  const [itemsToRender, setItemsToRender] = useState(5);
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const appliedFiltersCount = appliedFilters?.length ?? 0;

  const sortedOptions = useMemo(() => {
    const filteredOptions = (epics || []).filter((epic) => epic.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return sortBy(filteredOptions, [(epic) => !appliedFilters?.includes(epic.id), (epic) => epic.name.toLowerCase()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleViewToggle = () => {
    if (!sortedOptions) return;

    if (itemsToRender === sortedOptions.length) setItemsToRender(5);
    else setItemsToRender(sortedOptions.length);
  };

  const isLoading = !epics;

  return (
    <>
      <FilterHeader
        title={`Epic ${appliedFiltersCount > 0 ? ` (${appliedFiltersCount})` : ""}`}
        isPreviewEnabled={previewEnabled}
        handleIsPreviewEnabled={() => setPreviewEnabled(!previewEnabled)}
      />
      {previewEnabled && (
        <div>
          {!isLoading && sortedOptions ? (
            sortedOptions.length > 0 ? (
              <>
                {sortedOptions.slice(0, itemsToRender).map((epic) => (
                  <FilterOption
                    key={epic.id}
                    isChecked={appliedFilters?.includes(epic.id) ? true : false}
                    onClick={() => handleUpdate(epic.id)}
                    icon={<EpicIcon className="h-3 w-3 flex-shrink-0" />}
                    title={epic.name}
                  />
                ))}
                {sortedOptions.length > 5 && (
                  <button
                    type="button"
                    className="ml-8 text-11 font-medium text-accent-primary"
                    onClick={handleViewToggle}
                  >
                    {itemsToRender === sortedOptions.length ? "View less" : "View all"}
                  </button>
                )}
              </>
            ) : (
              <p className="text-11 italic text-placeholder">No matches found</p>
            )
          ) : (
            <Loader className="space-y-2">
              <Loader.Item height="20px" />
              <Loader.Item height="20px" />
              <Loader.Item height="20px" />
            </Loader>
          )}
        </div>
      )}
    </>
  );
}
