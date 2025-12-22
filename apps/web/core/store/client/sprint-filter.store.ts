import { set as lodashSet } from "lodash-es";
import { create } from "zustand";
import type { TSprintDisplayFilters, TSprintFilters, TSprintFiltersByState } from "@plane/types";

interface SprintFilterState {
  // State
  displayFilters: Record<string, TSprintDisplayFilters>;
  filters: Record<string, TSprintFiltersByState>;
  searchQuery: string;
  archivedSprintsSearchQuery: string;
}

interface SprintFilterActions {
  // Getters
  getDisplayFiltersByProjectId: (projectId: string) => TSprintDisplayFilters | undefined;
  getFiltersByProjectId: (projectId: string) => TSprintFilters | undefined;
  getArchivedFiltersByProjectId: (projectId: string) => TSprintFilters | undefined;
  getCurrentProjectDisplayFilters: (projectId?: string) => TSprintDisplayFilters | undefined;
  getCurrentProjectFilters: (projectId?: string) => TSprintFilters | undefined;
  getCurrentProjectArchivedFilters: (projectId?: string) => TSprintFilters | undefined;
  // Actions
  initProjectSprintFilters: (projectId: string) => void;
  updateDisplayFilters: (projectId: string, displayFilters: TSprintDisplayFilters) => void;
  updateFilters: (projectId: string, filters: TSprintFilters, state?: keyof TSprintFiltersByState) => void;
  updateSearchQuery: (query: string) => void;
  updateArchivedSprintsSearchQuery: (query: string) => void;
  clearAllFilters: (projectId: string, state?: keyof TSprintFiltersByState) => void;
}

export type SprintFilterStore = SprintFilterState & SprintFilterActions;

const initialState: SprintFilterState = {
  displayFilters: {},
  filters: {},
  searchQuery: "",
  archivedSprintsSearchQuery: "",
};

export const useSprintFilterStore = create<SprintFilterStore>()((set, get) => ({
  ...initialState,

  // Getters
  getDisplayFiltersByProjectId: (projectId) => get().displayFilters[projectId],

  getFiltersByProjectId: (projectId) => get().filters[projectId]?.default ?? {},

  getArchivedFiltersByProjectId: (projectId) => get().filters[projectId]?.archived,

  getCurrentProjectDisplayFilters: (projectId) => {
    if (!projectId) return undefined;
    return get().displayFilters[projectId];
  },

  getCurrentProjectFilters: (projectId) => {
    if (!projectId) return undefined;
    return get().filters[projectId]?.default ?? {};
  },

  getCurrentProjectArchivedFilters: (projectId) => {
    if (!projectId) return undefined;
    return get().filters[projectId]?.archived;
  },

  // Actions
  initProjectSprintFilters: (projectId) => {
    const state = get();
    const displayFilters = state.displayFilters[projectId];

    set((state) => {
      const newDisplayFilters = { ...state.displayFilters };
      newDisplayFilters[projectId] = {
        active_tab: displayFilters?.active_tab || "active",
        layout: displayFilters?.layout || "list",
      };

      const newFilters = { ...state.filters };
      newFilters[projectId] = newFilters[projectId] ?? {
        default: {},
        archived: {},
      };

      return {
        displayFilters: newDisplayFilters,
        filters: newFilters,
      };
    });
  },

  updateDisplayFilters: (projectId, displayFilters) => {
    set((state) => {
      const newDisplayFilters = { ...state.displayFilters };
      Object.keys(displayFilters).forEach((key) => {
        lodashSet(newDisplayFilters, [projectId, key], displayFilters[key as keyof TSprintDisplayFilters]);
      });
      return { displayFilters: newDisplayFilters };
    });
  },

  updateFilters: (projectId, filters, state = "default") => {
    set((prevState) => {
      const newFilters = { ...prevState.filters };
      Object.keys(filters).forEach((key) => {
        lodashSet(newFilters, [projectId, state, key], filters[key as keyof TSprintFilters]);
      });
      return { filters: newFilters };
    });
  },

  updateSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  updateArchivedSprintsSearchQuery: (query) => {
    set({ archivedSprintsSearchQuery: query });
  },

  clearAllFilters: (projectId, state = "default") => {
    set((prevState) => {
      const newFilters = { ...prevState.filters };

      if (newFilters[projectId]) {
        newFilters[projectId] = {
          ...newFilters[projectId],
          [state]: {},
        };
      }

      return { filters: newFilters };
    });
  },
}));
