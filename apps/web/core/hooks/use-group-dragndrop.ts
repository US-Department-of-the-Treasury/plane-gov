import { useParams } from "next/navigation";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { EIssuesStoreType, TIssue, TIssueGroupByOptions, TIssueOrderByOptions } from "@plane/types";
import type { GroupDropLocation } from "@/components/issues/issue-layouts/utils";
import { handleGroupDragDrop } from "@/components/issues/issue-layouts/utils";
import { ISSUE_FILTER_DEFAULT_DATA } from "@/store/issue/helpers/base-issues.store";
import { useIssueDetail } from "./store/use-issue-detail";
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

  const {
    issue: { getIssueById },
  } = useIssueDetail();
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
  const updateIssueOnDrop = async (
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
      if (data[sprintKey]) {
        addSprintToIssue(workspaceSlug.toString(), projectId, data[sprintKey]?.toString() ?? "", issueId).catch(() =>
          setToast(errorToastProps)
        );
      } else {
        removeSprintFromIssue(workspaceSlug.toString(), projectId, issueId).catch(() => setToast(errorToastProps));
      }
      delete data[sprintKey];
    }

    if (isEpicChanged && workspaceSlug && issueUpdates[epicKey]) {
      changeEpicsInIssue(
        workspaceSlug.toString(),
        projectId,
        issueId,
        issueUpdates[epicKey].ADD,
        issueUpdates[epicKey].REMOVE
      ).catch(() => setToast(errorToastProps));
      delete data[epicKey];
    }

    updateIssue && updateIssue(projectId, issueId, data).catch(() => setToast(errorToastProps));
  };

  const handleOnDrop = async (source: GroupDropLocation, destination: GroupDropLocation) => {
    if (
      source.columnId &&
      destination.columnId &&
      destination.columnId === source.columnId &&
      destination.id === source.id
    )
      return;

    await handleGroupDragDrop(
      source,
      destination,
      getIssueById,
      getIssueIds,
      updateIssueOnDrop,
      groupBy,
      subGroupBy,
      orderBy !== "sort_order"
    ).catch((err) => {
      setToast({
        title: "Error!",
        type: TOAST_TYPE.ERROR,
        message: err?.detail ?? "Failed to perform this action",
      });
    });
  };

  return handleOnDrop;
};
