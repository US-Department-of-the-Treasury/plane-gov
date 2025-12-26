import { create } from "zustand";
import { uniqBy } from "lodash-es";
import type { IFavorite } from "@plane/types";

/**
 * Favorite state managed by Zustand.
 * Server data is fetched via TanStack Query, but we maintain a local cache
 * for synchronous access and imperative operations.
 */
interface FavoriteStoreState {
  favoriteIds: string[];
  favoriteMap: { [favoriteId: string]: IFavorite };
  entityMap: { [entityId: string]: IFavorite };
}

interface FavoriteStoreActions {
  // Sync actions
  syncFavorites: (favorites: IFavorite[]) => void;
  syncFavorite: (favorite: IFavorite) => void;
  removeFavorite: (favoriteId: string, entityIdentifier?: string | null) => void;
  // Getters
  getFavoriteById: (favoriteId: string) => IFavorite | undefined;
  getFavoriteByEntityId: (entityId: string) => IFavorite | undefined;
  getWorkspaceFavorites: (workspaceId: string) => { [favoriteId: string]: IFavorite };
  getExistingFolders: () => string[];
  getGroupedFavorites: (workspaceId: string) => { [favoriteId: string]: IFavorite };
}

export type FavoriteStore = FavoriteStoreState & FavoriteStoreActions;

const initialState: FavoriteStoreState = {
  favoriteIds: [],
  favoriteMap: {},
  entityMap: {},
};

export const useFavoriteStore = create<FavoriteStore>()((set, get) => ({
  ...initialState,

  syncFavorites: (favorites) => {
    set((state) => {
      const newFavoriteMap = { ...state.favoriteMap };
      const newEntityMap = { ...state.entityMap };
      const newFavoriteIds = [...state.favoriteIds];

      favorites.forEach((favorite) => {
        newFavoriteMap[favorite.id] = favorite;
        if (favorite.entity_identifier) {
          newEntityMap[favorite.entity_identifier] = favorite;
        }
        if (!newFavoriteIds.includes(favorite.id)) {
          newFavoriteIds.push(favorite.id);
        }
      });

      return {
        favoriteMap: newFavoriteMap,
        entityMap: newEntityMap,
        favoriteIds: uniqBy(newFavoriteIds, (id) => id) as string[],
      };
    });
  },

  syncFavorite: (favorite) => {
    set((state) => ({
      favoriteMap: { ...state.favoriteMap, [favorite.id]: favorite },
      entityMap: favorite.entity_identifier
        ? { ...state.entityMap, [favorite.entity_identifier]: favorite }
        : state.entityMap,
      favoriteIds: state.favoriteIds.includes(favorite.id)
        ? state.favoriteIds
        : [favorite.id, ...state.favoriteIds],
    }));
  },

  removeFavorite: (favoriteId, entityIdentifier) => {
    set((state) => {
      const newFavoriteMap = { ...state.favoriteMap };
      const newEntityMap = { ...state.entityMap };
      delete newFavoriteMap[favoriteId];
      if (entityIdentifier) {
        delete newEntityMap[entityIdentifier];
      }
      return {
        favoriteMap: newFavoriteMap,
        entityMap: newEntityMap,
        favoriteIds: state.favoriteIds.filter((id) => id !== favoriteId),
      };
    });
  },

  getFavoriteById: (favoriteId) => {
    return get().favoriteMap[favoriteId];
  },

  getFavoriteByEntityId: (entityId) => {
    return get().entityMap[entityId];
  },

  getWorkspaceFavorites: (workspaceId) => {
    const { favoriteMap } = get();
    return Object.values(favoriteMap)
      .filter((fav) => fav.workspace_id === workspaceId)
      .reduce(
        (acc, fav) => {
          acc[fav.id] = fav;
          return acc;
        },
        {} as { [favoriteId: string]: IFavorite }
      );
  },

  getExistingFolders: () => {
    return Object.values(get().favoriteMap).map((fav) => fav.name);
  },

  getGroupedFavorites: (workspaceId) => {
    const workspaceFavorites = get().getWorkspaceFavorites(workspaceId);
    const data: { [favoriteId: string]: IFavorite } = JSON.parse(JSON.stringify(workspaceFavorites));

    Object.values(data).forEach((fav) => {
      if (fav.parent && data[fav.parent]) {
        if (data[fav.parent].children) {
          if (!data[fav.parent].children.some((f) => f.id === fav.id)) {
            data[fav.parent].children.push(fav);
          }
        } else {
          data[fav.parent].children = [fav];
        }
      }
    });
    return data;
  },
}));

/**
 * Legacy interface for backward compatibility.
 * @deprecated Use FavoriteStore type directly
 */
export interface IFavoriteStore {
  favoriteIds: string[];
  favoriteMap: { [favoriteId: string]: IFavorite };
  entityMap: { [entityId: string]: IFavorite };
  existingFolders: string[];
  groupedFavorites: { [favoriteId: string]: IFavorite };
}
