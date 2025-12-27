import type { FC } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { useParams } from "next/navigation";
import { EIssueFilterType, EUserPermissions, EUserPermissionsLevel, WORK_ITEM_TRACKER_EVENTS } from "@plane/constants";
import type { TIssue } from "@plane/types";
import { EIssueServiceType, EIssueLayoutTypes, EIssuesStoreType } from "@plane/types";
//constants
//hooks
import { captureError, captureSuccess } from "@/helpers/event-tracker.helper";
import { useIssues } from "@/hooks/store/use-issues";
// stores
import { useIssueStore } from "@/store/issue/issue.store";
import { useGroupedIssueIds, useIssueViewFlags, useProjectIssueFilters, useSprintIssueFilters } from "@/hooks/store/use-issue-store-reactive";
import { useProjectStates } from "@/hooks/store/use-project-state";
import { useKanbanView } from "@/hooks/store/use-kanban-view";
import { useUserPermissions } from "@/hooks/store/user";
import { useGroupIssuesDragNDrop } from "@/hooks/use-group-dragndrop";
import { useIssueStoreType } from "@/hooks/use-issue-layout-store";
import { useIssuesActions } from "@/hooks/use-issues-actions";
// TanStack Query hooks for data fetching
import { useIssuesQuery } from "@/hooks/use-issues-query";
import { useIssue } from "@/store/queries/issue";
// store
// ui
// types
import { DeleteIssueModal } from "../../delete-issue-modal";
import { IssueLayoutHOC } from "../issue-layout-HOC";
import type { IQuickActionProps, TRenderQuickActions } from "../list/list-view-types";
//components
import { getSourceFromDropPayload } from "../utils";
import { KanBan } from "./default";
import { KanBanSwimLanes } from "./swimlanes";

export type KanbanStoreType =
  | EIssuesStoreType.PROJECT
  | EIssuesStoreType.EPIC
  | EIssuesStoreType.SPRINT
  | EIssuesStoreType.PROJECT_VIEW
  | EIssuesStoreType.PROFILE
  | EIssuesStoreType.TEAM
  | EIssuesStoreType.TEAM_VIEW
   ;

export interface IBaseKanBanLayout {
  QuickActions: FC<IQuickActionProps>;
  addIssuesToView?: (issueIds: string[]) => Promise<TIssue>;
  canEditPropertiesBasedOnProject?: (projectId: string) => boolean;
  isCompletedSprint?: boolean;
  viewId?: string | undefined;
  isEpic?: boolean;
}

export function BaseKanBanRoot(props: IBaseKanBanLayout) {
  const {
    QuickActions,
    addIssuesToView,
    canEditPropertiesBasedOnProject,
    isCompletedSprint = false,
    viewId: _viewId,
    isEpic = false,
  } = props;
  // router
  const { workspaceSlug, projectId } = useParams();

  // Sync project states to Zustand store for getGroupByColumns to work
  // This ensures the Kanban groups render properly when grouped by state
  useProjectStates(workspaceSlug?.toString(), projectId?.toString());

  // store hooks
  const storeType = useIssueStoreType() as KanbanStoreType;
  const { allowPermissions } = useUserPermissions();
  const { issueMap, issuesFilter, issues } = useIssues(storeType);
  // Zustand store
  const getIssueById = useIssueStore((s) => s.getIssueById);

  // states - declare before use in hooks below
  const [draggedIssueId, setDraggedIssueId] = useState<string | undefined>(undefined);
  const [deleteIssueModal, setDeleteIssueModal] = useState(false);

  // Try TanStack Query for draggedIssue (fallback to MobX if not available)
  const draggedIssueFromMobX = getIssueById(draggedIssueId ?? "");
  const { data: draggedIssueFromQuery } = useIssue(
    workspaceSlug?.toString() ?? "",
    projectId?.toString() ?? draggedIssueFromMobX?.project_id ?? "",
    draggedIssueId ?? ""
  );
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
    updateFilters,
  } = useIssuesActions(storeType);

  const deleteAreaRef = useRef<HTMLDivElement | null>(null);
  const [isDragOverDelete, setIsDragOverDelete] = useState(false);

  const { isDragging } = useKanbanView();

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

  const sub_group_by = displayFilters?.sub_group_by;
  const group_by = displayFilters?.group_by;

  const orderBy = displayFilters?.order_by;

  // Note: No useEffect needed for initial fetch - TanStack Query auto-fetches

  const fetchMoreIssues = useCallback(
    (groupId?: string, subgroupId?: string) => {
      if (issues?.getIssueLoader(groupId, subgroupId) !== "pagination") {
        void fetchNextIssues(groupId, subgroupId);
      }
    },
    [fetchNextIssues, issues]
  );

  // Use reactive hook to get grouped issue IDs - ensures re-render when issues load
  const rawGroupedIssueIds = useGroupedIssueIds(storeType);
  // For Kanban, ensure we have grouped data (not ungrouped array)
  // Kanban views should always have grouped data, but TypeScript needs the assertion
  const groupedIssueIds = Array.isArray(rawGroupedIssueIds) ? {} : rawGroupedIssueIds;

  const userDisplayFilters = displayFilters || null;

  const KanBanView = sub_group_by ? KanBanSwimLanes : KanBan;

  // Use reactive hook for view flags
  const viewFlags = useIssueViewFlags(storeType);
  const { enableInlineEditing, enableQuickAdd, enableIssueCreation } = viewFlags;

  const scrollableContainerRef = useRef<HTMLDivElement | null>(null);

  const isEditingAllowed = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.PROJECT,
    workspaceSlug?.toString(),
    projectId?.toString()
  );

  const handleOnDrop = useGroupIssuesDragNDrop(storeType, orderBy, group_by, sub_group_by);

  const canEditProperties = useCallback(
    (projectId: string | undefined) => {
      const isEditingAllowedBasedOnProject =
        canEditPropertiesBasedOnProject && projectId ? canEditPropertiesBasedOnProject(projectId) : isEditingAllowed;

      return enableInlineEditing && isEditingAllowedBasedOnProject;
    },
    [canEditPropertiesBasedOnProject, enableInlineEditing, isEditingAllowed]
  );

  // Enable Auto Scroll for Main Kanban
  useEffect(() => {
    const element = scrollableContainerRef.current;

    if (!element) return;

    return combine(
      autoScrollForElements({
        element,
      })
    );
  }, []);

  // Make the Issue Delete Box a Drop Target
  useEffect(() => {
    const element = deleteAreaRef.current;

    if (!element) return;

    return combine(
      dropTargetForElements({
        element,
        getData: () => ({ columnId: "issue-trash-box", groupId: "issue-trash-box", type: "DELETE" }),
        onDragEnter: () => {
          setIsDragOverDelete(true);
        },
        onDragLeave: () => {
          setIsDragOverDelete(false);
        },
        onDrop: (payload) => {
          setIsDragOverDelete(false);
          const source = getSourceFromDropPayload(payload);

          if (!source) return;

          setDraggedIssueId(source.id);
          setDeleteIssueModal(true);
        },
      })
    );
  }, [setIsDragOverDelete, setDraggedIssueId, setDeleteIssueModal]);

  const renderQuickActions: TRenderQuickActions = useCallback(
    ({ issue, parentRef, customActionButton }) => (
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
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isCompletedSprint, canEditProperties, removeIssue, updateIssue, removeIssueFromView, archiveIssue, restoreIssue]
  );

  const handleDeleteIssue = async () => {
    const draggedIssue = draggedIssueFromQuery ?? draggedIssueFromMobX;

    if (!draggedIssueId || !draggedIssue) return;

    await removeIssue(draggedIssue.project_id, draggedIssueId)
      .then(() => {
        captureSuccess({
          eventName: WORK_ITEM_TRACKER_EVENTS.delete,
          payload: { id: draggedIssueId },
        });
        return undefined;
      })
      .catch(() => {
        captureError({
          eventName: WORK_ITEM_TRACKER_EVENTS.delete,
          payload: { id: draggedIssueId },
        });
      })
      .finally(() => {
        setDeleteIssueModal(false);
        setDraggedIssueId(undefined);
      });
  };

  const handleCollapsedGroups = useCallback(
    (toggle: "group_by" | "sub_group_by", value: string) => {
      if (workspaceSlug) {
        let collapsedGroups = issuesFilter?.issueFilters?.kanbanFilters?.[toggle] || [];
        if (collapsedGroups.includes(value)) {
          collapsedGroups = collapsedGroups.filter((_value) => _value != value);
        } else {
          collapsedGroups.push(value);
        }
        void updateFilters(projectId?.toString() ?? "", EIssueFilterType.KANBAN_FILTERS, {
          [toggle]: collapsedGroups,
        });
      }
    },
    [workspaceSlug, issuesFilter, projectId, updateFilters]
  );

  const collapsedGroups = issuesFilter?.issueFilters?.kanbanFilters || { group_by: [], sub_group_by: [] };

  return (
    <>
      <DeleteIssueModal
        dataId={draggedIssueId}
        isOpen={deleteIssueModal}
        handleClose={() => setDeleteIssueModal(false)}
        onSubmit={handleDeleteIssue}
        isEpic={isEpic}
      />
      {/* drag and delete component */}
      <div
        className={`fixed left-1/2 -translate-x-1/2 ${
          isDragging ? "z-40" : ""
        } top-3 mx-3 flex w-72 items-center justify-center`}
        ref={deleteAreaRef}
      >
        <div
          className={`${
            isDragging ? `opacity-100` : `opacity-0`
          } flex w-full items-center justify-center rounded-sm border-2 border-red-500/20 bg-surface-1 px-3 py-5 text-11 font-medium italic text-red-500 ${
            isDragOverDelete ? "bg-red-500 opacity-70 blur-2xl" : ""
          } transition duration-300`}
        >
          Drop here to delete the work item.
        </div>
      </div>
      <IssueLayoutHOC layout={EIssueLayoutTypes.KANBAN}>
        <div
          className={`horizontal-scrollbar scrollbar-lg relative flex h-full w-full bg-surface-2 ${sub_group_by ? "vertical-scrollbar overflow-y-auto" : "overflow-x-auto overflow-y-hidden"}`}
          ref={scrollableContainerRef}
        >
          <div className="relative h-full w-max min-w-full bg-surface-2">
            <div className="h-full w-max">
              <KanBanView
                issuesMap={issueMap}
                groupedIssueIds={groupedIssueIds ?? {}}
                getGroupIssueCount={issues.getGroupIssueCount}
                displayProperties={displayProperties}
                sub_group_by={sub_group_by}
                group_by={group_by}
                orderBy={orderBy}
                updateIssue={updateIssue}
                quickActions={renderQuickActions}
                handleCollapsedGroups={handleCollapsedGroups}
                collapsedGroups={collapsedGroups}
                enableQuickIssueCreate={enableQuickAdd}
                showEmptyGroup={userDisplayFilters?.show_empty_groups ?? true}
                quickAddCallback={quickAddIssue}
                disableIssueCreation={!enableIssueCreation || !isEditingAllowed || isCompletedSprint}
                canEditProperties={canEditProperties}
                addIssuesToView={addIssuesToView}
                scrollableContainerRef={scrollableContainerRef}
                handleOnDrop={handleOnDrop}
                loadMoreIssues={fetchMoreIssues}
                isEpic={isEpic}
              />
            </div>
          </div>
        </div>
      </IssueLayoutHOC>
    </>
  );
}
