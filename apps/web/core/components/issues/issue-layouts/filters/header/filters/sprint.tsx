import { useMemo, useState } from "react";
import { sortBy } from "lodash-es";
import { observer } from "mobx-react";
import { SprintGroupIcon } from "@plane/propel/icons";
import type { TSprintGroups } from "@plane/types";
// components
import { Loader } from "@plane/ui";
import { FilterHeader, FilterOption } from "@/components/issues/issue-layouts/filters";
import { useSprint } from "@/hooks/store/use-sprint";
// ui
// types

type Props = {
  appliedFilters: string[] | null;
  handleUpdate: (val: string) => void;
  searchQuery: string;
};

export const FilterSprint = observer(function FilterSprint(props: Props) {
  const { appliedFilters, handleUpdate, searchQuery } = props;

  // hooks
  const { getSprintById, currentWorkspaceSprintIds } = useSprint();

  // states
  const [itemsToRender, setItemsToRender] = useState(5);
  const [previewEnabled, setPreviewEnabled] = useState(true);

  const sprintIds = currentWorkspaceSprintIds ?? undefined;
  const sprints = sprintIds?.map((sprintId) => getSprintById(sprintId)!) ?? null;
  const appliedFiltersCount = appliedFilters?.length ?? 0;

  const sortedOptions = useMemo(() => {
    const filteredOptions = (sprints || []).filter((sprint) =>
      sprint.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return sortBy(filteredOptions, [
      (sprint) => !appliedFilters?.includes(sprint.id),
      (sprint) => sprint.name.toLowerCase(),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleViewToggle = () => {
    if (!sortedOptions) return;

    if (itemsToRender === sortedOptions.length) setItemsToRender(5);
    else setItemsToRender(sortedOptions.length);
  };

  const sprintStatus = (status: TSprintGroups | undefined) =>
    (status ? status.toLocaleLowerCase() : "draft") as TSprintGroups;

  return (
    <>
      <FilterHeader
        title={`Sprint ${appliedFiltersCount > 0 ? ` (${appliedFiltersCount})` : ""}`}
        isPreviewEnabled={previewEnabled}
        handleIsPreviewEnabled={() => setPreviewEnabled(!previewEnabled)}
      />
      {previewEnabled && (
        <div>
          {sortedOptions ? (
            sortedOptions.length > 0 ? (
              <>
                {sortedOptions.slice(0, itemsToRender).map((sprint) => (
                  <FilterOption
                    key={sprint.id}
                    isChecked={appliedFilters?.includes(sprint.id) ? true : false}
                    onClick={() => handleUpdate(sprint.id)}
                    icon={
                      <SprintGroupIcon sprintGroup={sprintStatus(sprint?.status)} className="h-3.5 w-3.5 flex-shrink-0" />
                    }
                    title={sprint.name}
                    activePulse={sprintStatus(sprint?.status) === "current" ? true : false}
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
});
