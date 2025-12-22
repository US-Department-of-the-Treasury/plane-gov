import { set as lodashSet } from "lodash-es";
import { create } from "zustand";
import type { TProjectDisplayFilters, TProjectFilters, TProjectAppliedDisplayFilterKeys } from "@plane/types";

interface ProjectFilterState {
  // State
  displayFilters: Record<string, TProjectDisplayFilters>;
  filters: Record<string, TProjectFilters>;
  searchQuery: string;
}

interface ProjectFilterActions {
  // Getters
  getDisplayFiltersByWorkspaceSlug: (workspaceSlug: string) => TProjectDisplayFilters | undefined;
  getFiltersByWorkspaceSlug: (workspaceSlug: string) => TProjectFilters | undefined;
  getCurrentWorkspaceDisplayFilters: (workspaceSlug?: string) => TProjectDisplayFilters | undefined;
  getCurrentWorkspaceAppliedDisplayFilters: (workspaceSlug?: string) => TProjectAppliedDisplayFilterKeys[] | undefined;
  getCurrentWorkspaceFilters: (workspaceSlug?: string) => TProjectFilters | undefined;
  // Actions
  initWorkspaceFilters: (workspaceSlug: string) => void;
  updateDisplayFilters: (workspaceSlug: string, displayFilters: TProjectDisplayFilters) => void;
  updateFilters: (workspaceSlug: string, filters: TProjectFilters) => void;
  updateSearchQuery: (query: string) => void;
  clearAllFilters: (workspaceSlug: string) => void;
  clearAllAppliedDisplayFilters: (workspaceSlug: string) => void;
}

export type ProjectFilterStore = ProjectFilterState & ProjectFilterActions;

const initialState: ProjectFilterState = {
  displayFilters: {},
  filters: {},
  searchQuery: "",
};

export const useProjectFilterStore = create<ProjectFilterStore>()((set, get) => ({
  ...initialState,

  // Getters
  getDisplayFiltersByWorkspaceSlug: (workspaceSlug) => get().displayFilters[workspaceSlug],

  getFiltersByWorkspaceSlug: (workspaceSlug) => get().filters[workspaceSlug],

  getCurrentWorkspaceDisplayFilters: (workspaceSlug) => {
    if (!workspaceSlug) return undefined;
    return get().displayFilters[workspaceSlug];
  },

  getCurrentWorkspaceAppliedDisplayFilters: (workspaceSlug) => {
    if (!workspaceSlug) return undefined;
    const displayFilters = get().displayFilters[workspaceSlug];
    if (!displayFilters) return undefined;

    return Object.keys(displayFilters).filter(
      (key): key is TProjectAppliedDisplayFilterKeys =>
        ["my_projects", "archived_projects"].includes(key) && !!displayFilters[key as keyof TProjectDisplayFilters]
    );
  },

  getCurrentWorkspaceFilters: (workspaceSlug) => {
    if (!workspaceSlug) return undefined;
    return get().filters[workspaceSlug];
  },

  // Actions
  initWorkspaceFilters: (workspaceSlug) => {
    const state = get();
    const displayFilters = state.displayFilters[workspaceSlug];

    set((state) => {
      const newDisplayFilters = { ...state.displayFilters };
      newDisplayFilters[workspaceSlug] = {
        order_by: displayFilters?.order_by || "created_at",
      };

      const newFilters = { ...state.filters };
      newFilters[workspaceSlug] = newFilters[workspaceSlug] ?? {};

      return {
        displayFilters: newDisplayFilters,
        filters: newFilters,
      };
    });
  },

  updateDisplayFilters: (workspaceSlug, displayFilters) => {
    set((state) => {
      const newDisplayFilters = { ...state.displayFilters };
      Object.keys(displayFilters).forEach((key) => {
        lodashSet(newDisplayFilters, [workspaceSlug, key], displayFilters[key as keyof TProjectDisplayFilters]);
      });
      return { displayFilters: newDisplayFilters };
    });
  },

  updateFilters: (workspaceSlug, filters) => {
    set((state) => {
      const newFilters = { ...state.filters };
      Object.keys(filters).forEach((key) => {
        lodashSet(newFilters, [workspaceSlug, key], filters[key as keyof TProjectFilters]);
      });
      return { filters: newFilters };
    });
  },

  updateSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  clearAllFilters: (workspaceSlug) => {
    set((state) => {
      const newFilters = { ...state.filters };
      newFilters[workspaceSlug] = {};
      return { filters: newFilters };
    });
  },

  clearAllAppliedDisplayFilters: (workspaceSlug) => {
    const appliedFilters = get().getCurrentWorkspaceAppliedDisplayFilters(workspaceSlug);
    if (!appliedFilters) return;

    set((state) => {
      const newDisplayFilters = { ...state.displayFilters };
      appliedFilters.forEach((key) => {
        lodashSet(newDisplayFilters, [workspaceSlug, key], false);
      });
      return { displayFilters: newDisplayFilters };
    });
  },
}));
