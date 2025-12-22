import React, { useMemo, useState } from "react";
import { sortBy } from "lodash-es";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// components
import { ModuleIcon } from "@plane/propel/icons";
import { Loader } from "@plane/ui";
import { FilterHeader, FilterOption } from "@/components/issues/issue-layouts/filters";
import { useProjectModules } from "@/store/queries/module";
// ui

type Props = {
  appliedFilters: string[] | null;
  handleUpdate: (val: string) => void;
  searchQuery: string;
};

export const FilterModule = observer(function FilterModule(props: Props) {
  const { appliedFilters, handleUpdate, searchQuery } = props;
  // hooks
  const { projectId, workspaceSlug } = useParams();
  // fetch modules using TanStack Query
  const { data: modules, isLoading } = useProjectModules(
    workspaceSlug?.toString() ?? "",
    projectId?.toString() ?? ""
  );
  // states
  const [itemsToRender, setItemsToRender] = useState(5);
  const [previewEnabled, setPreviewEnabled] = useState(true);

  const appliedFiltersCount = appliedFilters?.length ?? 0;

  const sortedOptions = useMemo(() => {
    const filteredOptions = (modules || []).filter((module) =>
      module.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return sortBy(filteredOptions, [
      (module) => !appliedFilters?.includes(module.id),
      (module) => module.name.toLowerCase(),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleViewToggle = () => {
    if (!sortedOptions) return;

    if (itemsToRender === sortedOptions.length) setItemsToRender(5);
    else setItemsToRender(sortedOptions.length);
  };

  return (
    <>
      <FilterHeader
        title={`Module ${appliedFiltersCount > 0 ? ` (${appliedFiltersCount})` : ""}`}
        isPreviewEnabled={previewEnabled}
        handleIsPreviewEnabled={() => setPreviewEnabled(!previewEnabled)}
      />
      {previewEnabled && (
        <div>
          {!isLoading && sortedOptions ? (
            sortedOptions.length > 0 ? (
              <>
                {sortedOptions.slice(0, itemsToRender).map((sprint) => (
                  <FilterOption
                    key={sprint.id}
                    isChecked={appliedFilters?.includes(sprint.id) ? true : false}
                    onClick={() => handleUpdate(sprint.id)}
                    icon={<ModuleIcon className="h-3 w-3 flex-shrink-0" />}
                    title={sprint.name}
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
