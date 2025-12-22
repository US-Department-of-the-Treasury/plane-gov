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
} from "./workspace";

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
