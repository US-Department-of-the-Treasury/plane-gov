/**
 * Re-exports TanStack Query hooks for workspace views (global views).
 * Replaces MobX GlobalViewStore with TanStack Query.
 *
 * Migration Note:
 * - useWorkspaceViews() replaces globalView.fetchAllGlobalViews()
 * - useWorkspaceViewDetails() replaces globalView.fetchGlobalViewDetails()
 * - useCreateWorkspaceView() replaces globalView.createGlobalView()
 * - useUpdateWorkspaceView() replaces globalView.updateGlobalView()
 * - useDeleteWorkspaceView() replaces globalView.deleteGlobalView()
 * - getWorkspaceViewById() replaces globalView.getViewDetailsById()
 * - getSearchedWorkspaceViews() replaces globalView.getSearchedViews()
 */

import { useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import type { IWorkspaceView } from "@plane/types";
import {
  useWorkspaceViews as useTanstackWorkspaceViews,
  useWorkspaceViewDetails,
  useCreateWorkspaceView as useTanstackCreateWorkspaceView,
  useUpdateWorkspaceView as useTanstackUpdateWorkspaceView,
  useDeleteWorkspaceView as useTanstackDeleteWorkspaceView,
  getWorkspaceViewById,
  getSearchedWorkspaceViews,
} from "@/store/queries/workspace";

export {
  // Query hooks
  useWorkspaceViews,
  useWorkspaceViewDetails,
  // Mutation hooks
  useCreateWorkspaceView,
  useUpdateWorkspaceView,
  useDeleteWorkspaceView,
  // Helper functions
  getWorkspaceViewById,
  getSearchedWorkspaceViews,
} from "@/store/queries/workspace";

/**
 * Backward-compatible hook for components that still use the old MobX-style API.
 * This hook provides the same interface as the old GlobalViewStore.
 *
 * @example
 * const { getViewDetailsById, currentWorkspaceViews, updateGlobalView } = useGlobalView();
 */
export function useGlobalView() {
  const params = useParams();
  const workspaceSlug = params?.workspaceSlug as string | undefined;

  // Fetch workspace views using TanStack Query
  const { data: views } = useTanstackWorkspaceViews(workspaceSlug || "");

  // Get mutation hooks
  const createMutation = useTanstackCreateWorkspaceView();
  const updateMutation = useTanstackUpdateWorkspaceView();
  const deleteMutation = useTanstackDeleteWorkspaceView();

  // Memoize the view IDs array
  const currentWorkspaceViews = useMemo(() => {
    return views?.map((view) => view.id) || [];
  }, [views]);

  // Wrap getViewDetailsById to use the current views data
  const getViewDetailsById = useCallback(
    (viewId: string): IWorkspaceView | undefined => {
      return getWorkspaceViewById(views, viewId);
    },
    [views]
  );

  // Wrap getSearchedViews to use the current views data and return IDs
  const getSearchedViews = useCallback(
    (query: string): string[] => {
      const filteredViews = getSearchedWorkspaceViews(views, query);
      return filteredViews.map((view) => view.id);
    },
    [views]
  );

  // Wrap createGlobalView mutation
  const createGlobalView = useCallback(
    async (workspaceSlug: string, data: Partial<IWorkspaceView>): Promise<IWorkspaceView> => {
      return createMutation.mutateAsync({ workspaceSlug, data });
    },
    [createMutation]
  );

  // Wrap updateGlobalView mutation
  const updateGlobalView = useCallback(
    async (workspaceSlug: string, viewId: string, data: Partial<IWorkspaceView>): Promise<IWorkspaceView> => {
      return updateMutation.mutateAsync({ workspaceSlug, viewId, data });
    },
    [updateMutation]
  );

  // Wrap deleteGlobalView mutation
  const deleteGlobalView = useCallback(
    async (workspaceSlug: string, viewId: string): Promise<void> => {
      await deleteMutation.mutateAsync({ workspaceSlug, viewId });
    },
    [deleteMutation]
  );

  // fetchAllGlobalViews is a no-op since TanStack Query auto-fetches
  const fetchAllGlobalViews = useCallback(() => {
    // No-op: TanStack Query automatically fetches when workspaceSlug is available
  }, []);

  return {
    fetchAllGlobalViews,
    currentWorkspaceViews,
    getViewDetailsById,
    getSearchedViews,
    createGlobalView,
    updateGlobalView,
    deleteGlobalView,
  };
}
