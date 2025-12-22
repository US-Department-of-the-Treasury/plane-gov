import React from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
// plane imports
import { ISSUE_DISPLAY_FILTERS_BY_PAGE } from "@plane/constants";
import { EIssuesStoreType } from "@plane/types";
// components
import { ProjectLevelWorkItemFiltersHOC } from "@/components/work-item-filters/filters-hoc/project-level";
// hooks
import { WorkItemFiltersRow } from "@/components/work-item-filters/filters-row";
import { useIssues } from "@/hooks/store/use-issues";
import { IssuesStoreContext } from "@/hooks/use-issue-layout-store";
import { queryKeys } from "@/store/queries/query-keys";
// local imports
import { IssuePeekOverview } from "../../peek-overview";
import { ArchivedIssueListLayout } from "../list/roots/archived-issue-root";

export function ArchivedIssueLayoutRoot() {
  // router
  const { workspaceSlug: routerWorkspaceSlug, projectId: routerProjectId } = useParams();
  const workspaceSlug = routerWorkspaceSlug ? routerWorkspaceSlug.toString() : undefined;
  const projectId = routerProjectId ? routerProjectId.toString() : undefined;
  // hooks
  const { issuesFilter } = useIssues(EIssuesStoreType.ARCHIVED);
  // derived values
  const workItemFilters = projectId ? issuesFilter?.getIssueFilters(projectId) : undefined;

  useQuery({
    queryKey: workspaceSlug && projectId ? ["archived-issues", workspaceSlug, projectId] : [],
    queryFn: async () => {
      if (workspaceSlug && projectId) {
        await issuesFilter?.fetchFilters(workspaceSlug.toString(), projectId.toString());
      }
      return null;
    },
    enabled: !!(workspaceSlug && projectId),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  if (!workspaceSlug || !projectId || !workItemFilters) return <></>;
  return (
    <IssuesStoreContext.Provider value={EIssuesStoreType.ARCHIVED}>
      <ProjectLevelWorkItemFiltersHOC
        entityType={EIssuesStoreType.ARCHIVED}
        entityId={projectId?.toString()}
        filtersToShowByLayout={ISSUE_DISPLAY_FILTERS_BY_PAGE.archived_issues.filters}
        initialWorkItemFilters={workItemFilters}
        updateFilters={issuesFilter?.updateFilterExpression.bind(issuesFilter, workspaceSlug, projectId)}
        projectId={projectId}
        workspaceSlug={workspaceSlug}
      >
        {({ filter: archivedWorkItemsFilter }) => (
          <>
            {archivedWorkItemsFilter && <WorkItemFiltersRow filter={archivedWorkItemsFilter} />}
            <div className="relative h-full w-full overflow-auto">
              <ArchivedIssueListLayout />
            </div>
            <IssuePeekOverview />
          </>
        )}
      </ProjectLevelWorkItemFiltersHOC>
    </IssuesStoreContext.Provider>
  );
}
