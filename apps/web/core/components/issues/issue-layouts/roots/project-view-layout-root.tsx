import React, { useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
// plane constants
import { ISSUE_DISPLAY_FILTERS_BY_PAGE, PROJECT_VIEW_TRACKER_ELEMENTS } from "@plane/constants";
import { EIssuesStoreType, EIssueLayoutTypes } from "@plane/types";
// hooks
import { ProjectLevelWorkItemFiltersHOC } from "@/components/work-item-filters/filters-hoc/project-level";
import { WorkItemFiltersRow } from "@/components/work-item-filters/filters-row";
import { useIssues } from "@/hooks/store/use-issues";
import { useProjectView } from "@/hooks/store/use-project-view";
import { IssuesStoreContext } from "@/hooks/use-issue-layout-store";
import { queryKeys } from "@/store/queries/query-keys";
// local imports
import { IssuePeekOverview } from "../../peek-overview";
import { ProjectViewCalendarLayout } from "../calendar/roots/project-view-root";
import { BaseGanttRoot } from "../gantt";
import { ProjectViewKanBanLayout } from "../kanban/roots/project-view-root";
import { ProjectViewListLayout } from "../list/roots/project-view-root";
import { ProjectViewSpreadsheetLayout } from "../spreadsheet/roots/project-view-root";

function ProjectViewIssueLayout(props: { activeLayout: EIssueLayoutTypes | undefined; viewId: string }) {
  switch (props.activeLayout) {
    case EIssueLayoutTypes.LIST:
      return <ProjectViewListLayout />;
    case EIssueLayoutTypes.KANBAN:
      return <ProjectViewKanBanLayout />;
    case EIssueLayoutTypes.CALENDAR:
      return <ProjectViewCalendarLayout />;
    case EIssueLayoutTypes.GANTT:
      return <BaseGanttRoot viewId={props.viewId} />;
    case EIssueLayoutTypes.SPREADSHEET:
      return <ProjectViewSpreadsheetLayout />;
    default:
      return null;
  }
}

export function ProjectViewLayoutRoot() {
  // router
  const { workspaceSlug: routerWorkspaceSlug, projectId: routerProjectId, viewId: routerViewId } = useParams();
  const workspaceSlug = routerWorkspaceSlug ? routerWorkspaceSlug?.toString() : undefined;
  const projectId = routerProjectId ? routerProjectId?.toString() : undefined;
  const viewId = routerViewId ? routerViewId?.toString() : undefined;
  // hooks
  const { issuesFilter } = useIssues(EIssuesStoreType.PROJECT_VIEW);
  const { getViewById } = useProjectView();
  // derived values
  const projectView = viewId ? getViewById(viewId) : undefined;
  const workItemFilters = viewId ? issuesFilter?.getIssueFilters(viewId) : undefined;
  const activeLayout = workItemFilters?.displayFilters?.layout;
  const initialWorkItemFilters = projectView
    ? {
        displayFilters: workItemFilters?.displayFilters,
        displayProperties: workItemFilters?.displayProperties,
        kanbanFilters: workItemFilters?.kanbanFilters,
        richFilters: projectView.rich_filters,
      }
    : undefined;

  useQuery({
    queryKey: workspaceSlug && projectId && viewId ? queryKeys.views.detail(viewId) : [],
    queryFn: async () => {
      if (workspaceSlug && projectId && viewId) {
        await issuesFilter?.fetchFilters(workspaceSlug, projectId, viewId);
      }
      return null;
    },
    enabled: !!(workspaceSlug && projectId && viewId),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  useEffect(
    () => () => {
      if (workspaceSlug && viewId) {
        issuesFilter?.resetFilters(workspaceSlug, viewId);
      }
    },
    [issuesFilter, workspaceSlug, viewId]
  );

  if (!workspaceSlug || !projectId || !viewId || !workItemFilters) return <></>;
  return (
    <IssuesStoreContext.Provider value={EIssuesStoreType.PROJECT_VIEW}>
      <ProjectLevelWorkItemFiltersHOC
        enableSaveView
        saveViewOptions={{
          label: "Save as",
        }}
        enableUpdateView
        entityId={viewId}
        entityType={EIssuesStoreType.PROJECT_VIEW}
        filtersToShowByLayout={ISSUE_DISPLAY_FILTERS_BY_PAGE.issues.filters}
        initialWorkItemFilters={initialWorkItemFilters}
        updateFilters={issuesFilter?.updateFilterExpression.bind(issuesFilter, workspaceSlug, projectId, viewId)}
        projectId={projectId}
        workspaceSlug={workspaceSlug}
      >
        {({ filter: projectViewWorkItemsFilter }) => (
          <div className="relative flex h-full w-full flex-col overflow-hidden">
            {projectViewWorkItemsFilter && (
              <WorkItemFiltersRow
                filter={projectViewWorkItemsFilter}
                trackerElements={{
                  saveView: PROJECT_VIEW_TRACKER_ELEMENTS.HEADER_SAVE_VIEW_BUTTON,
                }}
              />
            )}
            <div className="relative h-full w-full overflow-auto">
              <ProjectViewIssueLayout activeLayout={activeLayout} viewId={viewId.toString()} />
            </div>
            {/* peek overview */}
            <IssuePeekOverview />
          </div>
        )}
      </ProjectLevelWorkItemFiltersHOC>
    </IssuesStoreContext.Provider>
  );
}
