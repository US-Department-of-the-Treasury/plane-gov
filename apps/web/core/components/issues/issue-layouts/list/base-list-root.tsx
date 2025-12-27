import type { FC } from "react";
import { useCallback } from "react";
import { useParams } from "next/navigation";
// plane constants
import { EIssueFilterType, EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
// types
import type { GroupByColumnTypes, TGroupedIssues, TIssue, TIssueKanbanFilters } from "@plane/types";
import { EIssueLayoutTypes, EIssuesStoreType } from "@plane/types";
// constants
// hooks
import { useIssues } from "@/hooks/store/use-issues";
import { useGroupedIssueIds, useProjectIssueFilters, useSprintIssueFilters } from "@/hooks/store/use-issue-store-reactive";
import { useUserPermissions } from "@/hooks/store/user";
// hooks
import { useGroupIssuesDragNDrop } from "@/hooks/use-group-dragndrop";
import { useIssueStoreType } from "@/hooks/use-issue-layout-store";
import { useIssuesActions } from "@/hooks/use-issues-actions";
// TanStack Query hooks for data fetching
import { useIssuesQuery } from "@/hooks/use-issues-query";
// components
import { IssueLayoutHOC } from "../issue-layout-HOC";
import { List } from "./default";
// types
import type { IQuickActionProps, TRenderQuickActions } from "./list-view-types";

type ListStoreType =
  | EIssuesStoreType.PROJECT
  | EIssuesStoreType.EPIC
  | EIssuesStoreType.SPRINT
  | EIssuesStoreType.PROJECT_VIEW
  | EIssuesStoreType.PROFILE
  | EIssuesStoreType.ARCHIVED
  | EIssuesStoreType.WORKSPACE_DRAFT
  | EIssuesStoreType.TEAM
  | EIssuesStoreType.TEAM_VIEW
   ;

interface IBaseListRoot {
  QuickActions: FC<IQuickActionProps>;
  addIssuesToView?: (issueIds: string[]) => Promise<TIssue>;
  canEditPropertiesBasedOnProject?: (projectId: string) => boolean;
  viewId?: string | undefined;
  isCompletedSprint?: boolean;
  isEpic?: boolean;
}
export function BaseListRoot(props: IBaseListRoot) {
  const {
    QuickActions,
    viewId: _viewId,
    addIssuesToView,
    canEditPropertiesBasedOnProject,
    isCompletedSprint = false,
    isEpic = false,
  } = props;
  // router
  const storeType = useIssueStoreType() as ListStoreType;
  //stores
  const { issuesFilter, issues } = useIssues(storeType);

  // TanStack Query for data fetching - auto-fetches when enabled
  // Issues are synced to Zustand store inside the query hook
  useIssuesQuery(storeType);

  const {
    fetchNextIssues,
    quickAddIssue,
    updateIssue,
    removeIssue,
    removeIssueFromView,
    archiveIssue,
    restoreIssue,
  } = useIssuesActions(storeType);
  // mobx store
  const { allowPermissions } = useUserPermissions();
  const { issueMap } = useIssues();

  // Use reactive hooks for PROJECT and SPRINT store types, fall back to non-reactive for others
  const projectFilters = useProjectIssueFilters();
  const sprintFilters = useSprintIssueFilters();

  // Use reactive filters for PROJECT and SPRINT store types to ensure proper re-renders when filters load
  const displayFilters =
    storeType === EIssuesStoreType.PROJECT
      ? projectFilters?.displayFilters
      : storeType === EIssuesStoreType.SPRINT
        ? sprintFilters?.displayFilters
        : issuesFilter?.issueFilters?.displayFilters;
  const displayProperties =
    storeType === EIssuesStoreType.PROJECT
      ? projectFilters?.displayProperties
      : storeType === EIssuesStoreType.SPRINT
        ? sprintFilters?.displayProperties
        : issuesFilter?.issueFilters?.displayProperties;
  const orderBy = displayFilters?.order_by || undefined;

  const group_by = (displayFilters?.group_by || null) as GroupByColumnTypes | null;
  const showEmptyGroup = displayFilters?.show_empty_groups ?? false;

  const { workspaceSlug, projectId } = useParams();
  const { updateFilters } = useIssuesActions(storeType);
  const collapsedGroups =
    issuesFilter?.issueFilters?.kanbanFilters || ({ group_by: [], sub_group_by: [] } as TIssueKanbanFilters);

  // Note: No useEffect needed for initial fetch - TanStack Query auto-fetches

  // Use reactive hook to get grouped issue IDs - ensures re-render when issues load
  const groupedIssueIds = useGroupedIssueIds(storeType) as TGroupedIssues | undefined;
  // auth
  const isEditingAllowed = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.PROJECT,
    workspaceSlug?.toString(),
    projectId?.toString()
  );
  const { enableInlineEditing, enableQuickAdd, enableIssueCreation } = issues?.viewFlags || {};

  const canEditProperties = useCallback(
    (projectId: string | undefined) => {
      const isEditingAllowedBasedOnProject =
        canEditPropertiesBasedOnProject && projectId ? canEditPropertiesBasedOnProject(projectId) : isEditingAllowed;

      return !!enableInlineEditing && isEditingAllowedBasedOnProject;
    },
    [canEditPropertiesBasedOnProject, enableInlineEditing, isEditingAllowed]
  );

  const handleOnDrop = useGroupIssuesDragNDrop(storeType, orderBy, group_by);

  const renderQuickActions: TRenderQuickActions = useCallback(
    ({ issue, parentRef }) => (
      <QuickActions
        parentRef={parentRef}
        issue={issue}
        handleDelete={async () => removeIssue(issue.project_id, issue.id)}
        handleUpdate={async (data) => updateIssue && updateIssue(issue.project_id, issue.id, data)}
        handleRemoveFromView={async () => removeIssueFromView && removeIssueFromView(issue.project_id, issue.id)}
        handleArchive={async () => archiveIssue && archiveIssue(issue.project_id, issue.id)}
        handleRestore={async () => restoreIssue && restoreIssue(issue.project_id, issue.id)}
        readOnly={!canEditProperties(issue.project_id ?? undefined) || isCompletedSprint}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isCompletedSprint, canEditProperties, removeIssue, updateIssue, removeIssueFromView, archiveIssue, restoreIssue]
  );

  const loadMoreIssues = useCallback(
    (groupId?: string) => {
      void fetchNextIssues(groupId);
    },
    [fetchNextIssues]
  );

  // kanbanFilters and EIssueFilterType.KANBAN_FILTERS are used because the state is shared between kanban view and list view
  const handleCollapsedGroups = useCallback(
    (value: string) => {
      if (workspaceSlug) {
        let collapsedGroups = issuesFilter?.issueFilters?.kanbanFilters?.group_by || [];
        if (collapsedGroups.includes(value)) {
          collapsedGroups = collapsedGroups.filter((_value) => _value != value);
        } else {
          collapsedGroups.push(value);
        }
        void updateFilters(projectId?.toString() ?? "", EIssueFilterType.KANBAN_FILTERS, {
          group_by: collapsedGroups,
        } as TIssueKanbanFilters);
      }
    },
    [workspaceSlug, issuesFilter, projectId, updateFilters]
  );

  return (
    <IssueLayoutHOC layout={EIssueLayoutTypes.LIST}>
      <div className={`relative size-full bg-surface-2`}>
        <List
          issuesMap={issueMap}
          displayProperties={displayProperties}
          group_by={group_by}
          orderBy={orderBy}
          updateIssue={updateIssue}
          quickActions={renderQuickActions}
          groupedIssueIds={groupedIssueIds ?? {}}
          loadMoreIssues={loadMoreIssues}
          showEmptyGroup={showEmptyGroup}
          quickAddCallback={quickAddIssue}
          enableIssueQuickAdd={!!enableQuickAdd}
          canEditProperties={canEditProperties}
          disableIssueCreation={!enableIssueCreation || !isEditingAllowed}
          addIssuesToView={addIssuesToView}
          isCompletedSprint={isCompletedSprint}
          handleOnDrop={handleOnDrop}
          handleCollapsedGroups={handleCollapsedGroups}
          collapsedGroups={collapsedGroups}
          isEpic={isEpic}
        />
      </div>
    </IssueLayoutHOC>
  );
}
