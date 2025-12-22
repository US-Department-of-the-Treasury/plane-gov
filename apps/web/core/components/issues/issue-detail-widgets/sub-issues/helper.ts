import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
// plane imports
import { WORK_ITEM_TRACKER_EVENTS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { TIssueServiceType, TSubIssueOperations } from "@plane/types";
import { EIssueServiceType } from "@plane/types";
import { copyUrlToClipboard } from "@plane/utils";
// hooks
import { captureError, captureSuccess } from "@/helpers/event-tracker.helper";
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useAddSubIssues, useUpdateIssue, useDeleteIssue, useIssue } from "@/store/queries/issue";
import { getStateById } from "@/store/queries/state";
import { queryKeys } from "@/store/queries/query-keys";
// plane web helpers
import { updateEpicAnalytics } from "@/plane-web/helpers/epic-analytics";

export const useSubIssueOperations = (issueServiceType: TIssueServiceType): TSubIssueOperations => {
  // router
  const { epicId: epicIdParam, workspaceSlug, projectId } = useParams();
  // translation
  const { t } = useTranslation();
  // query client
  const queryClient = useQueryClient();
  // store hooks
  const {
    subIssues: { setSubIssueHelpers },
  } = useIssueDetail(issueServiceType);
  const { peekIssue: epicPeekIssue } = useIssueDetail(EIssueServiceType.EPICS);
  // mutations
  const { mutateAsync: addSubIssues } = useAddSubIssues();
  const { mutateAsync: updateIssue } = useUpdateIssue();
  const { mutateAsync: deleteIssue } = useDeleteIssue();
  // const { updateEpicAnalytics } = useIssueTypes();
  const { updateAnalytics } = updateEpicAnalytics();

  // derived values
  const epicId = epicIdParam || epicPeekIssue?.issueId;

  // Helper to get states from cache
  const getStatesFromCache = (workspaceSlug: string, projectId: string) => {
    return queryClient.getQueryData<any[]>(["PROJECT_STATES", workspaceSlug, projectId]) ?? [];
  };

  const subIssueOperations: TSubIssueOperations = useMemo(
    () => ({
      copyLink: (path) => {
        copyUrlToClipboard(path).then(() => {
          setToast({
            type: TOAST_TYPE.SUCCESS,
            title: t("common.link_copied"),
            message: t("entity.link_copied_to_clipboard", {
              entity:
                issueServiceType === EIssueServiceType.ISSUES
                  ? t("common.sub_work_items", { count: 1 })
                  : t("issue.label", { count: 1 }),
            }),
          });
        });
      },
      fetchSubIssues: async (workspaceSlug, projectId, parentIssueId) => {
        // No-op: TanStack Query handles fetching via useSubIssues hook
        // This method is kept for compatibility but does nothing
        return;
      },
      addSubIssue: async (workspaceSlug, projectId, parentIssueId, issueIds) => {
        try {
          await addSubIssues({ workspaceSlug, projectId, issueId: parentIssueId, subIssueIds: issueIds });
          setToast({
            type: TOAST_TYPE.SUCCESS,
            title: t("toast.success"),
            message: t("entity.add.success", {
              entity:
                issueServiceType === EIssueServiceType.ISSUES
                  ? t("common.sub_work_items")
                  : t("issue.label", { count: issueIds.length }),
            }),
          });
        } catch {
          setToast({
            type: TOAST_TYPE.ERROR,
            title: t("toast.error"),
            message: t("entity.add.failed", {
              entity:
                issueServiceType === EIssueServiceType.ISSUES
                  ? t("common.sub_work_items")
                  : t("issue.label", { count: issueIds.length }),
            }),
          });
        }
      },
      updateSubIssue: async (
        workspaceSlug,
        projectId,
        parentIssueId,
        issueId,
        issueData,
        oldIssue = {},
        fromModal = false
      ) => {
        try {
          setSubIssueHelpers(parentIssueId, "issue_loader", issueId);
          await updateIssue({ workspaceSlug, projectId, issueId, data: issueData });

          if (issueServiceType === EIssueServiceType.EPICS) {
            const states = getStatesFromCache(workspaceSlug, projectId);
            const oldState = getStateById(states, oldIssue?.state_id ?? "")?.group;

            if (oldState && oldIssue && issueData && epicId) {
              // Check if parent_id is changed if yes then decrement the epic analytics count
              if (issueData.parent_id && oldIssue?.parent_id && issueData.parent_id !== oldIssue?.parent_id) {
                updateAnalytics(workspaceSlug, projectId, epicId.toString(), {
                  decrementStateGroupCount: `${oldState}_issues`,
                });
              }

              // Check if state_id is changed if yes then decrement the old state group count and increment the new state group count
              if (issueData.state_id) {
                const newState = getStateById(states, issueData.state_id)?.group;
                if (oldState && newState && oldState !== newState) {
                  updateAnalytics(workspaceSlug, projectId, epicId.toString(), {
                    decrementStateGroupCount: `${oldState}_issues`,
                    incrementStateGroupCount: `${newState}_issues`,
                  });
                }
              }
            }
          }

          // Invalidate parent's sub-issues
          await queryClient.invalidateQueries({
            queryKey: [...queryKeys.issues.detail(parentIssueId), "sub-issues"],
          });

          captureSuccess({
            eventName: WORK_ITEM_TRACKER_EVENTS.sub_issue.update,
            payload: { id: issueId, parent_id: parentIssueId },
          });
          setToast({
            type: TOAST_TYPE.SUCCESS,
            title: t("toast.success"),
            message: t("sub_work_item.update.success"),
          });
          setSubIssueHelpers(parentIssueId, "issue_loader", issueId);
        } catch (error) {
          captureError({
            eventName: WORK_ITEM_TRACKER_EVENTS.sub_issue.update,
            payload: { id: issueId, parent_id: parentIssueId },
            error: error as Error,
          });
          setToast({
            type: TOAST_TYPE.ERROR,
            title: t("toast.error"),
            message: t("sub_work_item.update.error"),
          });
          setSubIssueHelpers(parentIssueId, "issue_loader", issueId);
        }
      },
      removeSubIssue: async (workspaceSlug, projectId, parentIssueId, issueId) => {
        try {
          setSubIssueHelpers(parentIssueId, "issue_loader", issueId);

          // Get issue before removal for analytics
          const issueBeforeRemoval = queryClient.getQueryData<any>(queryKeys.issues.detail(issueId));

          // Remove sub-issue by setting parent_id to null
          await updateIssue({ workspaceSlug, projectId, issueId, data: { parent_id: null } });

          if (issueServiceType === EIssueServiceType.EPICS) {
            const states = getStatesFromCache(workspaceSlug, projectId);
            const oldState = getStateById(states, issueBeforeRemoval?.state_id ?? "")?.group;

            if (epicId && oldState) {
              updateAnalytics(workspaceSlug, projectId, epicId.toString(), {
                decrementStateGroupCount: `${oldState}_issues`,
              });
            }
          }

          // Invalidate parent's sub-issues
          await queryClient.invalidateQueries({
            queryKey: [...queryKeys.issues.detail(parentIssueId), "sub-issues"],
          });

          setToast({
            type: TOAST_TYPE.SUCCESS,
            title: t("toast.success"),
            message: t("entity.remove.success", {
              entity:
                issueServiceType === EIssueServiceType.ISSUES
                  ? t("common.sub_work_items")
                  : t("issue.label", { count: 1 }),
            }),
          });
          captureSuccess({
            eventName: WORK_ITEM_TRACKER_EVENTS.sub_issue.remove,
            payload: { id: issueId, parent_id: parentIssueId },
          });
          setSubIssueHelpers(parentIssueId, "issue_loader", issueId);
        } catch (error) {
          captureError({
            eventName: WORK_ITEM_TRACKER_EVENTS.sub_issue.remove,
            payload: { id: issueId, parent_id: parentIssueId },
            error: error as Error,
          });
          setToast({
            type: TOAST_TYPE.ERROR,
            title: t("toast.error"),
            message: t("entity.remove.failed", {
              entity:
                issueServiceType === EIssueServiceType.ISSUES
                  ? t("common.sub_work_items")
                  : t("issue.label", { count: 1 }),
            }),
          });
          setSubIssueHelpers(parentIssueId, "issue_loader", issueId);
        }
      },
      deleteSubIssue: async (workspaceSlug, projectId, parentIssueId, issueId) => {
        try {
          setSubIssueHelpers(parentIssueId, "issue_loader", issueId);

          await deleteIssue({ workspaceSlug, projectId, issueId });

          // Invalidate parent's sub-issues
          await queryClient.invalidateQueries({
            queryKey: [...queryKeys.issues.detail(parentIssueId), "sub-issues"],
          });

          captureSuccess({
            eventName: WORK_ITEM_TRACKER_EVENTS.sub_issue.delete,
            payload: { id: issueId, parent_id: parentIssueId },
          });
          setSubIssueHelpers(parentIssueId, "issue_loader", issueId);
        } catch (error) {
          captureError({
            eventName: WORK_ITEM_TRACKER_EVENTS.sub_issue.delete,
            payload: { id: issueId, parent_id: parentIssueId },
            error: error as Error,
          });
          setToast({
            type: TOAST_TYPE.ERROR,
            title: t("toast.error"),
            message: t("entity.delete.failed", {
              entity:
                issueServiceType === EIssueServiceType.ISSUES
                  ? t("common.sub_work_items")
                  : t("issue.label", { count: 1 }),
            }),
          });
          setSubIssueHelpers(parentIssueId, "issue_loader", issueId);
        }
      },
    }),
    [
      addSubIssues,
      deleteIssue,
      epicId,
      queryClient,
      issueServiceType,
      setSubIssueHelpers,
      t,
      updateAnalytics,
      updateIssue,
      workspaceSlug,
      projectId,
    ]
  );

  return subIssueOperations;
};
