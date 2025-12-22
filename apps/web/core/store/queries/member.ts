"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { IWorkspaceMember, TProjectMembership, IWorkspaceMemberInvitation, EUserPermissions } from "@plane/types";
import { WorkspaceService } from "@/services/workspace.service";
import { ProjectMemberService } from "@/services/project/project-member.service";
import { queryKeys } from "./query-keys";

// Service instances
const workspaceService = new WorkspaceService();
const projectMemberService = new ProjectMemberService();

// ===========================
// WORKSPACE MEMBER HOOKS
// ===========================

/**
 * Hook to fetch workspace members.
 * Replaces MobX WorkspaceMemberStore.fetchWorkspaceMembers for read operations.
 *
 * @example
 * const { data: members, isLoading } = useWorkspaceMembers(workspaceSlug);
 */
export function useWorkspaceMembers(workspaceSlug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.members.workspace(workspaceSlug ?? ""),
    queryFn: () => workspaceService.fetchWorkspaceMembers(workspaceSlug!),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

interface UpdateWorkspaceMemberParams {
  workspaceSlug: string;
  memberId: string;
  data: { role: EUserPermissions };
}

/**
 * Hook to update a workspace member's role with optimistic updates.
 * Replaces MobX WorkspaceMemberStore.updateMember for write operations.
 *
 * @example
 * const { mutate: updateMember, isPending } = useUpdateWorkspaceMember();
 * updateMember({ workspaceSlug, memberId, data: { role: EUserPermissions.MEMBER } });
 */
export function useUpdateWorkspaceMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, memberId, data }: UpdateWorkspaceMemberParams) =>
      workspaceService.updateWorkspaceMember(workspaceSlug, memberId, data),
    onMutate: async ({ workspaceSlug, memberId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.members.workspace(workspaceSlug) });

      const previousMembers = queryClient.getQueryData<IWorkspaceMember[]>(queryKeys.members.workspace(workspaceSlug));

      if (previousMembers) {
        queryClient.setQueryData<IWorkspaceMember[]>(
          queryKeys.members.workspace(workspaceSlug),
          previousMembers.map((member) => (member.id === memberId ? { ...member, role: data.role } : member))
        );
      }

      return { previousMembers, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousMembers && context.workspaceSlug) {
        queryClient.setQueryData(queryKeys.members.workspace(context.workspaceSlug), context.previousMembers);
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.workspace(workspaceSlug) });
    },
  });
}

interface RemoveWorkspaceMemberParams {
  workspaceSlug: string;
  memberId: string;
}

/**
 * Hook to remove a workspace member with optimistic updates.
 * Replaces MobX WorkspaceMemberStore.removeMemberFromWorkspace for write operations.
 *
 * @example
 * const { mutate: removeMember, isPending } = useRemoveWorkspaceMember();
 * removeMember({ workspaceSlug, memberId });
 */
export function useRemoveWorkspaceMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, memberId }: RemoveWorkspaceMemberParams) =>
      workspaceService.deleteWorkspaceMember(workspaceSlug, memberId),
    onMutate: async ({ workspaceSlug, memberId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.members.workspace(workspaceSlug) });

      const previousMembers = queryClient.getQueryData<IWorkspaceMember[]>(queryKeys.members.workspace(workspaceSlug));

      if (previousMembers) {
        queryClient.setQueryData<IWorkspaceMember[]>(
          queryKeys.members.workspace(workspaceSlug),
          previousMembers.filter((member) => member.id !== memberId)
        );
      }

      return { previousMembers, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousMembers && context.workspaceSlug) {
        queryClient.setQueryData(queryKeys.members.workspace(context.workspaceSlug), context.previousMembers);
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.workspace(workspaceSlug) });
    },
  });
}

// ===========================
// WORKSPACE INVITATION HOOKS
// ===========================

/**
 * Hook to fetch workspace member invitations.
 * Replaces MobX WorkspaceMemberStore.fetchWorkspaceMemberInvitations for read operations.
 *
 * @example
 * const { data: invitations, isLoading } = useWorkspaceInvitations(workspaceSlug);
 */
export function useWorkspaceInvitations(workspaceSlug: string) {
  return useQuery({
    queryKey: [...queryKeys.members.workspace(workspaceSlug), "invitations"],
    queryFn: () => workspaceService.workspaceInvitations(workspaceSlug),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface InviteMembersParams {
  workspaceSlug: string;
  data: { emails: { email: string; role: EUserPermissions }[] };
}

/**
 * Hook to invite members to a workspace.
 * Replaces MobX WorkspaceMemberStore.inviteMembersToWorkspace for write operations.
 *
 * @example
 * const { mutate: inviteMembers, isPending } = useInviteWorkspaceMembers();
 * inviteMembers({ workspaceSlug, data: { emails: [{ email: "user@example.com", role: EUserPermissions.MEMBER }] } });
 */
export function useInviteWorkspaceMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, data }: InviteMembersParams) => workspaceService.inviteWorkspace(workspaceSlug, data),
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.members.workspace(workspaceSlug), "invitations"] });
    },
  });
}

interface UpdateInvitationParams {
  workspaceSlug: string;
  invitationId: string;
  data: Partial<IWorkspaceMemberInvitation>;
}

/**
 * Hook to update a workspace invitation with optimistic updates.
 * Replaces MobX WorkspaceMemberStore.updateMemberInvitation for write operations.
 *
 * @example
 * const { mutate: updateInvitation, isPending } = useUpdateWorkspaceInvitation();
 * updateInvitation({ workspaceSlug, invitationId, data: { role: EUserPermissions.ADMIN } });
 */
export function useUpdateWorkspaceInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, invitationId, data }: UpdateInvitationParams) =>
      workspaceService.updateWorkspaceInvitation(workspaceSlug, invitationId, data),
    onMutate: async ({ workspaceSlug, invitationId, data }) => {
      const queryKey = [...queryKeys.members.workspace(workspaceSlug), "invitations"];
      await queryClient.cancelQueries({ queryKey });

      const previousInvitations = queryClient.getQueryData<IWorkspaceMemberInvitation[]>(queryKey);

      if (previousInvitations) {
        queryClient.setQueryData<IWorkspaceMemberInvitation[]>(
          queryKey,
          previousInvitations.map((inv) => (inv.id === invitationId ? { ...inv, ...data } : inv))
        );
      }

      return { previousInvitations, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousInvitations && context.workspaceSlug) {
        const queryKey = [...queryKeys.members.workspace(context.workspaceSlug), "invitations"];
        queryClient.setQueryData(queryKey, context.previousInvitations);
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.members.workspace(workspaceSlug), "invitations"] });
    },
  });
}

interface DeleteInvitationParams {
  workspaceSlug: string;
  invitationId: string;
}

/**
 * Hook to delete a workspace invitation with optimistic updates.
 * Replaces MobX WorkspaceMemberStore.deleteMemberInvitation for write operations.
 *
 * @example
 * const { mutate: deleteInvitation, isPending } = useDeleteWorkspaceInvitation();
 * deleteInvitation({ workspaceSlug, invitationId });
 */
export function useDeleteWorkspaceInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, invitationId }: DeleteInvitationParams) =>
      workspaceService.deleteWorkspaceInvitations(workspaceSlug, invitationId),
    onMutate: async ({ workspaceSlug, invitationId }) => {
      const queryKey = [...queryKeys.members.workspace(workspaceSlug), "invitations"];
      await queryClient.cancelQueries({ queryKey });

      const previousInvitations = queryClient.getQueryData<IWorkspaceMemberInvitation[]>(queryKey);

      if (previousInvitations) {
        queryClient.setQueryData<IWorkspaceMemberInvitation[]>(
          queryKey,
          previousInvitations.filter((inv) => inv.id !== invitationId)
        );
      }

      return { previousInvitations, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousInvitations && context.workspaceSlug) {
        const queryKey = [...queryKeys.members.workspace(context.workspaceSlug), "invitations"];
        queryClient.setQueryData(queryKey, context.previousInvitations);
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.members.workspace(workspaceSlug), "invitations"] });
    },
  });
}

// ===========================
// PROJECT MEMBER HOOKS
// ===========================

/**
 * Hook to fetch project members.
 * Replaces MobX BaseProjectMemberStore.fetchProjectMembers for read operations.
 *
 * @example
 * const { data: members, isLoading } = useProjectMembers(workspaceSlug, projectId);
 */
export function useProjectMembers(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: queryKeys.members.project(projectId),
    queryFn: () => projectMemberService.fetchProjectMembers(workspaceSlug, projectId),
    enabled: !!workspaceSlug && !!projectId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface BulkAddMembersParams {
  workspaceSlug: string;
  projectId: string;
  data: { members: { member_id: string; role: number }[] };
}

/**
 * Hook to bulk add members to a project.
 * Replaces MobX BaseProjectMemberStore.bulkAddMembersToProject for write operations.
 *
 * @example
 * const { mutate: bulkAdd, isPending } = useBulkAddProjectMembers();
 * bulkAdd({ workspaceSlug, projectId, data: { members: [{ member_id: "user-1", role: 15 }] } });
 */
export function useBulkAddProjectMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, data }: BulkAddMembersParams) =>
      projectMemberService.bulkAddMembersToProject(workspaceSlug, projectId, data),
    onSettled: (_data, _error, { projectId, workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.project(projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.workspace(workspaceSlug) });
    },
  });
}

interface UpdateProjectMemberRoleParams {
  workspaceSlug: string;
  projectId: string;
  memberId: string;
  role: number;
}

/**
 * Hook to update a project member's role with optimistic updates.
 * Replaces MobX BaseProjectMemberStore.updateMemberRole for write operations.
 *
 * @example
 * const { mutate: updateRole, isPending } = useUpdateProjectMemberRole();
 * updateRole({ workspaceSlug, projectId, memberId, role: 15 });
 */
export function useUpdateProjectMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, memberId, role }: UpdateProjectMemberRoleParams) =>
      projectMemberService.updateProjectMember(workspaceSlug, projectId, memberId, { role }),
    onMutate: async ({ projectId, memberId, role }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.members.project(projectId) });

      const previousMembers = queryClient.getQueryData<TProjectMembership[]>(queryKeys.members.project(projectId));

      if (previousMembers) {
        queryClient.setQueryData<TProjectMembership[]>(
          queryKeys.members.project(projectId),
          previousMembers.map((member) =>
            member.id === memberId ? { ...member, role, original_role: role } : member
          ) as TProjectMembership[]
        );
      }

      return { previousMembers, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousMembers && context.projectId) {
        queryClient.setQueryData(queryKeys.members.project(context.projectId), context.previousMembers);
      }
    },
    onSettled: (_data, _error, { projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.project(projectId) });
    },
  });
}

interface RemoveProjectMemberParams {
  workspaceSlug: string;
  projectId: string;
  memberId: string;
}

/**
 * Hook to remove a member from a project with optimistic updates.
 * Replaces MobX BaseProjectMemberStore.removeMemberFromProject for write operations.
 *
 * @example
 * const { mutate: removeMember, isPending } = useRemoveProjectMember();
 * removeMember({ workspaceSlug, projectId, memberId });
 */
export function useRemoveProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, memberId }: RemoveProjectMemberParams) =>
      projectMemberService.deleteProjectMember(workspaceSlug, projectId, memberId),
    onMutate: async ({ projectId, memberId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.members.project(projectId) });

      const previousMembers = queryClient.getQueryData<TProjectMembership[]>(queryKeys.members.project(projectId));

      if (previousMembers) {
        queryClient.setQueryData<TProjectMembership[]>(
          queryKeys.members.project(projectId),
          previousMembers.filter((member) => member.id !== memberId)
        );
      }

      return { previousMembers, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousMembers && context.projectId) {
        queryClient.setQueryData(queryKeys.members.project(context.projectId), context.previousMembers);
      }
    },
    onSettled: (_data, _error, { projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.project(projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

// ===========================
// UTILITY FUNCTIONS
// ===========================

/**
 * Get workspace member by member ID.
 *
 * @example
 * const { data: members } = useWorkspaceMembers(workspaceSlug);
 * const member = getWorkspaceMemberById(members, memberId);
 */
export function getWorkspaceMemberById(
  members: IWorkspaceMember[] | undefined,
  memberId: string | null | undefined
): IWorkspaceMember | undefined {
  if (!members || !memberId) return undefined;
  return members.find((m) => m.id === memberId);
}

/**
 * Get workspace member by user ID (member.member.id).
 *
 * @example
 * const { data: members } = useWorkspaceMembers(workspaceSlug);
 * const member = getWorkspaceMemberByUserId(members, userId);
 */
export function getWorkspaceMemberByUserId(
  members: IWorkspaceMember[] | undefined,
  userId: string | null | undefined
): IWorkspaceMember | undefined {
  if (!members || !userId) return undefined;
  return members.find((m) => m.member?.id === userId);
}

/**
 * Get workspace member IDs.
 *
 * @example
 * const { data: members } = useWorkspaceMembers(workspaceSlug);
 * const memberIds = getWorkspaceMemberIds(members);
 */
export function getWorkspaceMemberIds(members: IWorkspaceMember[] | undefined): string[] {
  if (!members) return [];
  return members.map((m) => m.id);
}

/**
 * Get user IDs from workspace members.
 *
 * @example
 * const { data: members } = useWorkspaceMembers(workspaceSlug);
 * const userIds = getWorkspaceUserIds(members);
 */
export function getWorkspaceUserIds(members: IWorkspaceMember[] | undefined): string[] {
  if (!members) return [];
  return members.map((m) => m.member?.id).filter((id): id is string => !!id);
}

/**
 * Get project member by member ID.
 *
 * @example
 * const { data: members } = useProjectMembers(workspaceSlug, projectId);
 * const member = getProjectMemberById(members, memberId);
 */
export function getProjectMemberById(
  members: TProjectMembership[] | undefined,
  memberId: string | null | undefined
): TProjectMembership | undefined {
  if (!members || !memberId) return undefined;
  return members.find((m) => m.id === memberId);
}

/**
 * Get project member by user ID (member.member.id).
 *
 * @example
 * const { data: members } = useProjectMembers(workspaceSlug, projectId);
 * const member = getProjectMemberByUserId(members, userId);
 */
export function getProjectMemberByUserId(
  members: TProjectMembership[] | undefined,
  userId: string | null | undefined
): TProjectMembership | undefined {
  if (!members || !userId) return undefined;
  // TProjectMembership.member is a string (user ID)
  return members.find((m) => m.member === userId);
}

/**
 * Get project member IDs.
 *
 * @example
 * const { data: members } = useProjectMembers(workspaceSlug, projectId);
 * const memberIds = getProjectMemberIds(members);
 */
export function getProjectMemberIds(members: TProjectMembership[] | undefined): string[] {
  if (!members) return [];
  return members.map((m) => m.id).filter((id): id is string => id !== null);
}

/**
 * Get user IDs from project members.
 *
 * @example
 * const { data: members } = useProjectMembers(workspaceSlug, projectId);
 * const userIds = getProjectUserIds(members);
 */
export function getProjectUserIds(members: TProjectMembership[] | undefined): string[] {
  if (!members) return [];
  // TProjectMembership.member is a string (user ID), not an object
  return members.filter((m) => m.member && typeof m.member === "string").map((m) => m.member as string);
}

/**
 * Get member display name (falls back to email).
 *
 * @example
 * const displayName = getMemberDisplayName(member);
 */
export function getMemberDisplayName(member: IWorkspaceMember | TProjectMembership | undefined): string {
  if (!member?.member) return "";
  // TProjectMembership has member as string (user ID), IWorkspaceMember has member as IUserLite
  if (typeof member.member === "string") return member.member;
  return member.member.display_name || member.member.email || "";
}

/**
 * Get workspace members map keyed by user ID for fast lookups.
 *
 * @example
 * const { data: members } = useWorkspaceMembers(workspaceSlug);
 * const memberMap = getWorkspaceMembersMap(members);
 * const user = memberMap.get(userId);
 */
export function getWorkspaceMembersMap(members: IWorkspaceMember[] | undefined): Map<string, IWorkspaceMember> {
  const map = new Map<string, IWorkspaceMember>();
  if (!members) return map;
  members.forEach((m) => {
    if (m.member?.id) {
      map.set(m.member.id, m);
    }
  });
  return map;
}

/**
 * Get project members map keyed by user ID for fast lookups.
 *
 * @example
 * const { data: members } = useProjectMembers(workspaceSlug, projectId);
 * const memberMap = getProjectMembersMap(members);
 * const user = memberMap.get(userId);
 */
export function getProjectMembersMap(members: TProjectMembership[] | undefined): Map<string, TProjectMembership> {
  const map = new Map<string, TProjectMembership>();
  if (!members) return map;
  members.forEach((m) => {
    // TProjectMembership.member is a string (user ID)
    if (m.member && typeof m.member === "string") {
      map.set(m.member, m);
    }
  });
  return map;
}

// ===========================
// DEV/TESTING HOOKS
// ===========================

interface GenerateFakeMembersParams {
  workspaceSlug: string;
  count: number;
}

interface GenerateFakeMembersResponse {
  message: string;
  users: { id: string; email: string; display_name: string; }[];
}

/**
 * Hook to generate fake workspace members for development/testing.
 * Only works when DEBUG mode is enabled on the backend.
 *
 * @example
 * const { mutate: generateFakeMembers, isPending } = useGenerateFakeMembers();
 * generateFakeMembers({ workspaceSlug, count: 5 });
 */
export function useGenerateFakeMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, count }: GenerateFakeMembersParams) =>
      workspaceService.generateFakeMembers(workspaceSlug, count),
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.workspace(workspaceSlug) });
    },
  });
}
