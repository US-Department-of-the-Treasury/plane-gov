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
