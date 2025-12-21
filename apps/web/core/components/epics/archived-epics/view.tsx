import type { FC } from "react";
import { observer } from "mobx-react";
// assets
import AllFiltersImage from "@/app/assets/empty-state/module/all-filters.svg?url";
import NameFilterImage from "@/app/assets/empty-state/module/name-filter.svg?url";
// components
import { EpicListItem, EpicPeekOverview } from "@/components/epics";
// ui
import { SprintEpicListLayoutLoader } from "@/components/ui/loader/sprint-module-list-loader";
// hooks
import { useEpic } from "@/hooks/store/use-epic";
import { useEpicFilter } from "@/hooks/store/use-epic-filter";

export interface IArchivedModulesView {
  workspaceSlug: string;
  projectId: string;
}

export const ArchivedModulesView = observer(function ArchivedModulesView(props: IArchivedModulesView) {
  const { workspaceSlug, projectId } = props;
  // store hooks
  const { getFilteredArchivedEpicIds, loader } = useEpic();
  const { archivedModulesSearchQuery } = useEpicFilter();
  // derived values
  const filteredArchivedModuleIds = getFilteredArchivedEpicIds(projectId);

  if (loader || !filteredArchivedModuleIds) return <SprintEpicListLayoutLoader />;

  if (filteredArchivedModuleIds.length === 0)
    return (
      <div className="h-full w-full grid place-items-center">
        <div className="text-center">
          <img
            src={archivedModulesSearchQuery.trim() === "" ? AllFiltersImage : NameFilterImage}
            className="h-36 sm:h-48 w-36 sm:w-48 mx-auto"
            alt="No matching modules"
          />
          <h5 className="text-18 font-medium mt-7 mb-1">No matching modules</h5>
          <p className="text-placeholder text-14">
            {archivedModulesSearchQuery.trim() === ""
              ? "Remove the filters to see all modules"
              : "Remove the search criteria to see all modules"}
          </p>
        </div>
      </div>
    );

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex h-full w-full justify-between">
        <div className="flex h-full w-full flex-col overflow-y-auto vertical-scrollbar scrollbar-lg">
          {filteredArchivedModuleIds.map((epicId) => (
            <EpicListItem key={epicId} epicId={epicId} />
          ))}
        </div>
        <EpicPeekOverview
          projectId={projectId?.toString() ?? ""}
          workspaceSlug={workspaceSlug?.toString() ?? ""}
          isArchived
        />
      </div>
    </div>
  );
});
