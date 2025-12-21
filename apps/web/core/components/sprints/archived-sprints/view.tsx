import type { FC } from "react";
import { observer } from "mobx-react";
// assets
import AllFiltersImage from "@/app/assets/empty-state/sprint/all-filters.svg?url";
import NameFilterImage from "@/app/assets/empty-state/sprint/name-filter.svg?url";
// components
import { SprintsList } from "@/components/sprints/list";
// ui
import { SprintModuleListLayoutLoader } from "@/components/ui/loader/sprint-module-list-loader";
// hooks
import { useSprint } from "@/hooks/store/use-sprint";
import { useSprintFilter } from "@/hooks/store/use-sprint-filter";

export interface IArchivedSprintsView {
  workspaceSlug: string;
  projectId: string;
}

export const ArchivedSprintsView = observer(function ArchivedSprintsView(props: IArchivedSprintsView) {
  const { workspaceSlug, projectId } = props;
  // store hooks
  const { getFilteredArchivedSprintIds, loader } = useSprint();
  const { archivedSprintsSearchQuery } = useSprintFilter();
  // derived values
  const filteredArchivedSprintIds = getFilteredArchivedSprintIds(projectId);

  if (loader || !filteredArchivedSprintIds) return <SprintModuleListLayoutLoader />;

  if (filteredArchivedSprintIds.length === 0)
    return (
      <div className="h-full w-full grid place-items-center">
        <div className="text-center">
          <img
            src={archivedSprintsSearchQuery.trim() === "" ? AllFiltersImage : NameFilterImage}
            className="h-36 sm:h-48 w-36 sm:w-48 mx-auto"
            alt="No matching sprints"
          />
          <h5 className="text-18 font-medium mt-7 mb-1">No matching sprints</h5>
          <p className="text-placeholder text-14">
            {archivedSprintsSearchQuery.trim() === ""
              ? "Remove the filters to see all sprints"
              : "Remove the search criteria to see all sprints"}
          </p>
        </div>
      </div>
    );

  return (
    <SprintsList
      completedSprintIds={[]}
      sprintIds={filteredArchivedSprintIds}
      workspaceSlug={workspaceSlug}
      projectId={projectId}
      isArchived
    />
  );
});
