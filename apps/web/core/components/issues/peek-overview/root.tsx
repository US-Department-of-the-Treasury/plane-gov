import { useState, useMemo, useCallback } from "react";
import { usePathname } from "next/navigation";
// Plane imports
import { useQuery } from "@tanstack/react-query";
import { EUserPermissions, EUserPermissionsLevel, WORK_ITEM_TRACKER_EVENTS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { TOAST_TYPE, setPromiseToast, setToast } from "@plane/propel/toast";
import type { IWorkItemPeekOverview, TIssue } from "@plane/types";
import { EIssueServiceType, EIssuesStoreType } from "@plane/types";
// hooks
import { captureError, captureSuccess } from "@/helpers/event-tracker.helper";
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useIssues } from "@/hooks/store/use-issues";
// stores
import { useIssueDetailUIStore } from "@/store/issue/issue-details/ui.store";
import { useUserPermissions } from "@/hooks/store/user";
import { useIssueStoreType } from "@/hooks/use-issue-layout-store";
import { useWorkItemProperties } from "@/plane-web/hooks/use-issue-properties";
import { useUpdateIssue, useDeleteIssue, useArchiveIssue } from "@/store/queries/issue";
// local imports
import type { TIssueOperations } from "../issue-detail";
import { IssueView } from "./view";

export function IssuePeekOverview(props: IWorkItemPeekOverview) {
  const {
    embedIssue = false,
    embedRemoveCurrentNotification,
    is_draft = false,
    storeType: issueStoreFromProps,
  } = props;
  const { t } = useTranslation();
  // router
  const pathname = usePathname();
  // store hook
  const { allowPermissions } = useUserPermissions();

  const {
    issues: { restoreIssue },
  } = useIssues(EIssuesStoreType.ARCHIVED);
  // UI state from Zustand (reactive)
  const peekIssue = useIssueDetailUIStore((state) => state.peekIssue);
  const setPeekIssue = useIssueDetailUIStore((state) => state.setPeekIssue);
  // Data operations from useIssueDetail
  const {
    issue: { fetchIssue },
    fetchActivities,
  } = useIssueDetail();
  const issueStoreType = useIssueStoreType();
  const storeType = issueStoreFromProps ?? issueStoreType;
  const { issues } = useIssues(storeType);

  // TanStack Query mutations
  const { mutateAsync: updateIssue } = useUpdateIssue();
  const { mutateAsync: deleteIssue } = useDeleteIssue();
  const { mutateAsync: archiveIssue } = useArchiveIssue();

  useWorkItemProperties(
    peekIssue?.projectId,
    peekIssue?.workspaceSlug,
    peekIssue?.issueId,
    storeType === EIssuesStoreType.EPIC ? EIssueServiceType.EPICS : EIssueServiceType.ISSUES
  );
  // state
  const [error, setError] = useState(false);

  const removeRoutePeekId = useCallback(() => {
    setPeekIssue(undefined);
    if (embedIssue) embedRemoveCurrentNotification?.();
  }, [embedIssue, embedRemoveCurrentNotification, setPeekIssue]);

  const issueOperations: TIssueOperations = useMemo(
    () => ({
      fetch: async (workspaceSlug: string, projectId: string, issueId: string) => {
        try {
          setError(false);
          await fetchIssue(workspaceSlug, projectId, issueId);
        } catch (error) {
          setError(true);
          console.error("Error fetching the parent issue", error);
        }
      },
      update: async (workspaceSlug: string, projectId: string, issueId: string, data: Partial<TIssue>) => {
        try {
          await updateIssue({ workspaceSlug, projectId, issueId, data });
          void fetchActivities(workspaceSlug, projectId, issueId);
          captureSuccess({
            eventName: WORK_ITEM_TRACKER_EVENTS.update,
            payload: { id: issueId },
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
            message: t("entity.update.failed", { entity: t("issue.label", { count: 1 }) }),
          });
        }
      },
      remove: async (workspaceSlug: string, projectId: string, issueId: string) => {
        try {
          await deleteIssue({ workspaceSlug, projectId, issueId });
          captureSuccess({
            eventName: WORK_ITEM_TRACKER_EVENTS.delete,
            payload: { id: issueId },
          });
          removeRoutePeekId();
        } catch (error) {
          setToast({
            title: t("toast.error"),
            type: TOAST_TYPE.ERROR,
            message: t("entity.delete.failed", { entity: t("issue.label", { count: 1 }) }),
          });
          captureError({
            eventName: WORK_ITEM_TRACKER_EVENTS.delete,
            payload: { id: issueId },
            error: error as Error,
          });
        }
      },
      archive: async (workspaceSlug: string, projectId: string, issueId: string) => {
        try {
          await archiveIssue({ workspaceSlug, projectId, issueId });
          captureSuccess({
            eventName: WORK_ITEM_TRACKER_EVENTS.archive,
            payload: { id: issueId },
          });
        } catch (error) {
          captureError({
            eventName: WORK_ITEM_TRACKER_EVENTS.archive,
            payload: { id: issueId },
            error: error as Error,
          });
        }
      },
      restore: async (workspaceSlug: string, projectId: string, issueId: string) => {
        try {
          await restoreIssue(workspaceSlug, projectId, issueId);
          setToast({
            type: TOAST_TYPE.SUCCESS,
            title: t("issue.restore.success.title"),
            message: t("issue.restore.success.message"),
          });
          captureSuccess({
            eventName: WORK_ITEM_TRACKER_EVENTS.restore,
            payload: { id: issueId },
          });
        } catch (error) {
          setToast({
            type: TOAST_TYPE.ERROR,
            title: t("toast.error"),
            message: t("issue.restore.failed.message"),
          });
          captureError({
            eventName: WORK_ITEM_TRACKER_EVENTS.restore,
            payload: { id: issueId },
            error: error as Error,
          });
        }
      },
      addSprintToIssue: async (workspaceSlug: string, projectId: string, sprintId: string, issueId: string) => {
        try {
          await issues.addSprintToIssue(workspaceSlug, projectId, sprintId, issueId);
          void fetchActivities(workspaceSlug, projectId, issueId);
          captureSuccess({
            eventName: WORK_ITEM_TRACKER_EVENTS.update,
            payload: { id: issueId },
          });
        } catch (error) {
          setToast({
            type: TOAST_TYPE.ERROR,
            title: t("toast.error"),
            message: t("issue.add.sprint.failed"),
          });
          captureError({
            eventName: WORK_ITEM_TRACKER_EVENTS.update,
            payload: { id: issueId },
            error: error as Error,
          });
        }
      },
      addIssueToSprint: async (workspaceSlug: string, projectId: string, sprintId: string, issueIds: string[]) => {
        try {
          await issues.addIssueToSprint(workspaceSlug, projectId, sprintId, issueIds);
          captureSuccess({
            eventName: WORK_ITEM_TRACKER_EVENTS.update,
            payload: { id: issueIds },
          });
        } catch (error) {
          setToast({
            type: TOAST_TYPE.ERROR,
            title: t("toast.error"),
            message: t("issue.add.sprint.failed"),
          });
          captureError({
            eventName: WORK_ITEM_TRACKER_EVENTS.update,
            payload: { id: issueIds },
            error: error as Error,
          });
        }
      },
      removeIssueFromSprint: async (workspaceSlug: string, projectId: string, sprintId: string, issueId: string) => {
        try {
          const removeFromSprintPromise = issues.removeIssueFromSprint(workspaceSlug, projectId, sprintId, issueId);
          setPromiseToast(removeFromSprintPromise, {
            loading: t("issue.remove.sprint.loading"),
            success: {
              title: t("toast.success"),
              message: () => t("issue.remove.sprint.success"),
            },
            error: {
              title: t("toast.error"),
              message: () => t("issue.remove.sprint.failed"),
            },
          });
          await removeFromSprintPromise;
          void fetchActivities(workspaceSlug, projectId, issueId);
          captureSuccess({
            eventName: WORK_ITEM_TRACKER_EVENTS.update,
            payload: { id: issueId },
          });
        } catch (error) {
          captureError({
            eventName: WORK_ITEM_TRACKER_EVENTS.update,
            payload: { id: issueId },
            error: error as Error,
          });
        }
      },
      changeEpicsInIssue: async (
        workspaceSlug: string,
        projectId: string,
        issueId: string,
        addEpicIds: string[],
        removeEpicIds: string[]
      ) => {
        const promise = await issues.changeEpicsInIssue(workspaceSlug, projectId, issueId, addEpicIds, removeEpicIds);
        void fetchActivities(workspaceSlug, projectId, issueId);
        captureSuccess({
          eventName: WORK_ITEM_TRACKER_EVENTS.update,
          payload: { id: issueId },
        });
        return promise;
      },
      removeIssueFromEpic: async (workspaceSlug: string, projectId: string, epicId: string, issueId: string) => {
        try {
          const removeFromEpicPromise = issues.removeIssuesFromEpic(workspaceSlug, projectId, epicId, [issueId]);
          setPromiseToast(removeFromEpicPromise, {
            loading: t("issue.remove.epic.loading"),
            success: {
              title: t("toast.success"),
              message: () => t("issue.remove.epic.success"),
            },
            error: {
              title: t("toast.error"),
              message: () => t("issue.remove.epic.failed"),
            },
          });
          await removeFromEpicPromise;
          void fetchActivities(workspaceSlug, projectId, issueId);
          captureSuccess({
            eventName: WORK_ITEM_TRACKER_EVENTS.update,
            payload: { id: issueId },
          });
        } catch (error) {
          captureError({
            eventName: WORK_ITEM_TRACKER_EVENTS.update,
            payload: { id: issueId },
            error: error as Error,
          });
        }
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetchIssue, is_draft, issues, fetchActivities, pathname, removeRoutePeekId, restoreIssue]
  );

  const { isPending } = useQuery({
    queryKey: peekIssue?.issueId ? ["peek-issue", peekIssue.workspaceSlug, peekIssue.projectId, peekIssue.issueId] : [],
    queryFn: async () => {
      if (peekIssue) {
        await issueOperations.fetch(peekIssue.workspaceSlug, peekIssue.projectId, peekIssue.issueId);
      }
      return null;
    },
    enabled: !!(peekIssue?.workspaceSlug && peekIssue?.projectId && peekIssue?.issueId),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  if (!peekIssue?.workspaceSlug || !peekIssue?.projectId || !peekIssue?.issueId) return <></>;

  // Check if issue is editable, based on user role
  const isEditable = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.PROJECT,
    peekIssue?.workspaceSlug,
    peekIssue?.projectId
  );

  return (
    <IssueView
      workspaceSlug={peekIssue.workspaceSlug}
      projectId={peekIssue.projectId}
      issueId={peekIssue.issueId}
      isLoading={isPending}
      isError={error}
      is_archived={!!peekIssue.isArchived}
      disabled={!isEditable}
      embedIssue={embedIssue}
      embedRemoveCurrentNotification={embedRemoveCurrentNotification}
      issueOperations={issueOperations}
    />
  );
}
