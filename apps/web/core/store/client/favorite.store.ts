import { create } from "zustand";
import { orderBy, set, uniqBy } from "lodash-es";
import { v4 as uuidv4 } from "uuid";
import type { IFavorite } from "@plane/types";
import { FavoriteService } from "@/services/favorite";

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

// Service instance for legacy wrapper
const favoriteService = new FavoriteService();

/**
 * Legacy interface for backward compatibility with MobX store.
 */
export interface IFavoriteStore {
  favoriteIds: string[];
  favoriteMap: { [favoriteId: string]: IFavorite };
  entityMap: { [entityId: string]: IFavorite };
  existingFolders: string[];
  groupedFavorites: { [favoriteId: string]: IFavorite };
  fetchFavorite: (workspaceSlug: string) => Promise<IFavorite[]>;
  addFavorite: (workspaceSlug: string, data: Partial<IFavorite>) => Promise<IFavorite>;
  updateFavorite: (workspaceSlug: string, favoriteId: string, data: Partial<IFavorite>) => Promise<IFavorite>;
  deleteFavorite: (workspaceSlug: string, favoriteId: string) => Promise<void>;
  fetchGroupedFavorites: (workspaceSlug: string, favoriteId: string) => Promise<IFavorite[]>;
  moveFavoriteToFolder: (workspaceSlug: string, favoriteId: string, data: Partial<IFavorite>) => Promise<void>;
  removeFavoriteEntity: (workspaceSlug: string, entityId: string) => Promise<void>;
  reOrderFavorite: (workspaceSlug: string, favoriteId: string, destinationId: string, edge: string | undefined) => Promise<void>;
  removeFromFavoriteFolder: (workspaceSlug: string, favoriteId: string) => Promise<void>;
  removeFavoriteFromStore: (entity_identifier: string) => void;
}

/**
 * Legacy class wrapper for backward compatibility with MobX patterns.
 * Used by root.store.ts to maintain API compatibility during migration.
 * @deprecated Use TanStack Query hooks directly in React components
 */
export class FavoriteStoreLegacy implements IFavoriteStore {
  private rootStore: {
    workspaceRoot: { currentWorkspace: { id: string; slug: string } | null };
    projectView: { viewMap: Record<string, { is_favorite: boolean }> };
    epic: { epicMap: Record<string, { is_favorite: boolean }> };
    projectPages: { data: Record<string, { is_favorite: boolean }> };
    sprint: { sprintMap: Record<string, { is_favorite: boolean }> };
    projectRoot: { project: { projectMap: Record<string, { is_favorite: boolean }> } };
  };

  constructor(rootStore: any) {
    this.rootStore = rootStore;
  }

  get favoriteIds() {
    return useFavoriteStore.getState().favoriteIds;
  }

  get favoriteMap() {
    return useFavoriteStore.getState().favoriteMap;
  }

  get entityMap() {
    return useFavoriteStore.getState().entityMap;
  }

  get existingFolders() {
    return useFavoriteStore.getState().getExistingFolders();
  }

  get groupedFavorites() {
    const currentWorkspace = this.rootStore.workspaceRoot.currentWorkspace;
    if (!currentWorkspace) return {};
    return useFavoriteStore.getState().getGroupedFavorites(currentWorkspace.id);
  }

  fetchFavorite = async (workspaceSlug: string) => {
    const favorites = await favoriteService.getFavorites(workspaceSlug);
    useFavoriteStore.getState().syncFavorites(favorites);
    return favorites;
  };

  addFavorite = async (workspaceSlug: string, data: Partial<IFavorite>) => {
    data = { ...data, parent: null, is_folder: data.entity_type === "folder" };

    const { entityMap, syncFavorite, removeFavorite } = useFavoriteStore.getState();
    if (data.entity_identifier && entityMap[data.entity_identifier]) {
      return entityMap[data.entity_identifier];
    }

    const tempId = uuidv4();
    try {
      // Optimistic update
      syncFavorite({ id: tempId, ...data } as IFavorite);
      const response = await favoriteService.addFavorite(workspaceSlug, data);
      // Replace temp with real
      removeFavorite(tempId, data.entity_identifier);
      syncFavorite(response);
      return response;
    } catch (error) {
      removeFavorite(tempId, data.entity_identifier);
      throw error;
    }
  };

  updateFavorite = async (workspaceSlug: string, favoriteId: string, data: Partial<IFavorite>) => {
    const { favoriteMap, syncFavorite } = useFavoriteStore.getState();
    const initialState = favoriteMap[favoriteId];
    try {
      syncFavorite({ ...initialState, ...data } as IFavorite);
      const response = await favoriteService.updateFavorite(workspaceSlug, favoriteId, data);
      return response;
    } catch (error) {
      if (initialState) syncFavorite(initialState);
      throw error;
    }
  };

  moveFavoriteToFolder = async (workspaceSlug: string, favoriteId: string, data: Partial<IFavorite>) => {
    await favoriteService.updateFavorite(workspaceSlug, favoriteId, data);
    const { favoriteMap, syncFavorite } = useFavoriteStore.getState();
    syncFavorite({ ...favoriteMap[favoriteId], parent: data.parent ?? null });
  };

  reOrderFavorite = async (workspaceSlug: string, favoriteId: string, destinationId: string, edge: string | undefined) => {
    const { favoriteMap, syncFavorite } = useFavoriteStore.getState();
    let resultSequence = 10000;

    if (edge) {
      const sortedIds = orderBy(Object.values(favoriteMap), "sequence", "desc").map((fav: IFavorite) => fav.id);
      const destinationSequence = favoriteMap[destinationId]?.sequence || undefined;
      if (destinationSequence) {
        const destinationIndex = sortedIds.findIndex((id) => id === destinationId);
        if (edge === "reorder-above") {
          const prevSequence = favoriteMap[sortedIds[destinationIndex - 1]]?.sequence || undefined;
          if (prevSequence) {
            resultSequence = (destinationSequence + prevSequence) / 2;
          } else {
            resultSequence = destinationSequence + resultSequence;
          }
        } else {
          resultSequence = destinationSequence - resultSequence;
        }
      }
    }

    await favoriteService.updateFavorite(workspaceSlug, favoriteId, { sequence: resultSequence });
    syncFavorite({ ...favoriteMap[favoriteId], sequence: resultSequence });
  };

  removeFromFavoriteFolder = async (workspaceSlug: string, favoriteId: string) => {
    await favoriteService.updateFavorite(workspaceSlug, favoriteId, { parent: null });
    const { favoriteMap, syncFavorite } = useFavoriteStore.getState();
    syncFavorite({ ...favoriteMap[favoriteId], parent: null });
  };

  private removeFavoriteEntityFromStore = (entity_identifier: string, entity_type: string) => {
    const { projectView, epic, projectPages, sprint, projectRoot } = this.rootStore;
    switch (entity_type) {
      case "view":
        if (projectView.viewMap[entity_identifier]) {
          projectView.viewMap[entity_identifier].is_favorite = false;
        }
        break;
      case "epic":
        if (epic.epicMap[entity_identifier]) {
          epic.epicMap[entity_identifier].is_favorite = false;
        }
        break;
      case "page":
        if (projectPages.data[entity_identifier]) {
          projectPages.data[entity_identifier].is_favorite = false;
        }
        break;
      case "sprint":
        if (sprint.sprintMap[entity_identifier]) {
          sprint.sprintMap[entity_identifier].is_favorite = false;
        }
        break;
      case "project":
        if (projectRoot.project.projectMap[entity_identifier]) {
          projectRoot.project.projectMap[entity_identifier].is_favorite = false;
        }
        break;
    }
  };

  deleteFavorite = async (workspaceSlug: string, favoriteId: string) => {
    const { favoriteMap, removeFavorite, syncFavorite } = useFavoriteStore.getState();
    if (!favoriteMap[favoriteId]) return;

    const favorite = favoriteMap[favoriteId];
    const children = this.groupedFavorites[favoriteId]?.children;

    try {
      await favoriteService.deleteFavorite(workspaceSlug, favoriteId);
      removeFavorite(favoriteId, favorite.entity_identifier);

      if (favorite.entity_identifier) {
        this.removeFavoriteEntityFromStore(favorite.entity_identifier, favorite.entity_type);
      }
      if (children) {
        children.forEach((child) => {
          if (child.entity_identifier) {
            this.removeFavoriteEntityFromStore(child.entity_identifier, child.entity_type);
          }
        });
      }
    } catch (error) {
      syncFavorite(favorite);
      throw error;
    }
  };

  removeFavoriteEntity = async (workspaceSlug: string, entityId: string) => {
    const { entityMap } = useFavoriteStore.getState();
    const favoriteId = entityMap[entityId]?.id;
    if (favoriteId) {
      await this.deleteFavorite(workspaceSlug, favoriteId);
    }
  };

  removeFavoriteFromStore = (entity_identifier: string) => {
    const { favoriteMap, entityMap, removeFavorite } = useFavoriteStore.getState();
    const favoriteId = entityMap[entity_identifier]?.id;
    const oldData = favoriteMap[favoriteId];

    // Remove related favorites for the project
    const projectFavorites = Object.values(favoriteMap).filter(
      (fav) => fav.project_id === entity_identifier && fav.entity_type !== "project"
    );
    projectFavorites.forEach((fav) => {
      if (fav.entity_identifier) {
        this.removeFavoriteFromStore(fav.entity_identifier);
        this.removeFavoriteEntityFromStore(fav.entity_identifier, fav.entity_type);
      }
    });

    if (!favoriteId) return;
    removeFavorite(favoriteId, entity_identifier);
    if (oldData) {
      this.removeFavoriteEntityFromStore(entity_identifier, oldData.entity_type);
    }
  };

  fetchGroupedFavorites = async (workspaceSlug: string, favoriteId: string) => {
    if (!favoriteId) return [];
    const response = await favoriteService.getGroupedFavorites(workspaceSlug, favoriteId);
    useFavoriteStore.getState().syncFavorites(response);
    return response;
  };
}
