/**
 * Epic hooks using TanStack Query.
 * These hooks replace the MobX-based EpicStore.
 *
 * Migration from MobX:
 * - Old: const epicStore = useEpic(); epicStore.fetchEpics(workspaceSlug, projectId);
 * - New: const { data: epics } = useProjectEpics(workspaceSlug, projectId);
 */

// Re-export all TanStack Query hooks from the queries module
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
  useCreateEpicLink,
  useUpdateEpicLink,
  useDeleteEpicLink,
  useAddEpicToFavorites,
  useRemoveEpicFromFavorites,
  getEpicById,
  getEpicNameById,
  getEpicIds,
  getActiveEpics,
  getFavoriteEpics,
} from "@/store/queries/epic";

import {
  useCreateEpic as useCreateEpicMutation,
  useUpdateEpic as useUpdateEpicMutation,
  useDeleteEpic as useDeleteEpicMutation,
  useArchiveEpic as useArchiveEpicMutation,
  useRestoreEpic as useRestoreEpicMutation,
  useCreateEpicLink as useCreateEpicLinkMutation,
  useUpdateEpicLink as useUpdateEpicLinkMutation,
  useDeleteEpicLink as useDeleteEpicLinkMutation,
  useAddEpicToFavorites as useAddEpicToFavoritesMutation,
  useRemoveEpicFromFavorites as useRemoveEpicFromFavoritesMutation,
  useProjectEpics,
  useWorkspaceEpics,
  useEpicDetails,
  useArchivedEpics,
} from "@/store/queries/epic";

/**
 * Backward-compatible hook that wraps TanStack Query epic hooks.
 * This provides a MobX-like API for components that haven't been fully migrated.
 *
 * @deprecated Prefer using the individual TanStack Query hooks directly:
 * - useProjectEpics(), useWorkspaceEpics(), useEpicDetails(), useArchivedEpics()
 * - useCreateEpic(), useUpdateEpic(), useDeleteEpic(), etc.
 *
 * @example
 * // Old MobX pattern (still works with this hook):
 * const epicStore = useEpic();
 * epicStore.updateEpicDetails(workspaceSlug, projectId, epicId, { name: "Updated" });
 *
 * // Preferred TanStack Query pattern:
 * const { mutate: updateEpic } = useUpdateEpic();
 * updateEpic({ workspaceSlug, projectId, epicId, data: { name: "Updated" } });
 */
export function useEpic() {
  const createEpic = useCreateEpicMutation();
  const updateEpic = useUpdateEpicMutation();
  const deleteEpic = useDeleteEpicMutation();
  const archiveEpic = useArchiveEpicMutation();
  const restoreEpic = useRestoreEpicMutation();
  const createEpicLink = useCreateEpicLinkMutation();
  const updateEpicLink = useUpdateEpicLinkMutation();
  const deleteEpicLink = useDeleteEpicLinkMutation();
  const addToFavorites = useAddEpicToFavoritesMutation();
  const removeFromFavorites = useRemoveEpicFromFavoritesMutation();

  return {
    // Backward-compatible methods matching the old MobX API signatures
    createEpicDetails: (workspaceSlug: string, projectId: string, data: any) =>
      createEpic.mutateAsync({ workspaceSlug, projectId, data }),

    updateEpicDetails: (workspaceSlug: string, projectId: string, epicId: string, data: any) =>
      updateEpic.mutateAsync({ workspaceSlug, projectId, epicId, data }),

    deleteEpicDetails: (workspaceSlug: string, projectId: string, epicId: string) =>
      deleteEpic.mutateAsync({ workspaceSlug, projectId, epicId }),

    archiveEpicDetails: (workspaceSlug: string, projectId: string, epicId: string) =>
      archiveEpic.mutateAsync({ workspaceSlug, projectId, epicId }),

    restoreEpicDetails: (workspaceSlug: string, projectId: string, epicId: string) =>
      restoreEpic.mutateAsync({ workspaceSlug, projectId, epicId }),

    addEpicToFavorites: (workspaceSlug: string, projectId: string, epicId: string) =>
      addToFavorites.mutateAsync({ workspaceSlug, projectId, epicId }),

    removeEpicFromFavorites: (workspaceSlug: string, projectId: string, epicId: string) =>
      removeFromFavorites.mutateAsync({ workspaceSlug, projectId, epicId }),

    createEpicLinkDetails: (workspaceSlug: string, projectId: string, epicId: string, data: any) =>
      createEpicLink.mutateAsync({ workspaceSlug, projectId, epicId, data }),

    updateEpicLinkDetails: (workspaceSlug: string, projectId: string, epicId: string, linkId: string, data: any) =>
      updateEpicLink.mutateAsync({ workspaceSlug, projectId, epicId, linkId, data }),

    deleteEpicLinkDetails: (workspaceSlug: string, projectId: string, epicId: string, linkId: string) =>
      deleteEpicLink.mutateAsync({ workspaceSlug, projectId, epicId, linkId }),

    // TanStack Query-style methods (object parameters)
    createEpic: createEpic.mutate,
    updateEpic: updateEpic.mutate,
    deleteEpic: deleteEpic.mutate,
    archiveEpic: archiveEpic.mutate,
    restoreEpic: restoreEpic.mutate,
    createEpicLink: createEpicLink.mutate,
    updateEpicLink: updateEpicLink.mutate,
    deleteEpicLink: deleteEpicLink.mutate,

    // Async mutation methods (return promises)
    createEpicAsync: createEpic.mutateAsync,
    updateEpicAsync: updateEpic.mutateAsync,
    deleteEpicAsync: deleteEpic.mutateAsync,
    archiveEpicAsync: archiveEpic.mutateAsync,
    restoreEpicAsync: restoreEpic.mutateAsync,
    createEpicLinkAsync: createEpicLink.mutateAsync,
    updateEpicLinkAsync: updateEpicLink.mutateAsync,
    deleteEpicLinkAsync: deleteEpicLink.mutateAsync,
    addEpicToFavoritesAsync: addToFavorites.mutateAsync,
    removeEpicFromFavoritesAsync: removeFromFavorites.mutateAsync,

    // Loading states
    isCreating: createEpic.isPending,
    isUpdating: updateEpic.isPending,
    isDeleting: deleteEpic.isPending,
    isArchiving: archiveEpic.isPending,
    isRestoring: restoreEpic.isPending,

    // For data fetching, expose the hooks since they need parameters
    useProjectEpics,
    useWorkspaceEpics,
    useEpicDetails,
    useArchivedEpics,
  };
}
