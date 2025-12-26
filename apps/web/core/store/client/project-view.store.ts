import { create } from "zustand";
import type { IProjectView, TViewFilters } from "@plane/types";
import { getValidatedViewFilters, getViewName, orderViews, shouldFilterView } from "@plane/utils";
import { ViewService } from "@/plane-web/services";
import { FavoriteService } from "@/services/favorite";
import { getRouterProjectId } from "./router.store";
import { useFavoriteStore } from "./favorite.store";

// Service instances at module level
const favoriteService = new FavoriteService();

/**
 * Project view state managed by Zustand.
 */
interface ProjectViewStoreState {
  loader: boolean;
  fetchedMap: Record<string, boolean>;
  viewMap: Record<string, IProjectView>;
  filters: TViewFilters;
}

interface ProjectViewStoreActions {
  // Sync actions
  setLoader: (loader: boolean) => void;
  setFetched: (projectId: string, fetched: boolean) => void;
  syncView: (view: IProjectView) => void;
  syncViews: (views: IProjectView[], projectId: string) => void;
  removeView: (viewId: string) => void;
  updateViewField: <K extends keyof IProjectView>(viewId: string, field: K, value: IProjectView[K]) => void;
  updateFilters: <T extends keyof TViewFilters>(filterKey: T, filterValue: TViewFilters[T]) => void;
  clearAllFilters: () => void;
  // Getters
  getViewById: (viewId: string) => IProjectView | null;
  getProjectViews: (projectId: string) => IProjectView[] | undefined;
  getFilteredProjectViews: (projectId: string) => IProjectView[] | undefined;
  getProjectViewIds: (projectId: string | null) => string[] | null;
}

export type ProjectViewStore = ProjectViewStoreState & ProjectViewStoreActions;

const initialState: ProjectViewStoreState = {
  loader: false,
  fetchedMap: {},
  viewMap: {},
  filters: { searchQuery: "", sortBy: "desc", sortKey: "updated_at" },
};

export const useProjectViewStore = create<ProjectViewStore>()((set, get) => ({
  ...initialState,

  setLoader: (loader) => set({ loader }),

  setFetched: (projectId, fetched) => {
    set((state) => ({ fetchedMap: { ...state.fetchedMap, [projectId]: fetched } }));
  },

  syncView: (view) => {
    set((state) => ({
      viewMap: { ...state.viewMap, [view.id]: view },
    }));
  },

  syncViews: (views, projectId) => {
    set((state) => {
      const newMap = { ...state.viewMap };
      views.forEach((view) => {
        newMap[view.id] = view;
      });
      return {
        viewMap: newMap,
        fetchedMap: { ...state.fetchedMap, [projectId]: true },
      };
    });
  },

  removeView: (viewId) => {
    set((state) => {
      const newMap = { ...state.viewMap };
      delete newMap[viewId];
      return { viewMap: newMap };
    });
  },

  updateViewField: (viewId, field, value) => {
    set((state) => {
      if (!state.viewMap[viewId]) return state;
      return {
        viewMap: {
          ...state.viewMap,
          [viewId]: { ...state.viewMap[viewId], [field]: value },
        },
      };
    });
  },

  updateFilters: (filterKey, filterValue) => {
    set((state) => ({
      filters: { ...state.filters, [filterKey]: filterValue },
    }));
  },

  clearAllFilters: () => {
    set((state) => ({
      filters: { ...state.filters, filters: {} },
    }));
  },

  getViewById: (viewId) => {
    return get().viewMap?.[viewId] ?? null;
  },

  getProjectViews: (projectId) => {
    const { viewMap, fetchedMap, filters } = get();
    if (!fetchedMap[projectId]) return undefined;

    let filteredViews = Object.values(viewMap ?? {}).filter((view) => view?.project === projectId);
    filteredViews = orderViews(filteredViews, filters.sortKey, filters.sortBy);
    return filteredViews ?? undefined;
  },

  getFilteredProjectViews: (projectId) => {
    const { viewMap, fetchedMap, filters } = get();
    if (!fetchedMap[projectId]) return undefined;

    let filteredViews = Object.values(viewMap ?? {}).filter(
      (view) =>
        view?.project === projectId &&
        getViewName(view.name).toLowerCase().includes(filters.searchQuery.toLowerCase()) &&
        shouldFilterView(view, filters.filters)
    );
    filteredViews = orderViews(filteredViews, filters.sortKey, filters.sortBy);
    return filteredViews ?? undefined;
  },

  getProjectViewIds: (projectId) => {
    if (!projectId) return null;
    const { viewMap, fetchedMap } = get();
    if (!fetchedMap[projectId]) return null;
    return Object.keys(viewMap ?? {})?.filter((viewId) => viewMap?.[viewId]?.project === projectId);
  },
}));

// Service instance
const viewService = new ViewService();

/**
 * Legacy interface for backward compatibility with MobX store.
 */
export interface IProjectViewStore {
  loader: boolean;
  fetchedMap: Record<string, boolean>;
  viewMap: Record<string, IProjectView>;
  filters: TViewFilters;
  projectViewIds: string[] | null;
  getProjectViews: (projectId: string) => IProjectView[] | undefined;
  getFilteredProjectViews: (projectId: string) => IProjectView[] | undefined;
  getViewById: (viewId: string) => IProjectView | null;
  fetchViews: (workspaceSlug: string, projectId: string) => Promise<undefined | IProjectView[]>;
  fetchViewDetails: (workspaceSlug: string, projectId: string, viewId: string) => Promise<IProjectView>;
  createView: (workspaceSlug: string, projectId: string, data: Partial<IProjectView>) => Promise<IProjectView>;
  updateView: (
    workspaceSlug: string,
    projectId: string,
    viewId: string,
    data: Partial<IProjectView>
  ) => Promise<IProjectView>;
  deleteView: (workspaceSlug: string, projectId: string, viewId: string) => Promise<any>;
  updateFilters: <T extends keyof TViewFilters>(filterKey: T, filterValue: TViewFilters[T]) => void;
  clearAllFilters: () => void;
  addViewToFavorites: (workspaceSlug: string, projectId: string, viewId: string) => Promise<any>;
  removeViewFromFavorites: (workspaceSlug: string, projectId: string, viewId: string) => Promise<any>;
}

/**
 * Legacy class wrapper for backward compatibility with MobX patterns.
 * @deprecated Use useProjectViewStore hook directly in React components
 */
export class ProjectViewStoreLegacy implements IProjectViewStore {
  constructor(_rootStore?: unknown) {
    // rootStore no longer needed - using direct Zustand store access
  }

  get loader() {
    return useProjectViewStore.getState().loader;
  }

  get fetchedMap() {
    return useProjectViewStore.getState().fetchedMap;
  }

  get viewMap() {
    return useProjectViewStore.getState().viewMap;
  }

  get filters() {
    return useProjectViewStore.getState().filters;
  }

  get projectViewIds() {
    const projectId = getRouterProjectId();
    return useProjectViewStore.getState().getProjectViewIds(projectId);
  }

  getProjectViews = (projectId: string) => {
    return useProjectViewStore.getState().getProjectViews(projectId);
  };

  getFilteredProjectViews = (projectId: string) => {
    return useProjectViewStore.getState().getFilteredProjectViews(projectId);
  };

  getViewById = (viewId: string) => {
    return useProjectViewStore.getState().getViewById(viewId);
  };

  updateFilters = <T extends keyof TViewFilters>(filterKey: T, filterValue: TViewFilters[T]) => {
    useProjectViewStore.getState().updateFilters(filterKey, filterValue);
  };

  clearAllFilters = () => {
    useProjectViewStore.getState().clearAllFilters();
  };

  fetchViews = async (workspaceSlug: string, projectId: string) => {
    const { setLoader, syncViews } = useProjectViewStore.getState();
    try {
      setLoader(true);
      const response = await viewService.getViews(workspaceSlug, projectId);
      syncViews(response, projectId);
      setLoader(false);
      return response;
    } catch (error) {
      setLoader(false);
      return undefined;
    }
  };

  fetchViewDetails = async (workspaceSlug: string, projectId: string, viewId: string): Promise<IProjectView> => {
    const response = await viewService.getViewDetails(workspaceSlug, projectId, viewId);
    useProjectViewStore.getState().syncView(response);
    return response;
  };

  createView = async (workspaceSlug: string, projectId: string, data: Partial<IProjectView>): Promise<IProjectView> => {
    const response = await viewService.createView(workspaceSlug, projectId, getValidatedViewFilters(data));
    useProjectViewStore.getState().syncView(response);
    return response;
  };

  updateView = async (
    workspaceSlug: string,
    projectId: string,
    viewId: string,
    data: Partial<IProjectView>
  ): Promise<IProjectView> => {
    const { viewMap, syncView } = useProjectViewStore.getState();
    const currentView = viewMap[viewId];

    // Optimistic update
    if (currentView) {
      syncView({ ...currentView, ...data } as IProjectView);
    }

    const response = await viewService.patchView(workspaceSlug, projectId, viewId, data);
    return response;
  };

  deleteView = async (workspaceSlug: string, projectId: string, viewId: string): Promise<any> => {
    await viewService.deleteView(workspaceSlug, projectId, viewId);
    useProjectViewStore.getState().removeView(viewId);
    if (useFavoriteStore.getState().entityMap[viewId]) {
      useFavoriteStore.getState().removeFavorite(viewId);
    }
  };

  addViewToFavorites = async (workspaceSlug: string, projectId: string, viewId: string) => {
    const { getViewById, updateViewField, viewMap } = useProjectViewStore.getState();
    try {
      const currentView = getViewById(viewId);
      if (currentView?.is_favorite) return;
      updateViewField(viewId, "is_favorite", true);
      await favoriteService.addFavorite(workspaceSlug.toString(), {
        entity_type: "view",
        entity_identifier: viewId,
        project_id: projectId,
        entity_data: { name: viewMap[viewId].name || "" },
      });
    } catch (error) {
      console.error("Failed to add view to favorites in view store", error);
      updateViewField(viewId, "is_favorite", false);
    }
  };

  removeViewFromFavorites = async (workspaceSlug: string, projectId: string, viewId: string) => {
    const { getViewById, updateViewField } = useProjectViewStore.getState();
    try {
      const currentView = getViewById(viewId);
      if (!currentView?.is_favorite) return;
      updateViewField(viewId, "is_favorite", false);
      await favoriteService.removeFavoriteEntity(workspaceSlug, viewId);
    } catch (error) {
      console.error("Failed to remove view from favorites in view store", error);
      updateViewField(viewId, "is_favorite", true);
    }
  };
}
