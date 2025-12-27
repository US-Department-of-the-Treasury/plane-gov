import { useMemo, useCallback } from "react";
// plane imports
import { WORK_ITEM_TRACKER_EVENTS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { TIssue, TIssueServiceType } from "@plane/types";
import { EIssueServiceType } from "@plane/types";
import { copyUrlToClipboard } from "@plane/utils";
// hooks
import { captureError, captureSuccess } from "@/helpers/event-tracker.helper";
// store
import { useUpdateIssue, useDeleteIssue } from "@/store/queries/issue";

export type TRelationIssueOperations = {
  copyLink: (path: string) => void;
  update: (workspaceSlug: string, projectId: string, issueId: string, data: Partial<TIssue>) => Promise<void>;
  remove: (workspaceSlug: string, projectId: string, issueId: string) => Promise<void>;
};

export const useRelationOperations = (
  issueServiceType: TIssueServiceType = EIssueServiceType.ISSUES
): TRelationIssueOperations => {
  // TanStack Query mutations
  const { mutateAsync: updateIssueMutation } = useUpdateIssue();
  const { mutateAsync: deleteIssueMutation } = useDeleteIssue();
  const { t } = useTranslation();
  // derived values
  const entityName = issueServiceType === EIssueServiceType.ISSUES ? "Work item" : "Epic";

  const copyLink = useCallback(
    (path: string) => {
      copyUrlToClipboard(path).then(() => {
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: t("common.link_copied"),
          message: t("entity.link_copied_to_clipboard", { entity: entityName }),
        });
      });
    },
    [entityName, t]
  );

  const update = useCallback(
    async (workspaceSlug: string, projectId: string, issueId: string, data: Partial<TIssue>) => {
      try {
        await updateIssueMutation({ workspaceSlug, projectId, issueId, data });
        captureSuccess({
          eventName: WORK_ITEM_TRACKER_EVENTS.update,
          payload: { id: issueId },
        });
        setToast({
          title: t("toast.success"),
          type: TOAST_TYPE.SUCCESS,
          message: t("entity.update.success", { entity: entityName }),
        });
      } catch (error) {
        captureError({
          eventName: WORK_ITEM_TRACKER_EVENTS.update,
          payload: { id: issueId },
          error: error as Error,
        });
        setToast({
          title: t("toast.error"),
          type: TOAST_TYPE.ERROR,
          message: t("entity.update.failed", { entity: entityName }),
        });
      }
    },
    [entityName, t, updateIssueMutation]
  );

  const remove = useCallback(
    async (workspaceSlug: string, projectId: string, issueId: string) => {
      try {
        await deleteIssueMutation({ workspaceSlug, projectId, issueId });
        captureSuccess({
          eventName: WORK_ITEM_TRACKER_EVENTS.delete,
          payload: { id: issueId },
        });
      } catch (error) {
        captureError({
          eventName: WORK_ITEM_TRACKER_EVENTS.delete,
          payload: { id: issueId },
          error: error as Error,
        });
      }
    },
    [deleteIssueMutation]
  );

  const issueOperations: TRelationIssueOperations = useMemo(
    () => ({
      copyLink,
      update,
      remove,
    }),
    [copyLink, update, remove]
  );

  return issueOperations;
};
