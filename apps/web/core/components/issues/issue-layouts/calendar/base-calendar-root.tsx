import type { FC } from "react";
import { useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
// plane imports
import { EIssueGroupByToServerOptions, EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { TGroupedIssues } from "@plane/types";
import { EIssuesStoreType } from "@plane/types";
// hooks
import { useCalendarView } from "@/hooks/store/use-calendar-view";
import { useIssues } from "@/hooks/store/use-issues";
import {
  useEpicIssueFilters,
  useGroupedIssueIds,
  useIssuePaginationData,
  useIssueViewFlags,
  useProjectIssueFilters,
  useProjectViewIssueFilters,
  useSprintIssueFilters,
} from "@/hooks/store/use-issue-store-reactive";
import { useUserPermissions } from "@/hooks/store/user";
import { useIssueStoreType } from "@/hooks/use-issue-layout-store";
import { useIssuesActions } from "@/hooks/use-issues-actions";
// types
import type { IQuickActionProps } from "../list/list-view-types";
import { CalendarChart } from "./calendar";
import { handleDragDrop } from "./utils";

export type CalendarStoreType =
  | EIssuesStoreType.PROJECT
  | EIssuesStoreType.EPIC
  | EIssuesStoreType.SPRINT
  | EIssuesStoreType.PROJECT_VIEW
  | EIssuesStoreType.TEAM
  | EIssuesStoreType.TEAM_VIEW
   ;

interface IBaseCalendarRoot {
  QuickActions: FC<IQuickActionProps>;
  addIssuesToView?: (issueIds: string[]) => Promise<any>;
  isCompletedSprint?: boolean;
  viewId?: string | undefined;
  isEpic?: boolean;
  canEditPropertiesBasedOnProject?: (projectId: string) => boolean;
}

export function BaseCalendarRoot(props: IBaseCalendarRoot) {
  const {
    QuickActions,
    addIssuesToView,
    isCompletedSprint = false,
    viewId,
    isEpic = false,
    canEditPropertiesBasedOnProject,
  } = props;

  // router
  const { workspaceSlug, projectId } = useParams();

  // hooks
  const fallbackStoreType = useIssueStoreType() as CalendarStoreType;
  const storeType = isEpic ? EIssuesStoreType.EPIC : fallbackStoreType;
  const { allowPermissions } = useUserPermissions();
  const { issues, issuesFilter, issueMap } = useIssues(storeType);
  const {
    fetchIssues,
    fetchNextIssues,
    quickAddIssue,
    updateIssue,
    removeIssue,
    removeIssueFromView,
    archiveIssue,
    restoreIssue,
    updateFilters,
  } = useIssuesActions(storeType);

  const issueCalendarView = useCalendarView();

  // Initialize calendar data on mount
  useEffect(() => {
    issueCalendarView.initCalendar();
  }, []);

  // Use reactive hooks for all supported store types
  const projectFilters = useProjectIssueFilters();
  const sprintFilters = useSprintIssueFilters();
  const epicFilters = useEpicIssueFilters();
  const projectViewFilters = useProjectViewIssueFilters();

  const isEditingAllowed = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.PROJECT,
    workspaceSlug?.toString(),
    projectId?.toString()
  );

  // Use reactive hook for view flags
  const viewFlags = useIssueViewFlags(storeType);
  const { enableInlineEditing } = viewFlags;

  // Use reactive filters for all store types to ensure proper re-renders when filters load
  const displayFilters =
    storeType === EIssuesStoreType.PROJECT
      ? projectFilters?.displayFilters
      : storeType === EIssuesStoreType.SPRINT
        ? sprintFilters?.displayFilters
        : storeType === EIssuesStoreType.EPIC
          ? epicFilters?.displayFilters
          : storeType === EIssuesStoreType.PROJECT_VIEW
            ? projectViewFilters?.displayFilters
            : undefined;

  // Use reactive hook to get grouped issue IDs - ensures re-render when issues load
  const groupedIssueIds = useGroupedIssueIds(storeType) as TGroupedIssues;

  const layout = displayFilters?.calendar?.layout ?? "month";
  const { startDate, endDate } = issueCalendarView.getStartAndEndDate(layout) ?? {};

  useEffect(() => {
    if (startDate && endDate && layout) {
      fetchIssues(
        "init-loader",
        {
          canGroup: true,
          perPageCount: layout === "month" ? 4 : 30,
          before: endDate,
          after: startDate,
          groupedBy: EIssueGroupByToServerOptions["target_date"],
        },
        viewId
      );
    }
  }, [fetchIssues, storeType, startDate, endDate, layout, viewId]);

  const handleDragAndDrop = async (
    issueId: string | undefined,
    issueProjectId: string | undefined,
    sourceDate: string | undefined,
    destinationDate: string | undefined
  ) => {
    if (!issueId || !destinationDate || !sourceDate || !issueProjectId) return;

    await handleDragDrop(
      issueId,
      sourceDate,
      destinationDate,
      workspaceSlug?.toString(),
      issueProjectId,
      updateIssue
    ).catch((err) => {
      setToast({
        title: "Error!",
        type: TOAST_TYPE.ERROR,
        message: err?.detail ?? "Failed to perform this action",
      });
    });
  };

  const loadMoreIssues = useCallback(
    (dateString: string) => {
      fetchNextIssues(dateString);
    },
    [fetchNextIssues]
  );

  const getPaginationData = useCallback(
    (groupId: string | undefined) => issues?.getPaginationData(groupId, undefined),
    [issues?.getPaginationData]
  );

  const canEditProperties = useCallback(
    (projectId: string | undefined) => {
      const isEditingAllowedBasedOnProject =
        canEditPropertiesBasedOnProject && projectId ? canEditPropertiesBasedOnProject(projectId) : isEditingAllowed;

      return enableInlineEditing && isEditingAllowedBasedOnProject;
    },
    [canEditPropertiesBasedOnProject, enableInlineEditing, isEditingAllowed]
  );

  return (
    <>
      <div className="h-full w-full overflow-hidden bg-surface-1 pt-4">
        <CalendarChart
          issuesFilterStore={issuesFilter}
          issues={issueMap}
          groupedIssueIds={groupedIssueIds}
          layout={displayFilters?.calendar?.layout}
          showWeekends={displayFilters?.calendar?.show_weekends ?? false}
          issueCalendarView={issueCalendarView}
          quickActions={({ issue, parentRef, customActionButton, placement }) => (
            <QuickActions
              parentRef={parentRef}
              customActionButton={customActionButton}
              issue={issue}
              handleDelete={async () => removeIssue(issue.project_id, issue.id)}
              handleUpdate={async (data) => updateIssue && updateIssue(issue.project_id, issue.id, data)}
              handleRemoveFromView={async () => removeIssueFromView && removeIssueFromView(issue.project_id, issue.id)}
              handleArchive={async () => archiveIssue && archiveIssue(issue.project_id, issue.id)}
              handleRestore={async () => restoreIssue && restoreIssue(issue.project_id, issue.id)}
              readOnly={!canEditProperties(issue.project_id ?? undefined) || isCompletedSprint}
              placements={placement}
            />
          )}
          loadMoreIssues={loadMoreIssues}
          getPaginationData={getPaginationData}
          addIssuesToView={addIssuesToView}
          quickAddCallback={quickAddIssue}
          readOnly={isCompletedSprint}
          updateFilters={updateFilters}
          handleDragAndDrop={handleDragAndDrop}
          canEditProperties={canEditProperties}
          isEpic={isEpic}
        />
      </div>
    </>
  );
}
