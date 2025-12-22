import React from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
// plane imports
import { ISSUE_DISPLAY_FILTERS_BY_PAGE, PROJECT_VIEW_TRACKER_ELEMENTS } from "@plane/constants";
import { EIssuesStoreType, EIssueLayoutTypes } from "@plane/types";
import { Row, ERowVariant } from "@plane/ui";
// hooks
import { ProjectLevelWorkItemFiltersHOC } from "@/components/work-item-filters/filters-hoc/project-level";
import { WorkItemFiltersRow } from "@/components/work-item-filters/filters-row";
import { useIssues } from "@/hooks/store/use-issues";
import { IssuesStoreContext } from "@/hooks/use-issue-layout-store";
// local imports
import { IssuePeekOverview } from "../../peek-overview";
import { EpicCalendarLayout } from "../calendar/roots/epic-root";
import { BaseGanttRoot } from "../gantt";
import { EpicKanBanLayout } from "../kanban/roots/epic-root";
import { EpicListLayout } from "../list/roots/epic-root";
import { EpicSpreadsheetLayout } from "../spreadsheet/roots/epic-root";

function EpicIssueLayout(props: { activeLayout: EIssueLayoutTypes | undefined; epicId: string }) {
  switch (props.activeLayout) {
    case EIssueLayoutTypes.LIST:
      return <EpicListLayout />;
    case EIssueLayoutTypes.KANBAN:
      return <EpicKanBanLayout />;
    case EIssueLayoutTypes.CALENDAR:
      return <EpicCalendarLayout />;
    case EIssueLayoutTypes.GANTT:
      return <BaseGanttRoot viewId={props.epicId} />;
    case EIssueLayoutTypes.SPREADSHEET:
      return <EpicSpreadsheetLayout />;
    default:
      return null;
  }
}

export function EpicLayoutRoot() {
  // router
  const { workspaceSlug: routerWorkspaceSlug, projectId: routerProjectId, epicId: routerEpicId } = useParams();
  const workspaceSlug = routerWorkspaceSlug ? routerWorkspaceSlug.toString() : undefined;
  const projectId = routerProjectId ? routerProjectId.toString() : undefined;
  const epicId = routerEpicId ? routerEpicId.toString() : undefined;
  // hooks
  const { issuesFilter } = useIssues(EIssuesStoreType.EPIC);
  // derived values
  const workItemFilters = epicId ? issuesFilter?.getIssueFilters(epicId) : undefined;
  const activeLayout = workItemFilters?.displayFilters?.layout || undefined;

  useSWR(
    workspaceSlug && projectId && epicId
      ? `EPIC_ISSUES_${workspaceSlug.toString()}_${projectId.toString()}_${epicId.toString()}`
      : null,
    async () => {
      if (workspaceSlug && projectId && epicId) {
        await issuesFilter?.fetchFilters(workspaceSlug.toString(), projectId.toString(), epicId.toString());
      }
    },
    { revalidateIfStale: false, revalidateOnFocus: false }
  );

  if (!workspaceSlug || !projectId || !epicId || !workItemFilters) return <></>;
  return (
    <IssuesStoreContext.Provider value={EIssuesStoreType.EPIC}>
      <ProjectLevelWorkItemFiltersHOC
        enableSaveView
        entityType={EIssuesStoreType.EPIC}
        entityId={epicId}
        filtersToShowByLayout={ISSUE_DISPLAY_FILTERS_BY_PAGE.issues.filters}
        initialWorkItemFilters={workItemFilters}
        updateFilters={issuesFilter?.updateFilterExpression.bind(issuesFilter, workspaceSlug, projectId, epicId)}
        projectId={projectId}
        workspaceSlug={workspaceSlug}
      >
        {({ filter: epicWorkItemsFilter }) => (
          <div className="relative flex h-full w-full flex-col overflow-hidden">
            {epicWorkItemsFilter && (
              <WorkItemFiltersRow
                filter={epicWorkItemsFilter}
                trackerElements={{
                  saveView: PROJECT_VIEW_TRACKER_ELEMENTS.EPIC_HEADER_SAVE_AS_VIEW_BUTTON,
                }}
              />
            )}
            <Row variant={ERowVariant.HUGGING} className="h-full w-full overflow-auto">
              <EpicIssueLayout activeLayout={activeLayout} epicId={epicId} />
            </Row>
            {/* peek overview */}
            <IssuePeekOverview />
          </div>
        )}
      </ProjectLevelWorkItemFiltersHOC>
    </IssuesStoreContext.Provider>
  );
}
