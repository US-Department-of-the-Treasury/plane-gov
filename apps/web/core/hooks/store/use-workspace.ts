"use client";

import { useParams } from "next/navigation";

/**
 * Workspace hooks using TanStack Query.
 * Migrated from MobX StoreContext.
 *
 * @see apps/web/core/store/queries/workspace.ts for hook implementations
 */

// Re-export all TanStack Query workspace hooks
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
  // Utility functions
  getWorkspaceBySlug,
  getWorkspaceById,
  getWorkspaceIds,
  getWorkspaceSlugs,
} from "@/store/queries/workspace";

import { useWorkspaceDetails as useWorkspaceDetailsQuery } from "@/store/queries/workspace";

/**
 * Backward-compatible hook that wraps TanStack Query workspace hooks.
 * Automatically gets workspaceSlug from URL params and returns current workspace.
 *
 * @example
 * const { currentWorkspace } = useWorkspace();
 *
 * @deprecated Prefer using useWorkspaceDetails(workspaceSlug) directly for explicit slug passing
 */
export function useWorkspace() {
  const params = useParams();
  const workspaceSlug = params?.workspaceSlug as string | undefined;

  const {
    data: currentWorkspace,
    isLoading,
    error,
  } = useWorkspaceDetailsQuery(workspaceSlug || "");

  return {
    currentWorkspace,
    isLoading,
    error,
  };
}
