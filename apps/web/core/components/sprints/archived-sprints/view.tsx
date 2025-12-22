import type { FC } from "react";
import { useMemo } from "react";
// assets
import AllFiltersImage from "@/app/assets/empty-state/sprint/all-filters.svg?url";
import NameFilterImage from "@/app/assets/empty-state/sprint/name-filter.svg?url";
// components
import { SprintsList } from "@/components/sprints/list";
// ui
import { SprintEpicListLayoutLoader } from "@/components/ui/loader/sprint-epic-list-loader";
// hooks
import { useArchivedSprints, getSprintIds } from "@/store/queries/sprint";
import { useSprintFilter } from "@/hooks/store/use-sprint-filter";

export interface IArchivedSprintsView {
  workspaceSlug: string;
  projectId: string;
}

export function ArchivedSprintsView(props: IArchivedSprintsView) {
  const { workspaceSlug, projectId } = props;
  // query hooks
  const { data: archivedSprints, isLoading } = useArchivedSprints(workspaceSlug, projectId);
  // store hooks (for filtering)
  const { archivedSprintsSearchQuery } = useSprintFilter();

  // derived values - apply search filter
  const filteredArchivedSprintIds = useMemo(() => {
    if (!archivedSprints) return [];

    const filtered = archivedSprints.filter((sprint) => {
      if (!archivedSprintsSearchQuery.trim()) return true;
      return sprint.name.toLowerCase().includes(archivedSprintsSearchQuery.toLowerCase());
    });

    return getSprintIds(filtered);
  }, [archivedSprints, archivedSprintsSearchQuery]);

  if (isLoading || !archivedSprints) return <SprintEpicListLayoutLoader />;

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
}
