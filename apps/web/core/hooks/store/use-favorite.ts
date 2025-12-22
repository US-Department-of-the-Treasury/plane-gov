"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";
import {
  useFavorites,
  useGroupedFavorites,
  useAddFavorite,
  useUpdateFavorite,
  useDeleteFavorite,
  useMoveFavoriteToFolder,
  useReorderFavorite,
  useRemoveFromFavoriteFolder,
  getFavoriteById,
  getFavoriteByEntityId,
  getFavoriteFolders,
  getFavoritesByWorkspace,
  groupFavorites,
} from "@/store/queries";

// Re-export individual hooks for direct use
export {
  useFavorites,
  useGroupedFavorites,
  useAddFavorite,
  useUpdateFavorite,
  useDeleteFavorite,
  useMoveFavoriteToFolder,
  useReorderFavorite,
  useRemoveFromFavoriteFolder,
  getFavoriteById,
  getFavoriteByEntityId,
  getFavoriteFolders,
  getFavoritesByWorkspace,
  groupFavorites,
};

/**
 * Backward-compatible useFavorite hook that combines all favorite operations.
 * Provides the same interface as the previous MobX-based hook.
 *
 * @example
 * const { groupedFavorites, addFavorite, deleteFavorite } = useFavorite();
 */
export function useFavorite() {
  const params = useParams();
  const workspaceSlug = params?.workspaceSlug as string;

  // Query hooks
  const { data: favorites, refetch: refetchFavorites } = useFavorites(workspaceSlug);

  // Mutation hooks (using mutateAsync for Promise-based API)
  const { mutateAsync: addFavoriteMutation } = useAddFavorite();
  const { mutateAsync: updateFavoriteMutation } = useUpdateFavorite();
  const { mutateAsync: deleteFavoriteMutation } = useDeleteFavorite();
  const { mutateAsync: moveFavoriteToFolderMutation } = useMoveFavoriteToFolder();
  const { mutateAsync: reorderFavoriteMutation } = useReorderFavorite();
  const { mutateAsync: removeFromFavoriteFolderMutation } = useRemoveFromFavoriteFolder();

  // Computed values
  const groupedFavorites = useMemo(() => groupFavorites(favorites), [favorites]);

  // Extract folder names as strings (for existingFolders)
  const existingFolders = useMemo(() => {
    const folders = getFavoriteFolders(favorites);
    return folders.map((folder) => folder.name);
  }, [favorites]);

  // Helper function to calculate sequence for reordering
  const calculateReorderSequence = (
    favoriteId: string,
    destinationId: string,
    edge: string | undefined
  ): number => {
    if (!favorites || !edge) return 10000;

    // Sort favorites by sequence in descending order
    const sortedFavorites = [...favorites].sort((a, b) => b.sequence - a.sequence);
    const sortedIds = sortedFavorites.map((fav) => fav.id);

    const destinationFavorite = favorites.find((fav) => fav.id === destinationId);
    const destinationSequence = destinationFavorite?.sequence;

    if (!destinationSequence) return 10000;

    const destinationIndex = sortedIds.findIndex((id) => id === destinationId);

    if (edge === "reorder-above") {
      const prevSequence = sortedFavorites[destinationIndex - 1]?.sequence;
      if (prevSequence) {
        return (destinationSequence + prevSequence) / 2;
      } else {
        return destinationSequence + 10000;
      }
    } else {
      // reorder-below
      return destinationSequence - 10000;
    }
  };

  return {
    // Data
    favorites,
    groupedFavorites,
    existingFolders,

    // Fetch methods (backward compatible with MobX API)
    fetchFavorite: async (workspaceSlugParam: string) => {
      // The old MobX API took workspaceSlug as an argument
      // For backward compatibility, we accept it but don't use it since we get it from params
      await refetchFavorites();
    },
    fetchGroupedFavorites: async (workspaceSlugParam: string, favoriteId?: string) => {
      // For backward compatibility - refetch all favorites
      // The old MobX API took workspaceSlug and favoriteId
      await refetchFavorites();
    },

    // Mutation methods (backward compatible with MobX API)
    // These match the old MobX signatures: (workspaceSlug, ...args) => Promise
    addFavorite: async (workspaceSlugParam: string, data: Parameters<typeof addFavoriteMutation>[0]["data"]) => {
      return addFavoriteMutation({ workspaceSlug: workspaceSlugParam, data });
    },

    updateFavorite: async (
      workspaceSlugParam: string,
      favoriteId: string,
      data: Parameters<typeof updateFavoriteMutation>[0]["data"]
    ) => {
      return updateFavoriteMutation({ workspaceSlug: workspaceSlugParam, favoriteId, data });
    },

    deleteFavorite: async (workspaceSlugParam: string, favoriteId: string) => {
      return deleteFavoriteMutation({ workspaceSlug: workspaceSlugParam, favoriteId });
    },

    moveFavoriteToFolder: async (
      workspaceSlugParam: string,
      favoriteId: string,
      data: Parameters<typeof moveFavoriteToFolderMutation>[0]["data"]
    ) => {
      return moveFavoriteToFolderMutation({ workspaceSlug: workspaceSlugParam, favoriteId, data });
    },

    reOrderFavorite: async (
      workspaceSlugParam: string,
      favoriteId: string,
      destinationId: string,
      edge: string | undefined
    ) => {
      // Calculate sequence based on drop position (matching old MobX logic)
      const sequence = calculateReorderSequence(favoriteId, destinationId, edge);
      return reorderFavoriteMutation({ workspaceSlug: workspaceSlugParam, favoriteId, sequence });
    },

    removeFromFavoriteFolder: async (workspaceSlugParam: string, favoriteId: string) => {
      return removeFromFavoriteFolderMutation({ workspaceSlug: workspaceSlugParam, favoriteId });
    },

    // Utility methods
    getFavoriteById: (favoriteId: string) => getFavoriteById(favorites, favoriteId),
    getFavoriteByEntityId: (entityId: string) => getFavoriteByEntityId(favorites, entityId),
  };
}
