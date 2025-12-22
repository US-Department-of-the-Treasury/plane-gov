"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { IWorkspace, IWorkspaceSidebarNavigationItem, IWorkspaceSidebarNavigation } from "@plane/types";
import { WorkspaceService } from "@/services/workspace.service";
import { queryKeys } from "./query-keys";

// Service instance
const workspaceService = new WorkspaceService();

/**
 * Hook to fetch all workspaces for the current user.
 * Replaces MobX BaseWorkspaceRootStore.fetchWorkspaces for read operations.
 *
 * @example
 * const { data: workspaces, isLoading } = useWorkspaces();
 */
export function useWorkspaces() {
  return useQuery({
    queryKey: queryKeys.workspaces.all(),
    queryFn: () => workspaceService.userWorkspaces(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch workspace details by slug.
 *
 * @example
 * const { data: workspace, isLoading } = useWorkspaceDetails(workspaceSlug);
 */
export function useWorkspaceDetails(workspaceSlug: string) {
  return useQuery({
    queryKey: queryKeys.workspaces.detail(workspaceSlug),
    queryFn: () => workspaceService.getWorkspace(workspaceSlug),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface CreateWorkspaceParams {
  data: Partial<IWorkspace>;
}

/**
 * Hook to create a new workspace with optimistic updates.
 * Replaces MobX BaseWorkspaceRootStore.createWorkspace for write operations.
 *
 * @example
 * const { mutate: createWorkspace, isPending } = useCreateWorkspace();
 * createWorkspace({ data: { name: "My Workspace", slug: "my-workspace" } });
 */
export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data }: CreateWorkspaceParams) => workspaceService.createWorkspace(data),
    onMutate: async ({ data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.workspaces.all() });

      const previousWorkspaces = queryClient.getQueryData<IWorkspace[]>(queryKeys.workspaces.all());

      // Optimistic update with temporary ID
      if (previousWorkspaces) {
        const optimisticWorkspace = {
          id: `temp-${Date.now()}`,
          name: data.name ?? "",
          slug: data.slug ?? "",
          url: data.slug ?? "",
          logo_url: data.logo_url ?? null,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: "",
          updated_by: "",
          owner: {} as IWorkspace["owner"],
          total_members: 1,
          organization_size: data.organization_size ?? "",
          role: 20, // Admin role
          timezone: "UTC",
        } as IWorkspace;
        queryClient.setQueryData<IWorkspace[]>(queryKeys.workspaces.all(), [
          ...previousWorkspaces,
          optimisticWorkspace,
        ]);
      }

      return { previousWorkspaces };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousWorkspaces) {
        queryClient.setQueryData(queryKeys.workspaces.all(), context.previousWorkspaces);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all() });
    },
  });
}

interface UpdateWorkspaceParams {
  workspaceSlug: string;
  data: Partial<IWorkspace>;
}

/**
 * Hook to update a workspace with optimistic updates.
 * Replaces MobX BaseWorkspaceRootStore.updateWorkspace for write operations.
 *
 * @example
 * const { mutate: updateWorkspace, isPending } = useUpdateWorkspace();
 * updateWorkspace({ workspaceSlug, data: { name: "Updated Name" } });
 */
export function useUpdateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, data }: UpdateWorkspaceParams) =>
      workspaceService.updateWorkspace(workspaceSlug, data),
    onMutate: async ({ workspaceSlug, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.workspaces.all() });
      await queryClient.cancelQueries({ queryKey: queryKeys.workspaces.detail(workspaceSlug) });

      const previousWorkspaces = queryClient.getQueryData<IWorkspace[]>(queryKeys.workspaces.all());
      const previousWorkspaceDetail = queryClient.getQueryData<IWorkspace>(queryKeys.workspaces.detail(workspaceSlug));

      if (previousWorkspaces) {
        queryClient.setQueryData<IWorkspace[]>(
          queryKeys.workspaces.all(),
          previousWorkspaces.map((ws) => (ws.slug === workspaceSlug ? { ...ws, ...data } : ws))
        );
      }

      if (previousWorkspaceDetail) {
        queryClient.setQueryData<IWorkspace>(queryKeys.workspaces.detail(workspaceSlug), {
          ...previousWorkspaceDetail,
          ...data,
        });
      }

      return { previousWorkspaces, previousWorkspaceDetail, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        if (context.previousWorkspaces) {
          queryClient.setQueryData(queryKeys.workspaces.all(), context.previousWorkspaces);
        }
        if (context.previousWorkspaceDetail) {
          queryClient.setQueryData(queryKeys.workspaces.detail(context.workspaceSlug), context.previousWorkspaceDetail);
        }
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.detail(workspaceSlug) });
    },
  });
}

interface DeleteWorkspaceParams {
  workspaceSlug: string;
}

/**
 * Hook to delete a workspace with optimistic updates.
 * Replaces MobX BaseWorkspaceRootStore.deleteWorkspace for write operations.
 *
 * @example
 * const { mutate: deleteWorkspace, isPending } = useDeleteWorkspace();
 * deleteWorkspace({ workspaceSlug });
 */
export function useDeleteWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug }: DeleteWorkspaceParams) => workspaceService.deleteWorkspace(workspaceSlug),
    onMutate: async ({ workspaceSlug }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.workspaces.all() });

      const previousWorkspaces = queryClient.getQueryData<IWorkspace[]>(queryKeys.workspaces.all());

      if (previousWorkspaces) {
        queryClient.setQueryData<IWorkspace[]>(
          queryKeys.workspaces.all(),
          previousWorkspaces.filter((ws) => ws.slug !== workspaceSlug)
        );
      }

      return { previousWorkspaces };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousWorkspaces) {
        queryClient.setQueryData(queryKeys.workspaces.all(), context.previousWorkspaces);
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all() });
      void queryClient.removeQueries({ queryKey: queryKeys.workspaces.detail(workspaceSlug) });
    },
  });
}

/**
 * Hook to fetch sidebar navigation preferences for a workspace.
 * Replaces MobX BaseWorkspaceRootStore.fetchSidebarNavigationPreferences for read operations.
 *
 * @example
 * const { data: prefs, isLoading } = useSidebarNavigationPreferences(workspaceSlug);
 */
export function useSidebarNavigationPreferences(workspaceSlug: string) {
  return useQuery({
    queryKey: [...queryKeys.workspaces.detail(workspaceSlug), "sidebar-preferences"],
    queryFn: () => workspaceService.fetchSidebarNavigationPreferences(workspaceSlug),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface UpdateSidebarPreferenceParams {
  workspaceSlug: string;
  key: string;
  data: Partial<IWorkspaceSidebarNavigationItem>;
}

/**
 * Hook to update a single sidebar preference with optimistic updates.
 * Replaces MobX BaseWorkspaceRootStore.updateSidebarPreference for write operations.
 *
 * @example
 * const { mutate: updatePreference, isPending } = useUpdateSidebarPreference();
 * updatePreference({ workspaceSlug, key: "projects", data: { is_pinned: true } });
 */
export function useUpdateSidebarPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, key, data }: UpdateSidebarPreferenceParams) =>
      workspaceService.updateSidebarPreference(workspaceSlug, key, data),
    onMutate: async ({ workspaceSlug, key, data }) => {
      const queryKey = [...queryKeys.workspaces.detail(workspaceSlug), "sidebar-preferences"];
      await queryClient.cancelQueries({ queryKey });

      const previousPreferences = queryClient.getQueryData<IWorkspaceSidebarNavigation>(queryKey);

      if (previousPreferences) {
        queryClient.setQueryData<IWorkspaceSidebarNavigation>(queryKey, {
          ...previousPreferences,
          [key]: {
            ...previousPreferences[key],
            ...data,
          },
        });
      }

      return { previousPreferences, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousPreferences && context.workspaceSlug) {
        const queryKey = [...queryKeys.workspaces.detail(context.workspaceSlug), "sidebar-preferences"];
        queryClient.setQueryData(queryKey, context.previousPreferences);
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.workspaces.detail(workspaceSlug), "sidebar-preferences"],
      });
    },
  });
}

interface UpdateBulkSidebarPreferencesParams {
  workspaceSlug: string;
  data: Array<{ key: string; is_pinned: boolean; sort_order: number }>;
}

/**
 * Hook to update multiple sidebar preferences with optimistic updates.
 * Replaces MobX BaseWorkspaceRootStore.updateBulkSidebarPreferences for write operations.
 *
 * @example
 * const { mutate: updateBulk, isPending } = useUpdateBulkSidebarPreferences();
 * updateBulk({ workspaceSlug, data: [{ key: "projects", is_pinned: true, sort_order: 1 }] });
 */
export function useUpdateBulkSidebarPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, data }: UpdateBulkSidebarPreferencesParams) =>
      workspaceService.updateBulkSidebarPreferences(workspaceSlug, data),
    onMutate: async ({ workspaceSlug, data }) => {
      const queryKey = [...queryKeys.workspaces.detail(workspaceSlug), "sidebar-preferences"];
      await queryClient.cancelQueries({ queryKey });

      const previousPreferences = queryClient.getQueryData<IWorkspaceSidebarNavigation>(queryKey);

      if (previousPreferences) {
        const updatedPreferences: IWorkspaceSidebarNavigation = { ...previousPreferences };
        data.forEach((item) => {
          updatedPreferences[item.key] = item;
        });
        queryClient.setQueryData<IWorkspaceSidebarNavigation>(queryKey, updatedPreferences);
      }

      return { previousPreferences, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousPreferences && context.workspaceSlug) {
        const queryKey = [...queryKeys.workspaces.detail(context.workspaceSlug), "sidebar-preferences"];
        queryClient.setQueryData(queryKey, context.previousPreferences);
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.workspaces.detail(workspaceSlug), "sidebar-preferences"],
      });
    },
  });
}

/**
 * Hook to check if a workspace slug is available.
 *
 * @example
 * const { mutate: checkSlug, isPending } = useCheckWorkspaceSlug();
 * checkSlug({ slug: "my-workspace" });
 */
export function useCheckWorkspaceSlug() {
  return useMutation({
    mutationFn: ({ slug }: { slug: string }) => workspaceService.workspaceSlugCheck(slug),
  });
}

/**
 * Hook to fetch the current user's workspace member info.
 *
 * @example
 * const { data: memberMe, isLoading } = useWorkspaceMemberMe(workspaceSlug);
 */
export function useWorkspaceMemberMe(workspaceSlug: string) {
  return useQuery({
    queryKey: [...queryKeys.workspaces.detail(workspaceSlug), "member-me"],
    queryFn: () => workspaceService.workspaceMemberMe(workspaceSlug),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch user's workspace invitations.
 *
 * @example
 * const { data: invitations, isLoading } = useUserWorkspaceInvitations();
 */
export function useUserWorkspaceInvitations() {
  return useQuery({
    queryKey: ["user", "workspace-invitations"],
    queryFn: () => workspaceService.userWorkspaceInvitations(),
    staleTime: 2 * 60 * 1000, // Invitations may change frequently
    gcTime: 30 * 60 * 1000,
  });
}

interface JoinWorkspaceParams {
  workspaceSlug: string;
  invitationId: string;
  data: { accepted: boolean };
}

/**
 * Hook to join a workspace via invitation.
 *
 * @example
 * const { mutate: joinWorkspace, isPending } = useJoinWorkspace();
 * joinWorkspace({ workspaceSlug, invitationId, data: { accepted: true } });
 */
export function useJoinWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, invitationId, data }: JoinWorkspaceParams) =>
      workspaceService.joinWorkspace(workspaceSlug, invitationId, data),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all() });
      void queryClient.invalidateQueries({ queryKey: ["user", "workspace-invitations"] });
    },
  });
}

/**
 * Hook to get last active workspace and projects.
 *
 * @example
 * const { data: lastActive, isLoading } = useLastActiveWorkspace();
 */
export function useLastActiveWorkspace() {
  return useQuery({
    queryKey: ["user", "last-active-workspace"],
    queryFn: () => workspaceService.getLastActiveWorkspaceAndProjects(),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 30 * 60 * 1000,
  });
}

// Utility functions for derived data (used inline by components)

/**
 * Get workspace by slug from a workspaces array.
 *
 * @example
 * const { data: workspaces } = useWorkspaces();
 * const workspace = getWorkspaceBySlug(workspaces, workspaceSlug);
 */
export function getWorkspaceBySlug(
  workspaces: IWorkspace[] | undefined,
  slug: string | null | undefined
): IWorkspace | undefined {
  if (!workspaces || !slug) return undefined;
  return workspaces.find((ws) => ws.slug === slug);
}

/**
 * Get workspace by ID from a workspaces array.
 *
 * @example
 * const { data: workspaces } = useWorkspaces();
 * const workspace = getWorkspaceById(workspaces, workspaceId);
 */
export function getWorkspaceById(
  workspaces: IWorkspace[] | undefined,
  workspaceId: string | null | undefined
): IWorkspace | undefined {
  if (!workspaces || !workspaceId) return undefined;
  return workspaces.find((ws) => ws.id === workspaceId);
}

/**
 * Get workspace IDs from workspaces array.
 *
 * @example
 * const { data: workspaces } = useWorkspaces();
 * const workspaceIds = getWorkspaceIds(workspaces);
 */
export function getWorkspaceIds(workspaces: IWorkspace[] | undefined): string[] {
  if (!workspaces) return [];
  return workspaces.map((ws) => ws.id);
}

/**
 * Get workspace slugs from workspaces array.
 *
 * @example
 * const { data: workspaces } = useWorkspaces();
 * const workspaceSlugs = getWorkspaceSlugs(workspaces);
 */
export function getWorkspaceSlugs(workspaces: IWorkspace[] | undefined): string[] {
  if (!workspaces) return [];
  return workspaces.map((ws) => ws.slug);
}
