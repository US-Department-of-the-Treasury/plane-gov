"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { IWorkspace, IWorkspaceSidebarNavigationItem, IWorkspaceSidebarNavigation, IWorkspaceView } from "@plane/types";
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
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error && typeof error === "object" && "status" in error) {
        const status = (error as { status?: number }).status;
        if (status === 401 || status === 403) return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * Hook to fetch workspace details by slug.
 *
 * @example
 * const { data: workspace, isLoading } = useWorkspaceDetails(workspaceSlug);
 */
export function useWorkspaceDetails(workspaceSlug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.workspaces.detail(workspaceSlug ?? ""),
    queryFn: () => workspaceService.getWorkspace(workspaceSlug!),
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

// =============================================================================
// Workspace Views (Global Views)
// =============================================================================

/**
 * Hook to fetch all workspace views (global views) for a workspace.
 * Replaces MobX GlobalViewStore.fetchAllGlobalViews for read operations.
 *
 * @example
 * const { data: globalViews, isLoading } = useWorkspaceViews(workspaceSlug);
 */
export function useWorkspaceViews(workspaceSlug: string) {
  return useQuery({
    queryKey: queryKeys.workspaceViews.all(workspaceSlug),
    queryFn: () => workspaceService.getAllViews(workspaceSlug),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch workspace view details by ID.
 * Replaces MobX GlobalViewStore.fetchGlobalViewDetails for read operations.
 *
 * @example
 * const { data: view, isLoading } = useWorkspaceViewDetails(workspaceSlug, viewId);
 */
export function useWorkspaceViewDetails(workspaceSlug: string, viewId: string) {
  return useQuery({
    queryKey: queryKeys.workspaceViews.detail(viewId),
    queryFn: () => workspaceService.getViewDetails(workspaceSlug, viewId),
    enabled: !!workspaceSlug && !!viewId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Helper function to get a specific workspace view from the views list by ID.
 * Replaces MobX GlobalViewStore.getViewDetailsById.
 *
 * @example
 * const views = queryClient.getQueryData(queryKeys.workspaceViews.all(workspaceSlug));
 * const view = getWorkspaceViewById(views, viewId);
 */
export function getWorkspaceViewById(views: IWorkspaceView[] | undefined, viewId: string): IWorkspaceView | undefined {
  return views?.find((view) => view.id === viewId);
}

/**
 * Helper function to filter workspace views by search query.
 * Replaces MobX GlobalViewStore.getSearchedViews.
 *
 * @example
 * const { data: views } = useWorkspaceViews(workspaceSlug);
 * const filteredViews = getSearchedWorkspaceViews(views, "my search");
 */
export function getSearchedWorkspaceViews(views: IWorkspaceView[] | undefined, searchQuery: string): IWorkspaceView[] {
  if (!views) return [];
  const lowerQuery = searchQuery.toLowerCase();
  return views.filter((view) => view.name?.toLowerCase().includes(lowerQuery));
}

interface CreateWorkspaceViewParams {
  workspaceSlug: string;
  data: Partial<IWorkspaceView>;
}

/**
 * Hook to create a new workspace view with optimistic updates.
 * Replaces MobX GlobalViewStore.createGlobalView for write operations.
 *
 * @example
 * const { mutate: createView, isPending } = useCreateWorkspaceView();
 * createView({ workspaceSlug, data: { name: "My View" } });
 */
export function useCreateWorkspaceView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, data }: CreateWorkspaceViewParams) =>
      workspaceService.createView(workspaceSlug, data),
    onSuccess: (newView, { workspaceSlug }) => {
      // Update the views list cache
      queryClient.setQueryData<IWorkspaceView[]>(queryKeys.workspaceViews.all(workspaceSlug), (oldViews) => {
        if (!oldViews) return [newView];
        return [...oldViews, newView];
      });
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceViews.all(workspaceSlug) });
    },
  });
}

interface UpdateWorkspaceViewParams {
  workspaceSlug: string;
  viewId: string;
  data: Partial<IWorkspaceView>;
}

/**
 * Hook to update a workspace view with optimistic updates.
 * Replaces MobX GlobalViewStore.updateGlobalView for write operations.
 *
 * @example
 * const { mutate: updateView, isPending } = useUpdateWorkspaceView();
 * updateView({ workspaceSlug, viewId, data: { name: "Updated View" } });
 */
export function useUpdateWorkspaceView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, viewId, data }: UpdateWorkspaceViewParams) =>
      workspaceService.updateView(workspaceSlug, viewId, data),
    onMutate: async ({ workspaceSlug, viewId, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.workspaceViews.all(workspaceSlug) });

      // Snapshot previous values
      const previousViews = queryClient.getQueryData<IWorkspaceView[]>(queryKeys.workspaceViews.all(workspaceSlug));
      const previousView = queryClient.getQueryData<IWorkspaceView>(queryKeys.workspaceViews.detail(viewId));

      // Optimistically update views list
      if (previousViews) {
        queryClient.setQueryData<IWorkspaceView[]>(
          queryKeys.workspaceViews.all(workspaceSlug),
          previousViews.map((view) => (view.id === viewId ? { ...view, ...data } : view))
        );
      }

      // Optimistically update view detail
      if (previousView) {
        queryClient.setQueryData<IWorkspaceView>(queryKeys.workspaceViews.detail(viewId), { ...previousView, ...data });
      }

      return { previousViews, previousView, workspaceSlug, viewId };
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousViews) {
        queryClient.setQueryData(queryKeys.workspaceViews.all(context.workspaceSlug), context.previousViews);
      }
      if (context?.previousView) {
        queryClient.setQueryData(queryKeys.workspaceViews.detail(context.viewId), context.previousView);
      }
    },
    onSettled: (_data, _error, { workspaceSlug, viewId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceViews.all(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceViews.detail(viewId) });
    },
  });
}

interface DeleteWorkspaceViewParams {
  workspaceSlug: string;
  viewId: string;
}

/**
 * Hook to delete a workspace view with optimistic updates.
 * Replaces MobX GlobalViewStore.deleteGlobalView for write operations.
 *
 * @example
 * const { mutate: deleteView, isPending } = useDeleteWorkspaceView();
 * deleteView({ workspaceSlug, viewId });
 */
export function useDeleteWorkspaceView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, viewId }: DeleteWorkspaceViewParams) =>
      workspaceService.deleteView(workspaceSlug, viewId),
    onMutate: async ({ workspaceSlug, viewId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.workspaceViews.all(workspaceSlug) });

      // Snapshot previous value
      const previousViews = queryClient.getQueryData<IWorkspaceView[]>(queryKeys.workspaceViews.all(workspaceSlug));

      // Optimistically remove the view
      if (previousViews) {
        queryClient.setQueryData<IWorkspaceView[]>(
          queryKeys.workspaceViews.all(workspaceSlug),
          previousViews.filter((view) => view.id !== viewId)
        );
      }

      return { previousViews, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousViews) {
        queryClient.setQueryData(queryKeys.workspaceViews.all(context.workspaceSlug), context.previousViews);
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceViews.all(workspaceSlug) });
    },
  });
}
