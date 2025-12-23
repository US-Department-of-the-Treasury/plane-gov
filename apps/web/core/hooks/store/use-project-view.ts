"use client";

import { useCallback, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { IProjectView, TViewFilters } from "@plane/types";
import { getViewName, orderViews, shouldFilterView } from "@plane/utils";
import { queryKeys } from "@/store/queries/query-keys";
import { useUpdateView as useUpdateViewHook } from "@/store/queries/view";

// Re-export all view-related hooks from the queries layer
export {
  useProjectViews,
  useViewDetails,
  getViewById as getViewByIdHelper,
  useCreateView,
  useUpdateView,
  useDeleteView,
  useAddViewToFavorites,
  useRemoveViewFromFavorites,
} from "@/store/queries/view";

/**
 * Backward-compatible hook that mimics the old MobX ProjectViewStore API.
 * Provides a stateful interface for managing project views with local filter state.
 *
 * @example
 * const { filters, updateFilters, getProjectViews, getViewById } = useProjectView();
 */
export function useProjectView() {
  const { workspaceSlug, projectId } = useParams();
  const queryClient = useQueryClient();
  const { mutateAsync: updateViewMutation } = useUpdateViewHook();

  // Local state for filters (replaces MobX observable)
  const [filters, setFilters] = useState<TViewFilters>({
    searchQuery: "",
    sortBy: "desc",
    sortKey: "updated_at",
    filters: {},
  });

  // Get cached views data from TanStack Query
  const views = useMemo(() => {
    if (!workspaceSlug || !projectId) return undefined;
    return queryClient.getQueryData<IProjectView[]>(
      queryKeys.views.all(workspaceSlug.toString(), projectId.toString())
    );
  }, [queryClient, workspaceSlug, projectId]);

  // Check if data has been fetched (fetchedMap replacement)
  const fetchedMap = useMemo(() => {
    if (!workspaceSlug || !projectId) return {};
    const state = queryClient.getQueryState(queryKeys.views.all(workspaceSlug.toString(), projectId.toString()));
    const key = `${workspaceSlug}_${projectId}`;
    return { [key]: state?.status === "success" };
  }, [queryClient, workspaceSlug, projectId]);

  // Check if data has been fetched
  const loader = useMemo(() => {
    if (!workspaceSlug || !projectId) return false;
    const state = queryClient.getQueryState(queryKeys.views.all(workspaceSlug.toString(), projectId.toString()));
    return state?.status === "pending";
  }, [queryClient, workspaceSlug, projectId]);

  /**
   * Get all views for a specific project (unfiltered, but sorted)
   */
  const getProjectViews = useCallback(
    (targetProjectId: string) => {
      const cachedViews = queryClient.getQueryData<IProjectView[]>(
        queryKeys.views.all(workspaceSlug?.toString() ?? "", targetProjectId)
      );

      if (!cachedViews) return undefined;

      const projectViews = cachedViews.filter((view) => view.project === targetProjectId);
      return orderViews(projectViews, filters.sortKey, filters.sortBy);
    },
    [queryClient, workspaceSlug, filters.sortKey, filters.sortBy]
  );

  /**
   * Get filtered views for a specific project (filtered by search query and filters)
   */
  const getFilteredProjectViews = useCallback(
    (targetProjectId: string) => {
      const cachedViews = queryClient.getQueryData<IProjectView[]>(
        queryKeys.views.all(workspaceSlug?.toString() ?? "", targetProjectId)
      );

      if (!cachedViews) return undefined;

      const filteredViews = cachedViews.filter(
        (view) =>
          view.project === targetProjectId &&
          getViewName(view.name).toLowerCase().includes(filters.searchQuery.toLowerCase()) &&
          shouldFilterView(view, filters.filters)
      );

      return orderViews(filteredViews, filters.sortKey, filters.sortBy);
    },
    [queryClient, workspaceSlug, filters]
  );

  /**
   * Get a specific view by ID from cache
   */
  const getViewById = useCallback(
    (viewId: string): IProjectView | null => {
      if (!views) return null;
      return views.find((view) => view.id === viewId) ?? null;
    },
    [views]
  );

  /**
   * Get array of view IDs for current project
   */
  const projectViewIds = useMemo(() => {
    if (!projectId || !views) return null;
    return views.filter((view) => view.project === projectId.toString()).map((view) => view.id);
  }, [projectId, views]);

  /**
   * Update filters (replaces MobX action)
   */
  const updateFilters = useCallback(<T extends keyof TViewFilters>(filterKey: T, filterValue: TViewFilters[T]) => {
    setFilters((prev) => ({
      ...prev,
      [filterKey]: filterValue,
    }));
  }, []);

  /**
   * Clear all filters (replaces MobX action)
   */
  const clearAllFilters = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      filters: {},
    }));
  }, []);

  /**
   * Fetch views from API (for backward compatibility with useSWR patterns)
   */
  const fetchViews = useCallback(
    async (ws: string, pid: string) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.views.all(ws, pid) });
      // Return empty array instead of undefined to satisfy TanStack Query requirement
      return queryClient.getQueryData<IProjectView[]>(queryKeys.views.all(ws, pid)) ?? [];
    },
    [queryClient]
  );

  /**
   * Fetch view details from API (for backward compatibility with useSWR patterns)
   */
  const fetchViewDetails = useCallback(
    async (ws: string, pid: string, viewId: string) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.views.detail(viewId) });
      const view = queryClient.getQueryData<IProjectView>(queryKeys.views.detail(viewId));
      if (!view) throw new Error("View not found");
      return view;
    },
    [queryClient]
  );

  /**
   * Update view with TanStack Query mutation (backward compatible wrapper)
   */
  const updateView = useCallback(
    async (ws: string, pid: string, viewId: string, data: Partial<IProjectView>) => {
      return updateViewMutation({ workspaceSlug: ws, projectId: pid, viewId, data });
    },
    [updateViewMutation]
  );

  return {
    // State
    loader,
    filters,
    views,
    projectViewIds,
    fetchedMap,

    // Computed getters
    getProjectViews,
    getFilteredProjectViews,
    getViewById,

    // Filter actions
    updateFilters,
    clearAllFilters,

    // Mutation actions
    updateView,

    // Fetch actions (for backward compatibility)
    fetchViews,
    fetchViewDetails,
  };
}
