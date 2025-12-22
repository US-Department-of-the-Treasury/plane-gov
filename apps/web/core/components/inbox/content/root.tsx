import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import type { TNameDescriptionLoader } from "@plane/types";
// components
import { ContentWrapper } from "@plane/ui";
// hooks
import { useProjectInbox } from "@/hooks/store/use-project-inbox";
import { useUser, useUserPermissions } from "@/hooks/store/user";
import { useAppRouter } from "@/hooks/use-app-router";
import { queryKeys } from "@/store/queries/query-keys";
// local imports
import { InboxIssueActionsHeader } from "./inbox-issue-header";
import { InboxIssueMainContent } from "./issue-root";

type TInboxContentRoot = {
  workspaceSlug: string;
  projectId: string;
  inboxIssueId: string;
  isMobileSidebar: boolean;
  setIsMobileSidebar: (value: boolean) => void;
  isNotificationEmbed?: boolean;
  embedRemoveCurrentNotification?: () => void;
};

export function InboxContentRoot(props: TInboxContentRoot) {
  const {
    workspaceSlug,
    projectId,
    inboxIssueId,
    isMobileSidebar,
    setIsMobileSidebar,
    isNotificationEmbed = false,
    embedRemoveCurrentNotification,
  } = props;
  /// router
  const router = useAppRouter();
  // states
  const [isSubmitting, setIsSubmitting] = useState<TNameDescriptionLoader>("saved");
  // hooks
  const { data: currentUser } = useUser();
  const { currentTab, fetchInboxIssueById, getIssueInboxByIssueId, getIsIssueAvailable } = useProjectInbox();
  const inboxIssue = getIssueInboxByIssueId(inboxIssueId);
  const { allowPermissions, getProjectRoleByWorkspaceSlugAndProjectId } = useUserPermissions();

  // derived values
  const isIssueAvailable = getIsIssueAvailable(inboxIssueId?.toString() || "");

  useEffect(() => {
    if (!isIssueAvailable && inboxIssueId && !isNotificationEmbed) {
      router.replace(`/${workspaceSlug}/projects/${projectId}/intake?currentTab=${currentTab}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIssueAvailable, isNotificationEmbed]);

  useQuery({
    queryKey:
      workspaceSlug && projectId && inboxIssueId ? queryKeys.inbox.detail(inboxIssueId) : [],
    queryFn: async () => {
      if (workspaceSlug && projectId && inboxIssueId) {
        await fetchInboxIssueById(workspaceSlug, projectId, inboxIssueId);
      }
      return null;
    },
    enabled: !!(workspaceSlug && projectId && inboxIssueId),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const isEditable =
    allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.PROJECT, workspaceSlug, projectId) ||
    inboxIssue?.issue.created_by === currentUser?.id;

  const isGuest = getProjectRoleByWorkspaceSlugAndProjectId(workspaceSlug, projectId) === EUserPermissions.GUEST;
  const isOwner = inboxIssue?.issue.created_by === currentUser?.id;
  const readOnly = !isOwner && isGuest;

  if (!inboxIssue) return <></>;

  const isIssueDisabled = [-1, 1, 2].includes(inboxIssue.status);

  return (
    <>
      <div className="w-full h-full overflow-hidden relative flex flex-col">
        <div className="flex-shrink-0 min-h-[52px] z-[11]">
          <InboxIssueActionsHeader
            setIsMobileSidebar={setIsMobileSidebar}
            isMobileSidebar={isMobileSidebar}
            workspaceSlug={workspaceSlug}
            projectId={projectId}
            inboxIssue={inboxIssue}
            isSubmitting={isSubmitting}
            isNotificationEmbed={isNotificationEmbed || false}
            embedRemoveCurrentNotification={embedRemoveCurrentNotification}
          />
        </div>
        <ContentWrapper className="divide-y-2 divide-subtle-1">
          <InboxIssueMainContent
            workspaceSlug={workspaceSlug}
            projectId={projectId}
            inboxIssue={inboxIssue}
            isEditable={isEditable && !isIssueDisabled && !readOnly}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
          />
        </ContentWrapper>
      </div>
    </>
  );
}
