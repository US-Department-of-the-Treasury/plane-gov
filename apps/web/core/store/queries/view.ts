"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { IProjectView } from "@plane/types";
import { ViewService } from "@/services/view.service";
import { queryKeys } from "./query-keys";

// Service instance
const viewService = new ViewService();

/**
 * Hook to fetch all views for a project.
 * Replaces MobX ProjectViewStore.fetchViews for read operations.
 *
 * @example
 * const { data: views, isLoading } = useProjectViews(workspaceSlug, projectId);
 */
export function useProjectViews(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: queryKeys.views.all(workspaceSlug, projectId),
    queryFn: () => viewService.getViews(workspaceSlug, projectId),
    enabled: !!workspaceSlug && !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch view details by ID.
 * Replaces MobX ProjectViewStore.fetchViewDetails for read operations.
 *
 * @example
 * const { data: view, isLoading } = useViewDetails(workspaceSlug, projectId, viewId);
 */
export function useViewDetails(workspaceSlug: string, projectId: string, viewId: string) {
  return useQuery({
    queryKey: queryKeys.views.detail(viewId),
    queryFn: () => viewService.getViewDetails(workspaceSlug, projectId, viewId),
    enabled: !!workspaceSlug && !!projectId && !!viewId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Helper function to get a specific view from the views list by ID.
 * Replaces MobX ProjectViewStore.getViewById.
 *
 * @example
 * const views = queryClient.getQueryData(queryKeys.views.all(workspaceSlug, projectId));
 * const view = getViewById(views, viewId);
 */
export function getViewById(views: IProjectView[] | undefined, viewId: string): IProjectView | undefined {
  return views?.find((view) => view.id === viewId);
}

interface CreateViewParams {
  workspaceSlug: string;
  projectId: string;
  data: Partial<IProjectView>;
}

/**
 * Hook to create a new view with optimistic updates.
 * Replaces MobX ProjectViewStore.createView for write operations.
 *
 * @example
 * const { mutate: createView, isPending } = useCreateView();
 * createView({ workspaceSlug, projectId, data: { name: "My View" } });
 */
export function useCreateView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, data }: CreateViewParams) =>
      viewService.createView(workspaceSlug, projectId, data),
    onSuccess: (newView, { workspaceSlug, projectId }) => {
      // Update the views list cache
      queryClient.setQueryData<IProjectView[]>(queryKeys.views.all(workspaceSlug, projectId), (oldViews) => {
        if (!oldViews) return [newView];
        return [...oldViews, newView];
      });
    },
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.views.all(workspaceSlug, projectId) });
    },
  });
}

interface UpdateViewParams {
  workspaceSlug: string;
  projectId: string;
  viewId: string;
  data: Partial<IProjectView>;
}

/**
 * Hook to update a view with optimistic updates.
 * Replaces MobX ProjectViewStore.updateView for write operations.
 *
 * @example
 * const { mutate: updateView, isPending } = useUpdateView();
 * updateView({ workspaceSlug, projectId, viewId, data: { name: "Updated View" } });
 */
export function useUpdateView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, viewId, data }: UpdateViewParams) =>
      viewService.patchView(workspaceSlug, projectId, viewId, data),
    onMutate: async ({ workspaceSlug, projectId, viewId, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.views.all(workspaceSlug, projectId) });

      // Snapshot previous values
      const previousViews = queryClient.getQueryData<IProjectView[]>(queryKeys.views.all(workspaceSlug, projectId));
      const previousView = queryClient.getQueryData<IProjectView>(queryKeys.views.detail(viewId));

      // Optimistically update views list
      if (previousViews) {
        queryClient.setQueryData<IProjectView[]>(
          queryKeys.views.all(workspaceSlug, projectId),
          previousViews.map((view) => (view.id === viewId ? { ...view, ...data } : view))
        );
      }

      // Optimistically update view detail
      if (previousView) {
        queryClient.setQueryData<IProjectView>(queryKeys.views.detail(viewId), { ...previousView, ...data });
      }

      return { previousViews, previousView, workspaceSlug, projectId, viewId };
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousViews) {
        queryClient.setQueryData(queryKeys.views.all(context.workspaceSlug, context.projectId), context.previousViews);
      }
      if (context?.previousView) {
        queryClient.setQueryData(queryKeys.views.detail(context.viewId), context.previousView);
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId, viewId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.views.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.views.detail(viewId) });
    },
  });
}

interface DeleteViewParams {
  workspaceSlug: string;
  projectId: string;
  viewId: string;
}

/**
 * Hook to delete a view with optimistic updates.
 * Replaces MobX ProjectViewStore.deleteView for write operations.
 *
 * @example
 * const { mutate: deleteView, isPending } = useDeleteView();
 * deleteView({ workspaceSlug, projectId, viewId });
 */
export function useDeleteView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, viewId }: DeleteViewParams) =>
      viewService.deleteView(workspaceSlug, projectId, viewId),
    onMutate: async ({ workspaceSlug, projectId, viewId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.views.all(workspaceSlug, projectId) });

      // Snapshot previous value
      const previousViews = queryClient.getQueryData<IProjectView[]>(queryKeys.views.all(workspaceSlug, projectId));

      // Optimistically remove the view
      if (previousViews) {
        queryClient.setQueryData<IProjectView[]>(
          queryKeys.views.all(workspaceSlug, projectId),
          previousViews.filter((view) => view.id !== viewId)
        );
      }

      return { previousViews, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousViews) {
        queryClient.setQueryData(queryKeys.views.all(context.workspaceSlug, context.projectId), context.previousViews);
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.views.all(workspaceSlug, projectId) });
    },
  });
}

interface AddViewToFavoritesParams {
  workspaceSlug: string;
  projectId: string;
  viewId: string;
}

/**
 * Hook to add a view to favorites with optimistic updates.
 * Replaces MobX ProjectViewStore.addViewToFavorites for write operations.
 *
 * @example
 * const { mutate: addToFavorites, isPending } = useAddViewToFavorites();
 * addToFavorites({ workspaceSlug, projectId, viewId });
 */
export function useAddViewToFavorites() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, viewId }: AddViewToFavoritesParams) =>
      viewService.addViewToFavorites(workspaceSlug, projectId, { view: viewId }),
    onMutate: async ({ workspaceSlug, projectId, viewId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.views.all(workspaceSlug, projectId) });

      const previousViews = queryClient.getQueryData<IProjectView[]>(queryKeys.views.all(workspaceSlug, projectId));

      if (previousViews) {
        queryClient.setQueryData<IProjectView[]>(
          queryKeys.views.all(workspaceSlug, projectId),
          previousViews.map((view) => (view.id === viewId ? { ...view, is_favorite: true } : view))
        );
      }

      return { previousViews, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousViews && context.workspaceSlug && context.projectId) {
        queryClient.setQueryData(queryKeys.views.all(context.workspaceSlug, context.projectId), context.previousViews);
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.views.all(workspaceSlug, projectId) });
    },
  });
}

interface RemoveViewFromFavoritesParams {
  workspaceSlug: string;
  projectId: string;
  viewId: string;
}

/**
 * Hook to remove a view from favorites with optimistic updates.
 * Replaces MobX ProjectViewStore.removeViewFromFavorites for write operations.
 *
 * @example
 * const { mutate: removeFromFavorites, isPending } = useRemoveViewFromFavorites();
 * removeFromFavorites({ workspaceSlug, projectId, viewId });
 */
export function useRemoveViewFromFavorites() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, viewId }: RemoveViewFromFavoritesParams) =>
      viewService.removeViewFromFavorites(workspaceSlug, projectId, viewId),
    onMutate: async ({ workspaceSlug, projectId, viewId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.views.all(workspaceSlug, projectId) });

      const previousViews = queryClient.getQueryData<IProjectView[]>(queryKeys.views.all(workspaceSlug, projectId));

      if (previousViews) {
        queryClient.setQueryData<IProjectView[]>(
          queryKeys.views.all(workspaceSlug, projectId),
          previousViews.map((view) => (view.id === viewId ? { ...view, is_favorite: false } : view))
        );
      }

      return { previousViews, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousViews && context.workspaceSlug && context.projectId) {
        queryClient.setQueryData(queryKeys.views.all(context.workspaceSlug, context.projectId), context.previousViews);
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.views.all(workspaceSlug, projectId) });
    },
  });
}
