// TanStack Query exports
export { QueryProvider } from "./query-provider";
export { createQueryClient, getQueryClient } from "./query-client";
export { queryKeys } from "./query-keys";
export type { QueryKeys } from "./query-keys";

// User hooks (TanStack Query)
export {
  useCurrentUser,
  useUpdateCurrentUser,
  useCurrentUserSettings,
  useCurrentUserProfile,
  useUpdateCurrentUserProfile,
  useFinishUserOnboarding,
  useSetPassword,
  useChangePassword,
  useDeactivateAccount,
  useUpdateTourCompleted,
} from "./user";

// State hooks (TanStack Query)
export {
  useProjectStates,
  useWorkspaceStates,
  useIntakeState,
  useCreateState,
  useUpdateState,
  useDeleteState,
  useMarkStateAsDefault,
  useMoveStatePosition,
  useGroupedProjectStates,
  groupStatesByGroup,
} from "./state";

// Label hooks (TanStack Query)
export {
  useProjectLabels,
  useWorkspaceLabels,
  useCreateLabel,
  useUpdateLabel,
  useUpdateLabelPosition,
  useDeleteLabel,
  useProjectLabelTree,
  buildLabelTree,
} from "./label";

// Member hooks (TanStack Query)
export {
  // Workspace members
  useWorkspaceMembers,
  useUpdateWorkspaceMember,
  useRemoveWorkspaceMember,
  // Workspace invitations
  useWorkspaceInvitations,
  useInviteWorkspaceMembers,
  useUpdateWorkspaceInvitation,
  useDeleteWorkspaceInvitation,
  // Project members
  useProjectMembers,
  useBulkAddProjectMembers,
  useUpdateProjectMemberRole,
  useRemoveProjectMember,
} from "./member";

// Sprint hooks (TanStack Query)
export {
  useProjectSprints,
  useWorkspaceSprints,
  useActiveSprint,
  useSprintDetails,
  useArchivedSprints,
  useSprintProgress,
  useCreateSprint,
  useUpdateSprint,
  useDeleteSprint,
  useArchiveSprint,
  useRestoreSprint,
  // Sprint member project assignments (source of truth for sprint visibility in projects)
  useSprintMemberProjects,
  useSetSprintMemberProject,
  useDeleteSprintMemberProject,
  getSprintMemberProjectAssignment,
  // Sprint materialization (for virtual sprints)
  useMaterializeSprint,
} from "./sprint";

// Epic hooks (TanStack Query)
export {
  useProjectEpics,
  useWorkspaceEpics,
  useEpicDetails,
  useArchivedEpics,
  useCreateEpic,
  useUpdateEpic,
  useDeleteEpic,
  useArchiveEpic,
  useRestoreEpic,
  useAddEpicToFavorites,
  useRemoveEpicFromFavorites,
  useCreateEpicLink,
  useUpdateEpicLink,
  useDeleteEpicLink,
  getEpicById,
  getEpicNameById,
  getEpicIds,
  getActiveEpics,
  getFavoriteEpics,
} from "./epic";

// Project hooks (TanStack Query)
export {
  usePartialProjects,
  useProjects,
  useProjectDetails,
  useProjectAnalyticsCount,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useArchiveProject,
  useRestoreProject,
  useUpdateProjectView,
  useCheckProjectIdentifier,
  getProjectById,
} from "./project";

// Workspace hooks (TanStack Query)
export {
  useWorkspaces,
  useWorkspaceDetails,
  useCreateWorkspace,
  useUpdateWorkspace,
  useDeleteWorkspace,
  useSidebarNavigationPreferences,
  useUpdateSidebarPreference,
  useUpdateBulkSidebarPreferences,
  useCheckWorkspaceSlug,
  useWorkspaceMemberMe,
  useUserWorkspaceInvitations,
  useJoinWorkspace,
  useLastActiveWorkspace,
  // Workspace Views (Global Views)
  useWorkspaceViews,
  useWorkspaceViewDetails,
  useCreateWorkspaceView,
  useUpdateWorkspaceView,
  useDeleteWorkspaceView,
  getWorkspaceViewById,
  getSearchedWorkspaceViews,
  // Utility functions
  getWorkspaceBySlug,
  getWorkspaceById,
  getWorkspaceIds,
  getWorkspaceSlugs,
} from "./workspace";

// API Token hooks (TanStack Query)
export { useApiTokens, useApiTokenDetails, useCreateApiToken, useDeleteApiToken, getApiTokenById } from "./api-token";

// Workspace Links hooks (TanStack Query - home quick links)
export {
  useWorkspaceLinks,
  useWorkspaceLinkDetails,
  useCreateWorkspaceLink,
  useUpdateWorkspaceLink,
  useDeleteWorkspaceLink,
  getWorkspaceLinkById,
} from "./workspace-links";

// Issue hooks (TanStack Query)
export {
  useIssue,
  useIssueByIdentifier,
  useIssues,
  useSprintIssues,
  useModuleIssues,
  useCreateIssue,
  useUpdateIssue,
  useDeleteIssue,
  useIssueActivities,
  useSubIssues,
  useAddSubIssues,
  useIssueLinks,
  useCreateIssueLink,
  useUpdateIssueLink,
  useDeleteIssueLink,
  useIssueSubscription,
  useToggleIssueSubscription,
  useBulkIssueOperations,
  useBulkDeleteIssues,
  useBulkArchiveIssues,
  useAddIssueToSprint,
  useRemoveIssueFromSprint,
} from "./issue";

// View hooks (TanStack Query)
export {
  useProjectViews,
  useViewDetails,
  useCreateView,
  useUpdateView,
  useDeleteView,
  useAddViewToFavorites,
  useRemoveViewFromFavorites,
  getViewById,
} from "./view";

// Estimate hooks (TanStack Query)
export {
  useWorkspaceEstimates,
  useProjectEstimates,
  useEstimateDetails,
  useCreateEstimate,
  useDeleteEstimate,
  useCreateEstimatePoint,
  useUpdateEstimatePoint,
  getEstimateById,
  getCurrentActiveEstimate,
  getCurrentActiveEstimateId,
  getArchivedEstimates,
  getArchivedEstimateIds,
  getEstimateIds,
  getEstimatePointById,
  getEstimatePointIds,
} from "./estimate";

// Webhook hooks (TanStack Query)
export {
  useWebhooks,
  useWebhookDetails,
  useCreateWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
  useRegenerateWebhookSecretKey,
  getWebhookById,
  getActiveWebhooks,
  getInactiveWebhooks,
  getWebhookIds,
} from "./webhook";

// Favorite hooks (TanStack Query)
export {
  useFavorites,
  useGroupedFavorites,
  useAddFavorite,
  useUpdateFavorite,
  useDeleteFavorite,
  useMoveFavoriteToFolder,
  useReorderFavorite,
  useRemoveFromFavoriteFolder,
  getFavoriteById,
  getFavoriteByEntityId,
  getFavoriteFolders,
  getFavoritesByWorkspace,
  groupFavorites,
} from "./favorite";

// Analytics hooks (TanStack Query)
export { useAdvanceAnalytics, useAdvanceAnalyticsStats, useAdvanceAnalyticsCharts } from "./analytics";

// Workspace draft hooks (TanStack Query)
export {
  useWorkspaceDraftIssues,
  useInfiniteWorkspaceDraftIssues,
  useWorkspaceDraftIssue,
  useCreateWorkspaceDraftIssue,
  useUpdateWorkspaceDraftIssue,
  useDeleteWorkspaceDraftIssue,
  useMoveWorkspaceDraftIssue,
} from "./workspace-draft";

// Inbox hooks (TanStack Query)
export {
  useInboxIssues,
  useInfiniteInboxIssues,
  useInboxIssue,
  useCreateInboxIssue,
  useUpdateInboxIssueStatus,
  useUpdateInboxIssueDuplicate,
  useUpdateInboxIssueSnooze,
  useUpdateInboxIssue,
  useUpdateProjectIssueFromInbox,
  useDeleteInboxIssue,
  getInboxIssueById,
  getInboxIssueIds,
} from "./inbox";

// Notification hooks (TanStack Query)
export {
  useUnreadNotificationsCount,
  useNotifications,
  useUpdateNotification,
  useMarkNotificationAsRead,
  useMarkNotificationAsUnread,
  useArchiveNotification,
  useUnarchiveNotification,
  useSnoozeNotification,
  useUnsnoozeNotification,
  useMarkAllNotificationsAsRead,
  getNotificationById,
  filterNotificationsByReadStatus,
  filterNotificationsByArchivedStatus,
} from "./notification";

// Instance hooks (TanStack Query)
export { useInstanceInfo, getInstanceConfig, getInstance, isInstanceConfigured } from "./instance";

// Dashboard hooks (TanStack Query)
export {
  useHomeDashboardWidgets,
  useWidgetStats,
  useUpdateDashboardWidget,
  useUpdateDashboardWidgetFilters,
  getWidgetDetails,
  getWidgets,
  getDashboardId,
} from "./dashboard";

// Home hooks (TanStack Query)
export {
  useHomeWidgets,
  useToggleWidget,
  useReorderWidget,
  isAnyWidgetEnabled,
  getOrderedWidgets,
  getWidgetByKey,
  buildWidgetsMap,
} from "./home";

// Project publish hooks (TanStack Query)
export {
  useProjectPublishSettings,
  usePublishProject,
  useUpdatePublishSettings,
  useUnpublishProject,
  getPublishSettingsByProjectId,
} from "./project-publish";

// Wiki hooks (TanStack Query)
export {
  // Wiki pages
  useWikiPages,
  useProjectWikiPages,
  useArchivedWikiPages,
  useSharedWikiPages,
  usePrivateWikiPages,
  useWikiPageDetails,
  useSearchWikiPages,
  useCreateWikiPage,
  useUpdateWikiPage,
  useDeleteWikiPage,
  useArchiveWikiPage,
  useUnarchiveWikiPage,
  useLockWikiPage,
  useUnlockWikiPage,
  useDuplicateWikiPage,
  useUpdateWikiPageDescription,
  // Wiki collections
  useWikiCollections,
  useWikiCollectionDetails,
  useCreateWikiCollection,
  useUpdateWikiCollection,
  useDeleteWikiCollection,
  // Wiki shares
  useWikiPageShares,
  useCreateWikiPageShare,
  useUpdateWikiPageShare,
  useDeleteWikiPageShare,
  // Wiki versions
  useWikiPageVersions,
  useWikiPageVersionDetails,
  useRestoreWikiPageVersion,
  // Utility functions
  getWikiPageById,
  getWikiCollectionById,
  getWikiPagesByCollection,
  getRootWikiPages,
  getChildWikiPages,
  buildWikiPageTree,
  buildWikiCollectionTree,
} from "./wiki";
export type { TWikiPageTreeNode, TWikiCollectionTreeNode } from "./wiki";

// Paginated issues hooks (TanStack Query with useInfiniteQuery)
export {
  useProjectIssuesPaginated,
  useSprintIssuesPaginated,
  useEpicIssuesPaginated,
  useArchivedIssuesPaginated,
  useProfileIssuesPaginated,
  useProjectViewIssuesPaginated,
  useWorkspaceViewIssuesPaginated,
  // Helpers
  extractIssuesFromPages,
  extractGroupedIssueIds,
} from "./issues-paginated";
export type {
  UseIssuesPaginatedOptions,
  UseSprintIssuesPaginatedOptions,
  UseEpicIssuesPaginatedOptions,
  UseProfileIssuesPaginatedOptions,
  UseProjectViewIssuesPaginatedOptions,
  UseWorkspaceViewIssuesPaginatedOptions,
  IssuesQueryParams,
} from "./issues-paginated";
