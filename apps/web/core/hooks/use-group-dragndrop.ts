import { useParams } from "next/navigation";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { EIssuesStoreType, TIssue, TIssueGroupByOptions, TIssueOrderByOptions } from "@plane/types";
import type { GroupDropLocation } from "@/components/issues/issue-layouts/utils";
import { handleGroupDragDrop } from "@/components/issues/issue-layouts/utils";
import { ISSUE_FILTER_DEFAULT_DATA } from "@/store/issue/helpers/base-issues.store";
import { useIssueStore } from "@/store/issue/issue.store";
import { useIssues } from "./store/use-issues";
import { useIssuesActions } from "./use-issues-actions";

type DNDStoreType =
  | EIssuesStoreType.PROJECT
  | EIssuesStoreType.EPIC
  | EIssuesStoreType.SPRINT
  | EIssuesStoreType.PROJECT_VIEW
  | EIssuesStoreType.PROFILE
  | EIssuesStoreType.ARCHIVED
  | EIssuesStoreType.WORKSPACE_DRAFT
  | EIssuesStoreType.TEAM
  | EIssuesStoreType.TEAM_VIEW
   
  | EIssuesStoreType.TEAM_PROJECT_WORK_ITEMS;

export const useGroupIssuesDragNDrop = (
  storeType: DNDStoreType,
  orderBy: TIssueOrderByOptions | undefined,
  groupBy: TIssueGroupByOptions | undefined,
  subGroupBy?: TIssueGroupByOptions
) => {
  const { workspaceSlug } = useParams();

  // Zustand store
  const getIssueById = useIssueStore((s) => s.getIssueById);
  const { updateIssue } = useIssuesActions(storeType);
  const {
    issues: { getIssueIds, addSprintToIssue, removeSprintFromIssue, changeEpicsInIssue },
  } = useIssues(storeType);

  /**
   * update Issue on Drop, checks if epics or sprints are changed and then calls appropriate functions
   * @param projectId
   * @param issueId
   * @param data
   * @param issueUpdates
   */
  const updateIssueOnDrop = (
    projectId: string,
    issueId: string,
    data: Partial<TIssue>,
    issueUpdates: {
      [groupKey: string]: {
        ADD: string[];
        REMOVE: string[];
      };
    }
  ) => {
    const errorToastProps = {
      type: TOAST_TYPE.ERROR,
      title: "Error!",
      message: "Error while updating work item",
    };
    const epicKey = ISSUE_FILTER_DEFAULT_DATA["epic"];
    const sprintKey = ISSUE_FILTER_DEFAULT_DATA["sprint"];

    const isEpicChanged = Object.keys(data).includes(epicKey);
    const isSprintChanged = Object.keys(data).includes(sprintKey);

    if (isSprintChanged && workspaceSlug) {
      const sprintValue = data[sprintKey];
      if (sprintValue) {
        void addSprintToIssue(workspaceSlug.toString(), projectId, String(sprintValue), issueId).catch(() =>
          setToast(errorToastProps)
        );
      } else {
        void removeSprintFromIssue(workspaceSlug.toString(), projectId, issueId).catch(() => setToast(errorToastProps));
      }
      delete data[sprintKey];
    }

    if (isEpicChanged && workspaceSlug && issueUpdates[epicKey]) {
      void changeEpicsInIssue(
        workspaceSlug.toString(),
        projectId,
        issueId,
        issueUpdates[epicKey].ADD,
        issueUpdates[epicKey].REMOVE
      ).catch(() => setToast(errorToastProps));
      delete data[epicKey];
    }

    if (updateIssue) {
      void updateIssue(projectId, issueId, data).catch(() => setToast(errorToastProps));
    }
  };

  const handleOnDrop = (source: GroupDropLocation, destination: GroupDropLocation) => {
    if (
      source.columnId &&
      destination.columnId &&
      destination.columnId === source.columnId &&
      destination.id === source.id
    )
      return;

    void handleGroupDragDrop(
      source,
      destination,
      getIssueById,
      getIssueIds,
      updateIssueOnDrop,
      groupBy,
      subGroupBy,
      orderBy !== "sort_order"
    ).catch((err: unknown) => {
      const errorDetail = err && typeof err === "object" && "detail" in err ? (err as { detail: string }).detail : null;
      setToast({
        title: "Error!",
        type: TOAST_TYPE.ERROR,
        message: errorDetail ?? "Failed to perform this action",
      });
    });
  };

  return handleOnDrop;
};
