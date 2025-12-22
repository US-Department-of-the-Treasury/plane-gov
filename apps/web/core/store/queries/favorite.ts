"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { IFavorite } from "@plane/types";
import { FavoriteService } from "@/services/favorite";
import { queryKeys } from "./query-keys";

// Service instance
const favoriteService = new FavoriteService();

/**
 * Hook to fetch all favorites for a workspace.
 * Replaces MobX FavoriteStore.fetchFavorite for read operations.
 *
 * @example
 * const { data: favorites, isLoading } = useFavorites(workspaceSlug);
 */
export function useFavorites(workspaceSlug: string) {
  return useQuery({
    queryKey: queryKeys.favorites.all(workspaceSlug),
    queryFn: () => favoriteService.getFavorites(workspaceSlug),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch grouped favorites for a folder.
 * Replaces MobX FavoriteStore.fetchGroupedFavorites for read operations.
 *
 * @example
 * const { data: groupedFavorites, isLoading } = useGroupedFavorites(workspaceSlug, favoriteId);
 */
export function useGroupedFavorites(workspaceSlug: string, favoriteId: string) {
  return useQuery({
    queryKey: queryKeys.favorites.grouped(workspaceSlug, favoriteId),
    queryFn: () => favoriteService.getGroupedFavorites(workspaceSlug, favoriteId),
    enabled: !!workspaceSlug && !!favoriteId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export interface AddFavoriteParams {
  workspaceSlug: string;
  data: Partial<IFavorite>;
}

/**
 * Hook to add a new favorite with optimistic updates.
 * Replaces MobX FavoriteStore.addFavorite for write operations.
 *
 * @example
 * const { mutate: addFavorite, isPending } = useAddFavorite();
 * addFavorite({ workspaceSlug, data: { name: "My Favorite", entity_type: "project" } });
 */
export function useAddFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, data }: AddFavoriteParams) => favoriteService.addFavorite(workspaceSlug, data),
    onMutate: async ({ workspaceSlug, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.favorites.all(workspaceSlug) });

      const previousFavorites = queryClient.getQueryData<IFavorite[]>(queryKeys.favorites.all(workspaceSlug));

      // Optimistic update with temporary ID
      if (previousFavorites) {
        const optimisticFavorite: IFavorite = {
          id: `temp-${Date.now()}`,
          name: data.name ?? "",
          entity_type: data.entity_type ?? "project",
          entity_identifier: data.entity_identifier ?? null,
          entity_data: data.entity_data ?? { name: data.name ?? "" },
          parent: data.parent !== undefined ? data.parent : null,
          project_id: data.project_id ?? null,
          workspace_id: "",
          sequence: data.sequence ?? 10000,
          is_folder: data.is_folder ?? false,
          children: [],
          sort_order: previousFavorites.length + 1,
        };
        queryClient.setQueryData<IFavorite[]>(queryKeys.favorites.all(workspaceSlug), [
          ...previousFavorites,
          optimisticFavorite,
        ]);
      }

      return { previousFavorites, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousFavorites && context.workspaceSlug) {
        queryClient.setQueryData(queryKeys.favorites.all(context.workspaceSlug), context.previousFavorites);
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all(workspaceSlug) });
    },
  });
}

export interface UpdateFavoriteParams {
  workspaceSlug: string;
  favoriteId: string;
  data: Partial<IFavorite>;
}

/**
 * Hook to update a favorite with optimistic updates.
 * Replaces MobX FavoriteStore.updateFavorite for write operations.
 *
 * @example
 * const { mutate: updateFavorite, isPending } = useUpdateFavorite();
 * updateFavorite({ workspaceSlug, favoriteId, data: { name: "Updated Name" } });
 */
export function useUpdateFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, favoriteId, data }: UpdateFavoriteParams) =>
      favoriteService.updateFavorite(workspaceSlug, favoriteId, data),
    onMutate: async ({ workspaceSlug, favoriteId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.favorites.all(workspaceSlug) });

      const previousFavorites = queryClient.getQueryData<IFavorite[]>(queryKeys.favorites.all(workspaceSlug));

      if (previousFavorites) {
        queryClient.setQueryData<IFavorite[]>(
          queryKeys.favorites.all(workspaceSlug),
          previousFavorites.map((fav) => (fav.id === favoriteId ? { ...fav, ...data } : fav))
        );
      }

      return { previousFavorites, workspaceSlug, favoriteId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousFavorites && context.workspaceSlug) {
        queryClient.setQueryData(queryKeys.favorites.all(context.workspaceSlug), context.previousFavorites);
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all(workspaceSlug) });
    },
  });
}

export interface DeleteFavoriteParams {
  workspaceSlug: string;
  favoriteId: string;
}

/**
 * Hook to delete a favorite with optimistic updates.
 * Replaces MobX FavoriteStore.deleteFavorite for write operations.
 *
 * @example
 * const { mutate: deleteFavorite, isPending } = useDeleteFavorite();
 * deleteFavorite({ workspaceSlug, favoriteId });
 */
export function useDeleteFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, favoriteId }: DeleteFavoriteParams) =>
      favoriteService.deleteFavorite(workspaceSlug, favoriteId),
    onMutate: async ({ workspaceSlug, favoriteId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.favorites.all(workspaceSlug) });

      const previousFavorites = queryClient.getQueryData<IFavorite[]>(queryKeys.favorites.all(workspaceSlug));

      if (previousFavorites) {
        queryClient.setQueryData<IFavorite[]>(
          queryKeys.favorites.all(workspaceSlug),
          previousFavorites.filter((fav) => fav.id !== favoriteId)
        );
      }

      return { previousFavorites, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousFavorites && context.workspaceSlug) {
        queryClient.setQueryData(queryKeys.favorites.all(context.workspaceSlug), context.previousFavorites);
      }
    },
    onSettled: (_data, _error, { workspaceSlug, favoriteId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all(workspaceSlug) });
      void queryClient.removeQueries({ queryKey: queryKeys.favorites.grouped(workspaceSlug, favoriteId) });
    },
  });
}

export interface MoveFavoriteToFolderParams {
  workspaceSlug: string;
  favoriteId: string;
  data: Partial<IFavorite>;
}

/**
 * Hook to move a favorite to a folder with optimistic updates.
 * Replaces MobX FavoriteStore.moveFavoriteToFolder for write operations.
 *
 * @example
 * const { mutate: moveFavoriteToFolder, isPending } = useMoveFavoriteToFolder();
 * moveFavoriteToFolder({ workspaceSlug, favoriteId, data: { parent: parentId } });
 */
export function useMoveFavoriteToFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, favoriteId, data }: MoveFavoriteToFolderParams) =>
      favoriteService.updateFavorite(workspaceSlug, favoriteId, data),
    onMutate: async ({ workspaceSlug, favoriteId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.favorites.all(workspaceSlug) });

      const previousFavorites = queryClient.getQueryData<IFavorite[]>(queryKeys.favorites.all(workspaceSlug));

      if (previousFavorites) {
        queryClient.setQueryData<IFavorite[]>(
          queryKeys.favorites.all(workspaceSlug),
          previousFavorites.map((fav) => (fav.id === favoriteId ? { ...fav, parent: data.parent !== undefined ? data.parent : null } : fav))
        );
      }

      return { previousFavorites, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousFavorites && context.workspaceSlug) {
        queryClient.setQueryData(queryKeys.favorites.all(context.workspaceSlug), context.previousFavorites);
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all(workspaceSlug) });
    },
  });
}

export interface ReorderFavoriteParams {
  workspaceSlug: string;
  favoriteId: string;
  sequence: number;
}

/**
 * Hook to reorder a favorite with optimistic updates.
 * Replaces MobX FavoriteStore.reOrderFavorite for write operations.
 *
 * @example
 * const { mutate: reorderFavorite, isPending } = useReorderFavorite();
 * reorderFavorite({ workspaceSlug, favoriteId, sequence: 5000 });
 */
export function useReorderFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, favoriteId, sequence }: ReorderFavoriteParams) =>
      favoriteService.updateFavorite(workspaceSlug, favoriteId, { sequence }),
    onMutate: async ({ workspaceSlug, favoriteId, sequence }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.favorites.all(workspaceSlug) });

      const previousFavorites = queryClient.getQueryData<IFavorite[]>(queryKeys.favorites.all(workspaceSlug));

      if (previousFavorites) {
        queryClient.setQueryData<IFavorite[]>(
          queryKeys.favorites.all(workspaceSlug),
          previousFavorites.map((fav) => (fav.id === favoriteId ? { ...fav, sequence } : fav))
        );
      }

      return { previousFavorites, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousFavorites && context.workspaceSlug) {
        queryClient.setQueryData(queryKeys.favorites.all(context.workspaceSlug), context.previousFavorites);
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all(workspaceSlug) });
    },
  });
}

export interface RemoveFromFavoriteFolderParams {
  workspaceSlug: string;
  favoriteId: string;
}

/**
 * Hook to remove a favorite from a folder with optimistic updates.
 * Replaces MobX FavoriteStore.removeFromFavoriteFolder for write operations.
 *
 * @example
 * const { mutate: removeFromFolder, isPending } = useRemoveFromFavoriteFolder();
 * removeFromFolder({ workspaceSlug, favoriteId });
 */
export function useRemoveFromFavoriteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, favoriteId }: RemoveFromFavoriteFolderParams) =>
      favoriteService.updateFavorite(workspaceSlug, favoriteId, { parent: null }),
    onMutate: async ({ workspaceSlug, favoriteId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.favorites.all(workspaceSlug) });

      const previousFavorites = queryClient.getQueryData<IFavorite[]>(queryKeys.favorites.all(workspaceSlug));

      if (previousFavorites) {
        queryClient.setQueryData<IFavorite[]>(
          queryKeys.favorites.all(workspaceSlug),
          previousFavorites.map((fav) => (fav.id === favoriteId ? { ...fav, parent: null } : fav))
        );
      }

      return { previousFavorites, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousFavorites && context.workspaceSlug) {
        queryClient.setQueryData(queryKeys.favorites.all(context.workspaceSlug), context.previousFavorites);
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all(workspaceSlug) });
    },
  });
}

// Utility functions for derived data

/**
 * Get favorite by ID from a favorites array.
 *
 * @example
 * const { data: favorites } = useFavorites(workspaceSlug);
 * const favorite = getFavoriteById(favorites, favoriteId);
 */
export function getFavoriteById(
  favorites: IFavorite[] | undefined,
  favoriteId: string | null | undefined
): IFavorite | undefined {
  if (!favorites || !favoriteId) return undefined;
  return favorites.find((fav) => fav.id === favoriteId);
}

/**
 * Get favorite by entity identifier from a favorites array.
 *
 * @example
 * const { data: favorites } = useFavorites(workspaceSlug);
 * const favorite = getFavoriteByEntityId(favorites, entityId);
 */
export function getFavoriteByEntityId(
  favorites: IFavorite[] | undefined,
  entityId: string | null | undefined
): IFavorite | undefined {
  if (!favorites || !entityId) return undefined;
  return favorites.find((fav) => fav.entity_identifier === entityId);
}

/**
 * Get favorite folders from favorites array.
 *
 * @example
 * const { data: favorites } = useFavorites(workspaceSlug);
 * const folders = getFavoriteFolders(favorites);
 */
export function getFavoriteFolders(favorites: IFavorite[] | undefined): IFavorite[] {
  if (!favorites) return [];
  return favorites.filter((fav) => fav.is_folder);
}

/**
 * Get favorites by workspace ID from favorites array.
 *
 * @example
 * const { data: favorites } = useFavorites(workspaceSlug);
 * const workspaceFavorites = getFavoritesByWorkspace(favorites, workspaceId);
 */
export function getFavoritesByWorkspace(
  favorites: IFavorite[] | undefined,
  workspaceId: string | null | undefined
): IFavorite[] {
  if (!favorites || !workspaceId) return [];
  return favorites.filter((fav) => fav.workspace_id === workspaceId);
}

/**
 * Build a grouped/nested structure of favorites with children.
 *
 * @example
 * const { data: favorites } = useFavorites(workspaceSlug);
 * const grouped = groupFavorites(favorites);
 */
export function groupFavorites(favorites: IFavorite[] | undefined): { [favoriteId: string]: IFavorite } {
  if (!favorites) return {};

  const favoriteMap: { [favoriteId: string]: IFavorite } = {};

  // First pass: create a map of all favorites
  favorites.forEach((fav) => {
    favoriteMap[fav.id] = { ...fav, children: [] };
  });

  // Second pass: build parent-child relationships
  Object.values(favoriteMap).forEach((fav) => {
    if (fav.parent && favoriteMap[fav.parent]) {
      if (!favoriteMap[fav.parent].children.some((f) => f.id === fav.id)) {
        favoriteMap[fav.parent].children.push(fav);
      }
    }
  });

  return favoriteMap;
}
