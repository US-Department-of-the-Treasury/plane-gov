import React, { useState } from "react";
import { isEmpty } from "lodash-es";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import useSWR from "swr";
// plane constants
import { ISSUE_DISPLAY_FILTERS_BY_PAGE, PROJECT_VIEW_TRACKER_ELEMENTS } from "@plane/constants";
import { EIssuesStoreType, EIssueLayoutTypes } from "@plane/types";
// components
import { TransferIssues } from "@/components/sprints/transfer-issues";
import { TransferIssuesModal } from "@/components/sprints/transfer-issues-modal";
// hooks
import { ProjectLevelWorkItemFiltersHOC } from "@/components/work-item-filters/filters-hoc/project-level";
import { WorkItemFiltersRow } from "@/components/work-item-filters/filters-row";
import { useProjectSprints, getSprintById } from "@/store/queries/sprint";
import { useIssues } from "@/hooks/store/use-issues";
import { IssuesStoreContext } from "@/hooks/use-issue-layout-store";
// local imports
import { IssuePeekOverview } from "../../peek-overview";
import { SprintCalendarLayout } from "../calendar/roots/sprint-root";
import { BaseGanttRoot } from "../gantt";
import { SprintKanBanLayout } from "../kanban/roots/sprint-root";
import { SprintListLayout } from "../list/roots/sprint-root";
import { SprintSpreadsheetLayout } from "../spreadsheet/roots/sprint-root";

function SprintIssueLayout(props: {
  activeLayout: EIssueLayoutTypes | undefined;
  sprintId: string;
  isCompletedSprint: boolean;
}) {
  switch (props.activeLayout) {
    case EIssueLayoutTypes.LIST:
      return <SprintListLayout />;
    case EIssueLayoutTypes.KANBAN:
      return <SprintKanBanLayout />;
    case EIssueLayoutTypes.CALENDAR:
      return <SprintCalendarLayout />;
    case EIssueLayoutTypes.GANTT:
      return <BaseGanttRoot viewId={props.sprintId} isCompletedSprint={props.isCompletedSprint} />;
    case EIssueLayoutTypes.SPREADSHEET:
      return <SprintSpreadsheetLayout />;
    default:
      return null;
  }
}

export const SprintLayoutRoot = observer(function SprintLayoutRoot() {
  const { workspaceSlug: routerWorkspaceSlug, projectId: routerProjectId, sprintId: routerSprintId } = useParams();
  const workspaceSlug = routerWorkspaceSlug ? routerWorkspaceSlug.toString() : undefined;
  const projectId = routerProjectId ? routerProjectId.toString() : undefined;
  const sprintId = routerSprintId ? routerSprintId.toString() : undefined;
  // store hooks
  const { issuesFilter } = useIssues(EIssuesStoreType.SPRINT);
  const { data: sprints } = useProjectSprints(workspaceSlug ?? "", projectId ?? "");
  // state
  const [transferIssuesModal, setTransferIssuesModal] = useState(false);
  // derived values
  const workItemFilters = sprintId ? issuesFilter?.getIssueFilters(sprintId) : undefined;
  const activeLayout = workItemFilters?.displayFilters?.layout;

  useSWR(
    workspaceSlug && projectId && sprintId ? `SPRINT_ISSUES_${workspaceSlug}_${projectId}_${sprintId}` : null,
    async () => {
      if (workspaceSlug && projectId && sprintId) {
        await issuesFilter?.fetchFilters(workspaceSlug, projectId, sprintId);
      }
    },
    { revalidateIfStale: false, revalidateOnFocus: false }
  );

  const sprintDetails = getSprintById(sprints, sprintId);
  const sprintStatus = sprintDetails?.status?.toLocaleLowerCase() ?? "draft";
  const isCompletedSprint = sprintStatus === "completed";
  const isProgressSnapshotEmpty = isEmpty(sprintDetails?.progress_snapshot);
  const transferableIssuesCount = sprintDetails
    ? sprintDetails.backlog_issues + sprintDetails.unstarted_issues + sprintDetails.started_issues
    : 0;
  const canTransferIssues = isProgressSnapshotEmpty && transferableIssuesCount > 0;

  if (!workspaceSlug || !projectId || !sprintId || !workItemFilters) return <></>;
  return (
    <IssuesStoreContext.Provider value={EIssuesStoreType.SPRINT}>
      <ProjectLevelWorkItemFiltersHOC
        enableSaveView
        entityType={EIssuesStoreType.SPRINT}
        entityId={sprintId}
        filtersToShowByLayout={ISSUE_DISPLAY_FILTERS_BY_PAGE.issues.filters}
        initialWorkItemFilters={workItemFilters}
        updateFilters={issuesFilter?.updateFilterExpression.bind(issuesFilter, workspaceSlug, projectId, sprintId)}
        projectId={projectId}
        workspaceSlug={workspaceSlug}
      >
        {({ filter: sprintWorkItemsFilter }) => (
          <>
            <TransferIssuesModal
              handleClose={() => setTransferIssuesModal(false)}
              sprintId={sprintId}
              isOpen={transferIssuesModal}
            />
            <div className="relative flex h-full w-full flex-col overflow-hidden">
              {sprintStatus === "completed" && (
                <TransferIssues
                  handleClick={() => setTransferIssuesModal(true)}
                  canTransferIssues={canTransferIssues}
                  disabled={!isEmpty(sprintDetails?.progress_snapshot)}
                />
              )}
              {sprintWorkItemsFilter && (
                <WorkItemFiltersRow
                  filter={sprintWorkItemsFilter}
                  trackerElements={{
                    saveView: PROJECT_VIEW_TRACKER_ELEMENTS.SPRINT_HEADER_SAVE_AS_VIEW_BUTTON,
                  }}
                />
              )}
              <div className="h-full w-full overflow-auto">
                <SprintIssueLayout activeLayout={activeLayout} sprintId={sprintId} isCompletedSprint={isCompletedSprint} />
              </div>
              {/* peek overview */}
              <IssuePeekOverview />
            </div>
          </>
        )}
      </ProjectLevelWorkItemFiltersHOC>
    </IssuesStoreContext.Provider>
  );
});
