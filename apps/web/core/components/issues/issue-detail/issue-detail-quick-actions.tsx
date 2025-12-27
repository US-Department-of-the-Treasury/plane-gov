import { useRef } from "react";
// plane imports
import { WORK_ITEM_TRACKER_EVENTS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { CopyLinkIcon } from "@plane/propel/icons";
import { IconButton } from "@plane/propel/icon-button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { Tooltip } from "@plane/propel/tooltip";
import { EIssuesStoreType } from "@plane/types";
import { generateWorkItemLink, copyTextToClipboard } from "@plane/utils";
// helpers
import { captureError, captureSuccess } from "@/helpers/event-tracker.helper";
// hooks
import { useIssuesActions } from "@/hooks/use-issues-actions";
import { useUser } from "@/hooks/store/user";
import { useAppRouter } from "@/hooks/use-app-router";
import { usePlatformOS } from "@/hooks/use-platform-os";
// queries
import { useProjectDetails } from "@/store/queries/project";
import { useIssue, useDeleteIssue, useArchiveIssue } from "@/store/queries/issue";
// local imports
import { WorkItemDetailQuickActions } from "../issue-layouts/quick-action-dropdowns";
import { IssueSubscription } from "./subscription";

type Props = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
};

export function IssueDetailQuickActions(props: Props) {
  const { workspaceSlug, projectId, issueId } = props;
  const { t } = useTranslation();

  // ref
  const parentRef = useRef<HTMLDivElement>(null);

  // router
  const router = useAppRouter();

  // hooks
  const { data: currentUser } = useUser();
  const { isMobile } = usePlatformOS();
  const { restoreIssue, removeIssue: removeArchivedIssue } = useIssuesActions(EIssuesStoreType.ARCHIVED);
  // TanStack Query
  const { data: project } = useProjectDetails(workspaceSlug, projectId);
  const { data: issue } = useIssue(workspaceSlug, projectId, issueId);
  const { mutateAsync: deleteIssue } = useDeleteIssue();
  const { mutateAsync: archiveIssue } = useArchiveIssue();
  if (!issue) return <></>;

  const projectIdentifier = project?.identifier;

  const workItemLink = generateWorkItemLink({
    workspaceSlug: workspaceSlug,
    projectId,
    issueId,
    projectIdentifier,
    sequenceId: issue?.sequence_id,
  });

  // handlers
  const handleCopyText = () => {
    const originURL = typeof window !== "undefined" && window.location.origin ? window.location.origin : "";
    copyTextToClipboard(`${originURL}${workItemLink}`).then(() => {
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("common.link_copied"),
        message: t("common.copied_to_clipboard"),
      });
    });
  };

  const handleDeleteIssue = async () => {
    try {
      const redirectionPath = issue?.archived_at
        ? `/${workspaceSlug}/projects/${projectId}/archives/issues`
        : `/${workspaceSlug}/projects/${projectId}/issues`;

      if (issue?.archived_at) {
        await removeArchivedIssue(projectId, issueId);
      } else {
        await deleteIssue({ workspaceSlug, projectId, issueId });
      }

      router.push(redirectionPath);
      captureSuccess({
        eventName: WORK_ITEM_TRACKER_EVENTS.delete,
        payload: { id: issueId },
      });
    } catch (error) {
      setToast({
        title: t("toast.error "),
        type: TOAST_TYPE.ERROR,
        message: t("entity.delete.failed", { entity: t("issue.label", { count: 1 }) }),
      });
      captureError({
        eventName: WORK_ITEM_TRACKER_EVENTS.delete,
        payload: { id: issueId },
        error: error as Error,
      });
    }
  };

  const handleArchiveIssue = async () => {
    try {
      await archiveIssue({ workspaceSlug, projectId, issueId });
      router.push(`/${workspaceSlug}/projects/${projectId}/issues`);
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
  };

  const handleRestore = async () => {
    if (!projectId || !issueId || !restoreIssue) return;

    try {
      await restoreIssue(projectId, issueId);
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("issue.restore.success.title"),
        message: t("issue.restore.success.message"),
      });
      router.push(workItemLink);
    } catch {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("toast.error"),
        message: t("issue.restore.failed.message"),
      });
    }
  };

  return (
    <>
      <div className="flex items-center justify-end flex-shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          {currentUser && !issue?.archived_at && (
            <IssueSubscription workspaceSlug={workspaceSlug} projectId={projectId} issueId={issueId} />
          )}
          <div className="flex flex-wrap items-center gap-2 text-tertiary">
            <Tooltip tooltipContent={t("common.actions.copy_link")} isMobile={isMobile}>
              <IconButton variant="secondary" size="lg" onClick={handleCopyText} icon={CopyLinkIcon} />
            </Tooltip>
            <WorkItemDetailQuickActions
              parentRef={parentRef}
              issue={issue}
              handleDelete={handleDeleteIssue}
              handleArchive={handleArchiveIssue}
              handleRestore={handleRestore}
            />
          </div>
        </div>
      </div>
    </>
  );
}
