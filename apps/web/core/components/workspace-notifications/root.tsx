import { useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
// plane imports
import { ENotificationLoader, ENotificationQueryParamType } from "@plane/constants";
import { EmptyStateCompact } from "@plane/propel/empty-state";
import { cn } from "@plane/utils";
// components
import { LogoSpinner } from "@/components/common/logo-spinner";
// hooks
import { useWorkspaceNotifications } from "@/hooks/store/notifications";
import { useUserPermissions } from "@/hooks/store/user";
import { useWorkspaceIssueProperties } from "@/hooks/use-workspace-issue-properties";
import { useWorkspaceDetails } from "@/store/queries/workspace";
// queries
import { queryKeys } from "@/store/queries/query-keys";
// plane web imports
import { useNotificationPreview } from "@/plane-web/hooks/use-notification-preview";
// local imports
import { InboxContentRoot } from "../inbox/content";

type NotificationsRootProps = {
  workspaceSlug?: string;
};

export function NotificationsRoot({ workspaceSlug }: NotificationsRootProps) {
  // hooks
  const { data: currentWorkspace } = useWorkspaceDetails(workspaceSlug);
  const {
    currentSelectedNotificationId,
    setCurrentSelectedNotificationId,
    notificationLiteByNotificationId,
    notificationIdsByWorkspaceId,
    getNotifications,
  } = useWorkspaceNotifications();
  const { fetchUserProjectInfo } = useUserPermissions();
  const { isWorkItem, PeekOverviewComponent, setPeekWorkItem } = useNotificationPreview();
  // derived values
  const { workspace_slug, project_id, issue_id, is_inbox_issue } =
    notificationLiteByNotificationId(currentSelectedNotificationId);

  // fetching workspace work item properties
  useWorkspaceIssueProperties(workspaceSlug);

  // fetch workspace notifications
  const notificationMutation =
    currentWorkspace && notificationIdsByWorkspaceId(currentWorkspace.id)
      ? ENotificationLoader.MUTATION_LOADER
      : ENotificationLoader.INIT_LOADER;
  const notificationLoader =
    currentWorkspace && notificationIdsByWorkspaceId(currentWorkspace.id)
      ? ENotificationQueryParamType.CURRENT
      : ENotificationQueryParamType.INIT;
  useQuery({
    queryKey: queryKeys.notifications.all(currentWorkspace?.slug ?? ""),
    queryFn: () => getNotifications(currentWorkspace?.slug ?? "", notificationMutation, notificationLoader),
    enabled: !!currentWorkspace?.slug,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // fetching user project member info
  const { isPending: projectMemberInfoLoader } = useQuery({
    queryKey: ["PROJECT_MEMBER_PERMISSION_INFO", workspace_slug, project_id],
    queryFn: () => fetchUserProjectInfo(workspace_slug!, project_id!),
    enabled: !!(workspace_slug && project_id && is_inbox_issue),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const embedRemoveCurrentNotification = useCallback(
    () => setCurrentSelectedNotificationId(undefined),
    [setCurrentSelectedNotificationId]
  );

  // clearing up the selected notifications when unmounting the page
  useEffect(
    () => () => {
      setPeekWorkItem(undefined);
    },
    [setCurrentSelectedNotificationId, setPeekWorkItem]
  );

  return (
    <div className={cn("w-full h-full overflow-hidden ", isWorkItem && "overflow-y-auto")}>
      {!currentSelectedNotificationId ? (
        <div className="flex justify-center items-center size-full">
          <EmptyStateCompact assetKey="unknown" assetClassName="size-20" />
        </div>
      ) : (
        <>
          {is_inbox_issue === true && workspace_slug && project_id && issue_id ? (
            <>
              {projectMemberInfoLoader ? (
                <div className="w-full h-full flex justify-center items-center">
                  <LogoSpinner />
                </div>
              ) : (
                <InboxContentRoot
                  setIsMobileSidebar={() => {}}
                  isMobileSidebar={false}
                  workspaceSlug={workspace_slug}
                  projectId={project_id}
                  inboxIssueId={issue_id}
                  isNotificationEmbed
                  embedRemoveCurrentNotification={embedRemoveCurrentNotification}
                />
              )}
            </>
          ) : (
            <PeekOverviewComponent embedIssue embedRemoveCurrentNotification={embedRemoveCurrentNotification} />
          )}
        </>
      )}
    </div>
  );
}
