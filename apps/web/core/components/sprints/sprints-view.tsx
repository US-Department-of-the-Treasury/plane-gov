import type { FC } from "react";
import { useMemo } from "react";
// components
import { useTranslation } from "@plane/i18n";
import type { ISprint } from "@plane/types";
// assets
import AllFiltersImage from "@/app/assets/empty-state/sprint/all-filters.svg?url";
import NameFilterImage from "@/app/assets/empty-state/sprint/name-filter.svg?url";
// components
import { SprintsList } from "@/components/sprints/list";
import { SprintEpicListLayoutLoader } from "@/components/ui/loader/sprint-epic-list-loader";
// hooks
import { useProjectSprints, getActiveSprint, getCompletedSprints } from "@/store/queries/sprint";
import { useSprintFilter } from "@/hooks/store/use-sprint-filter";
import { shouldFilterSprint } from "@plane/utils";

export interface ISprintsView {
  workspaceSlug: string;
  projectId: string;
}

export function SprintsView(props: ISprintsView) {
  const { workspaceSlug, projectId } = props;
  // store hooks
  const { data: sprints, isLoading } = useProjectSprints(workspaceSlug, projectId);
  const { currentProjectFilters, searchQuery } = useSprintFilter();
  const { t } = useTranslation();

  // derived values - filter and compute sprint lists
  const { filteredSprintIds, filteredCompletedSprintIds, currentProjectActiveSprintId, filteredUpcomingSprintIds } =
    useMemo(() => {
      if (!sprints) {
        return {
          filteredSprintIds: null,
          filteredCompletedSprintIds: null,
          currentProjectActiveSprintId: null,
          filteredUpcomingSprintIds: [],
        };
      }

      const filters = currentProjectFilters ?? {};

      // Filter sprints by search query and filters
      const filtered = sprints
        .filter((sprint: ISprint) => !sprint.archived_at)
        .filter((sprint: ISprint) => sprint.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .filter((sprint: ISprint) => shouldFilterSprint(sprint, filters));

      // Get active sprint
      const activeSprint = getActiveSprint(sprints);
      const activeSprintId = activeSprint?.id ?? null;

      // Get completed sprints
      const completedSprints = getCompletedSprints(filtered);

      // Get all filtered sprint IDs
      const allFilteredIds = filtered.map((sprint: ISprint) => sprint.id);

      // Get upcoming sprint IDs (filtered, excluding active)
      const upcomingIds = allFilteredIds.filter((id: string) => id !== activeSprintId);

      return {
        filteredSprintIds: allFilteredIds,
        filteredCompletedSprintIds: completedSprints.map((s) => s.id),
        currentProjectActiveSprintId: activeSprintId,
        filteredUpcomingSprintIds: upcomingIds,
      };
    }, [sprints, currentProjectFilters, searchQuery]);

  if (isLoading || !filteredSprintIds) return <SprintEpicListLayoutLoader />;

  if (filteredSprintIds.length === 0 && filteredCompletedSprintIds?.length === 0)
    return (
      <div className="grid h-full w-full place-items-center">
        <div className="text-center">
          <img
            src={searchQuery.trim() === "" ? AllFiltersImage : NameFilterImage}
            className="mx-auto h-36 w-36 sm:h-48 sm:w-48 object-contain"
            alt="No matching sprints"
          />
          <h5 className="mb-1 mt-7 text-18 font-medium">{t("project_sprints.no_matching_sprints")}</h5>
          <p className="text-14 text-placeholder">
            {searchQuery.trim() === ""
              ? t("project_sprints.remove_filters_to_see_all_sprints")
              : t("project_sprints.remove_search_criteria_to_see_all_sprints")}
          </p>
        </div>
      </div>
    );

  return (
    <SprintsList
      completedSprintIds={filteredCompletedSprintIds ?? []}
      upcomingSprintIds={filteredUpcomingSprintIds}
      sprintIds={filteredSprintIds}
      workspaceSlug={workspaceSlug}
      projectId={projectId}
    />
  );
}
