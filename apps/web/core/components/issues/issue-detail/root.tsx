import type { FC } from "react";
import { useMemo } from "react";
import { observer } from "mobx-react";
// plane imports
import { EUserPermissions, EUserPermissionsLevel, WORK_ITEM_TRACKER_EVENTS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { TOAST_TYPE, setPromiseToast, setToast } from "@plane/propel/toast";
import type { TIssue } from "@plane/types";
import { EIssuesStoreType } from "@plane/types";
// assets
import emptyIssue from "@/app/assets/empty-state/issue.svg?url";
// components
import { EmptyState } from "@/components/common/empty-state";
// hooks
import { captureError, captureSuccess } from "@/helpers/event-tracker.helper";
import { useAppTheme } from "@/hooks/store/use-app-theme";
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useIssues } from "@/hooks/store/use-issues";
import { useUserPermissions } from "@/hooks/store/user";
import { useAppRouter } from "@/hooks/use-app-router";
// local components
import { IssuePeekOverview } from "../peek-overview";
import { IssueMainContent } from "./main-content";
import { IssueDetailsSidebar } from "./sidebar";

export type TIssueOperations = {
  fetch: (workspaceSlug: string, projectId: string, issueId: string, loader?: boolean) => Promise<void>;
  update: (workspaceSlug: string, projectId: string, issueId: string, data: Partial<TIssue>) => Promise<void>;
  remove: (workspaceSlug: string, projectId: string, issueId: string) => Promise<void>;
  archive?: (workspaceSlug: string, projectId: string, issueId: string) => Promise<void>;
  restore?: (workspaceSlug: string, projectId: string, issueId: string) => Promise<void>;
  addSprintToIssue?: (workspaceSlug: string, projectId: string, sprintId: string, issueId: string) => Promise<void>;
  addIssueToSprint?: (workspaceSlug: string, projectId: string, sprintId: string, issueIds: string[]) => Promise<void>;
  removeIssueFromSprint?: (workspaceSlug: string, projectId: string, sprintId: string, issueId: string) => Promise<void>;
  removeIssueFromEpic?: (
    workspaceSlug: string,
    projectId: string,
    epicId: string,
    issueId: string
  ) => Promise<void>;
  changeEpicsInIssue?: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    addEpicIds: string[],
    removeEpicIds: string[]
  ) => Promise<void>;
};

export type TIssueDetailRoot = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  is_archived?: boolean;
};

export const IssueDetailRoot = observer(function IssueDetailRoot(props: TIssueDetailRoot) {
  const { t } = useTranslation();
  const { workspaceSlug, projectId, issueId, is_archived = false } = props;
  // router
  const router = useAppRouter();
  // hooks
  const {
    issue: { getIssueById },
    fetchIssue,
    updateIssue,
    removeIssue,
    archiveIssue,
    addSprintToIssue,
    addIssueToSprint,
    removeIssueFromSprint,
    changeEpicsInIssue,
    removeIssueFromEpic,
  } = useIssueDetail();
  const {
    issues: { removeIssue: removeArchivedIssue },
  } = useIssues(EIssuesStoreType.ARCHIVED);
  const { allowPermissions } = useUserPermissions();
  const { issueDetailSidebarCollapsed } = useAppTheme();

  const issueOperations: TIssueOperations = useMemo(
    () => ({
      fetch: async (workspaceSlug: string, projectId: string, issueId: string) => {
        try {
          await fetchIssue(workspaceSlug, projectId, issueId);
        } catch (error) {
          console.error("Error fetching the parent issue:", error);
        }
      },
      update: async (workspaceSlug: string, projectId: string, issueId: string, data: Partial<TIssue>) => {
        try {
          await updateIssue(workspaceSlug, projectId, issueId, data);
          captureSuccess({
            eventName: WORK_ITEM_TRACKER_EVENTS.update,
            payload: { id: issueId },
          });
        } catch (error) {
          console.log("Error in updating issue:", error);
          captureError({
            eventName: WORK_ITEM_TRACKER_EVENTS.update,
            payload: { id: issueId },
            error: error as Error,
          });
          setToast({
            title: t("common.error.label"),
            type: TOAST_TYPE.ERROR,
            message: t("entity.update.failed", { entity: t("issue.label") }),
          });
        }
      },
      remove: async (workspaceSlug: string, projectId: string, issueId: string) => {
        try {
          if (is_archived) await removeArchivedIssue(workspaceSlug, projectId, issueId);
          else await removeIssue(workspaceSlug, projectId, issueId);
          setToast({
            title: t("common.success"),
            type: TOAST_TYPE.SUCCESS,
            message: t("entity.delete.success", { entity: t("issue.label") }),
          });
          captureSuccess({
            eventName: WORK_ITEM_TRACKER_EVENTS.delete,
            payload: { id: issueId },
          });
        } catch (error) {
          console.log("Error in deleting issue:", error);
          setToast({
            title: t("common.error.label"),
            type: TOAST_TYPE.ERROR,
            message: t("entity.delete.failed", { entity: t("issue.label") }),
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
          await archiveIssue(workspaceSlug, projectId, issueId);
          captureSuccess({
            eventName: WORK_ITEM_TRACKER_EVENTS.archive,
            payload: { id: issueId },
          });
        } catch (error) {
          console.log("Error in archiving issue:", error);
          captureError({
            eventName: WORK_ITEM_TRACKER_EVENTS.archive,
            payload: { id: issueId },
            error: error as Error,
          });
        }
      },
      addSprintToIssue: async (workspaceSlug: string, projectId: string, sprintId: string, issueId: string) => {
        try {
          await addSprintToIssue(workspaceSlug, projectId, sprintId, issueId);
          captureSuccess({
            eventName: WORK_ITEM_TRACKER_EVENTS.update,
            payload: { id: issueId },
          });
        } catch (error) {
          setToast({
            type: TOAST_TYPE.ERROR,
            title: t("common.error.label"),
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
          await addIssueToSprint(workspaceSlug, projectId, sprintId, issueIds);
          captureSuccess({
            eventName: WORK_ITEM_TRACKER_EVENTS.update,
            payload: { id: issueId },
          });
        } catch (error) {
          setToast({
            type: TOAST_TYPE.ERROR,
            title: t("common.error.label"),
            message: t("issue.add.sprint.failed"),
          });
          captureError({
            eventName: WORK_ITEM_TRACKER_EVENTS.update,
            payload: { id: issueId },
            error: error as Error,
          });
        }
      },
      removeIssueFromSprint: async (workspaceSlug: string, projectId: string, sprintId: string, issueId: string) => {
        try {
          const removeFromSprintPromise = removeIssueFromSprint(workspaceSlug, projectId, sprintId, issueId);
          setPromiseToast(removeFromSprintPromise, {
            loading: t("issue.remove.sprint.loading"),
            success: {
              title: t("common.success"),
              message: () => t("issue.remove.sprint.success"),
            },
            error: {
              title: t("common.error.label"),
              message: () => t("issue.remove.sprint.failed"),
            },
          });
          await removeFromSprintPromise;
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
      removeIssueFromEpic: async (workspaceSlug: string, projectId: string, epicId: string, issueId: string) => {
        try {
          const removeFromEpicPromise = removeIssueFromEpic(workspaceSlug, projectId, epicId, issueId);
          setPromiseToast(removeFromEpicPromise, {
            loading: t("issue.remove.epic.loading"),
            success: {
              title: t("common.success"),
              message: () => t("issue.remove.epic.success"),
            },
            error: {
              title: t("common.error.label"),
              message: () => t("issue.remove.epic.failed"),
            },
          });
          await removeFromEpicPromise;
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
        const promise = await changeEpicsInIssue(workspaceSlug, projectId, issueId, addEpicIds, removeEpicIds);
        captureSuccess({
          eventName: WORK_ITEM_TRACKER_EVENTS.update,
          payload: { id: issueId },
        });
        return promise;
      },
    }),
    [
      is_archived,
      fetchIssue,
      updateIssue,
      removeIssue,
      archiveIssue,
      removeArchivedIssue,
      addIssueToSprint,
      addSprintToIssue,
      removeIssueFromSprint,
      changeEpicsInIssue,
      removeIssueFromEpic,
      t,
      issueId,
    ]
  );

  // issue details
  const issue = getIssueById(issueId);
  // checking if issue is editable, based on user role
  const isEditable = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.PROJECT,
    workspaceSlug,
    projectId
  );

  return (
    <>
      {!issue ? (
        <EmptyState
          image={emptyIssue}
          title={t("issue.empty_state.issue_detail.title")}
          description={t("issue.empty_state.issue_detail.description")}
          primaryButton={{
            text: t("issue.empty_state.issue_detail.primary_button.text"),
            onClick: () => router.push(`/${workspaceSlug}/projects/${projectId}/issues`),
          }}
        />
      ) : (
        <div className="flex h-full w-full overflow-hidden">
          <div className="h-full w-full space-y-6 overflow-y-auto px-9 py-5">
            <IssueMainContent
              workspaceSlug={workspaceSlug}
              projectId={projectId}
              issueId={issueId}
              issueOperations={issueOperations}
              isEditable={isEditable}
              isArchived={is_archived}
            />
          </div>
          <div
            className="fixed right-0 z-[5] h-full w-full min-w-[300px] border-l border-subtle bg-surface-1 sm:w-1/2 md:relative md:w-1/4 lg:min-w-80 xl:min-w-96"
            style={issueDetailSidebarCollapsed ? { right: `-${window?.innerWidth || 0}px` } : {}}
          >
            <IssueDetailsSidebar
              workspaceSlug={workspaceSlug}
              projectId={projectId}
              issueId={issueId}
              issueOperations={issueOperations}
              isEditable={!is_archived && isEditable}
            />
          </div>
        </div>
      )}

      {/* peek overview */}
      <IssuePeekOverview />
    </>
  );
});
