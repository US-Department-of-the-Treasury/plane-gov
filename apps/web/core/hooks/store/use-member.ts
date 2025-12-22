"use client";

import { useCallback, useMemo, useState } from "react";
import type { IWorkspaceMember, TProjectMembership, IProjectMemberNavigationPreferences } from "@plane/types";
import { useQueryClient } from "@tanstack/react-query";
import { useRouterParams } from "./use-router-params";
import { queryKeys } from "@/store/queries/query-keys";
import { ProjectMemberService } from "@/services/project";

/**
 * Member hooks using TanStack Query.
 * Migrated from MobX StoreContext.
 *
 * @see apps/web/core/store/queries/member.ts for hook implementations
 */

// Re-export all TanStack Query member hooks
export {
  // Workspace member hooks
  useWorkspaceMembers,
  useUpdateWorkspaceMember,
  useRemoveWorkspaceMember,
  // Workspace invitation hooks
  useWorkspaceInvitations,
  useInviteWorkspaceMembers,
  useUpdateWorkspaceInvitation,
  useDeleteWorkspaceInvitation,
  // Project member hooks
  useProjectMembers,
  useBulkAddProjectMembers,
  useUpdateProjectMemberRole,
  useRemoveProjectMember,
  // Utility functions
  getWorkspaceMemberById,
  getWorkspaceMemberByUserId,
  getWorkspaceMemberIds,
  getWorkspaceUserIds,
  getProjectMemberById,
  getProjectMemberByUserId,
  getProjectMemberIds,
  getProjectUserIds,
  getMemberDisplayName,
  getWorkspaceMembersMap,
  getProjectMembersMap,
  // Dev/testing hooks
  useGenerateFakeMembers,
} from "@/store/queries/member";

import {
  useWorkspaceMembers,
  useProjectMembers,
  getWorkspaceMemberById,
  getWorkspaceMemberByUserId,
  getProjectMemberById,
  getProjectMemberByUserId,
  getMemberDisplayName,
  getWorkspaceMembersMap,
  getProjectMembersMap,
} from "@/store/queries/member";
import type { IMemberFilters } from "@/store/member/utils";

// Singleton filter stores (matching old MobX behavior with in-memory state)
const workspaceFiltersState: { filters: IMemberFilters } = { filters: {} };
const projectFiltersState: Record<string, IMemberFilters> = {};

const projectMemberService = new ProjectMemberService();

/**
 * Backward-compatible hook that mimics the old MobX MemberStore API.
 * Uses TanStack Query hooks internally but provides the same interface.
 *
 * @deprecated Prefer using individual hooks (useWorkspaceMembers, useProjectMembers) directly.
 * This hook exists for backward compatibility during migration.
 *
 * @example
 * const { workspaceMembers, projectMembers, getUserDetails } = useMember();
 */
export function useMember() {
  const { workspaceSlug = "", projectId = "" } = useRouterParams();
  const queryClient = useQueryClient();

  // Fetch members using TanStack Query hooks
  const { data: workspaceMembers } = useWorkspaceMembers(workspaceSlug);
  const { data: projectMembers } = useProjectMembers(workspaceSlug, projectId);

  // State for re-rendering when filters change
  const [, setFilterVersion] = useState(0);
  const forceUpdate = useCallback(() => setFilterVersion((v) => v + 1), []);

  // Helper function to get user details by user ID
  const getUserDetails = useCallback(
    (userId: string | null | undefined) => {
      const workspaceMember = getWorkspaceMemberByUserId(workspaceMembers, userId);
      if (workspaceMember?.member) {
        return {
          id: workspaceMember.member.id,
          display_name: workspaceMember.member.display_name || workspaceMember.member.email || "",
          email: workspaceMember.member.email,
          first_name: workspaceMember.member.first_name,
          last_name: workspaceMember.member.last_name,
          avatar_url: workspaceMember.member.avatar_url,
        };
      }
      return undefined;
    },
    [workspaceMembers]
  );

  // Helper function to get member by ID (works for both workspace and project members)
  const getMemberById = useCallback(
    (memberId: string | null | undefined): IWorkspaceMember | TProjectMembership | undefined => {
      const workspaceMember = getWorkspaceMemberById(workspaceMembers, memberId);
      if (workspaceMember) return workspaceMember;

      const projectMember = getProjectMemberById(projectMembers, memberId);
      return projectMember;
    },
    [workspaceMembers, projectMembers]
  );

  // Create workspace members map for fast lookups
  const workspaceMembersMap = useMemo(() => getWorkspaceMembersMap(workspaceMembers), [workspaceMembers]);

  // Create project members map for fast lookups
  const projectMembersMap = useMemo(() => getProjectMembersMap(projectMembers), [projectMembers]);

  // Project member methods
  const fetchProjectMembers = useCallback(
    async (workspaceSlug: string, projectId: string) => {
      // Trigger fetch if not in cache
      await queryClient.fetchQuery({
        queryKey: queryKeys.members.project(projectId),
        queryFn: () => projectMemberService.fetchProjectMembers(workspaceSlug, projectId),
      });
    },
    [queryClient]
  );

  const getProjectMemberPreferences = useCallback(
    (projectId: string): IProjectMemberNavigationPreferences | null => {
      // Get from query cache
      const preferences = queryClient.getQueryData<IProjectMemberNavigationPreferences>([
        ...queryKeys.members.project(projectId),
        "preferences",
      ]);
      return preferences || null;
    },
    [queryClient]
  );

  const updateProjectMemberPreferences = useCallback(
    async (
      workspaceSlug: string,
      projectId: string,
      memberId: string,
      preferences: IProjectMemberNavigationPreferences
    ) => {
      // Optimistically update cache
      const previousPreferences = queryClient.getQueryData<IProjectMemberNavigationPreferences>([
        ...queryKeys.members.project(projectId),
        "preferences",
      ]);

      queryClient.setQueryData([...queryKeys.members.project(projectId), "preferences"], preferences);

      try {
        await projectMemberService.updateProjectMemberPreferences(workspaceSlug, projectId, memberId, {
          navigation: preferences,
        });
      } catch (error) {
        // Revert on error
        if (previousPreferences) {
          queryClient.setQueryData([...queryKeys.members.project(projectId), "preferences"], previousPreferences);
        } else {
          queryClient.removeQueries({ queryKey: [...queryKeys.members.project(projectId), "preferences"] });
        }
        throw error;
      }
    },
    [queryClient]
  );

  // Workspace filters API
  const workspace = useMemo(
    () => ({
      filtersStore: {
        get filters() {
          return workspaceFiltersState.filters;
        },
        updateFilters: (filters: Partial<IMemberFilters>) => {
          workspaceFiltersState.filters = { ...workspaceFiltersState.filters, ...filters };
          forceUpdate();
        },
      },
    }),
    [forceUpdate]
  );

  // Project filters API
  const project = useMemo(
    () => ({
      fetchProjectMembers,
      getProjectMemberPreferences,
      updateProjectMemberPreferences,
      filters: {
        getFilters: (projectId: string): IMemberFilters => {
          return projectFiltersState[projectId] || {};
        },
        updateFilters: (projectId: string, filters: Partial<IMemberFilters>) => {
          const current = projectFiltersState[projectId] || {};
          projectFiltersState[projectId] = { ...current, ...filters };
          forceUpdate();
        },
      },
    }),
    [fetchProjectMembers, getProjectMemberPreferences, updateProjectMemberPreferences, forceUpdate]
  );

  return {
    // Member data
    workspaceMembers: workspaceMembers ?? [],
    projectMembers: projectMembers ?? [],
    workspaceMembersMap,
    projectMembersMap,

    // Helper functions
    getUserDetails,
    getMemberById,
    getMemberDisplayName,

    // Legacy API for backward compatibility
    workspace,
    project,
  };
}
