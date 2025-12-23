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

/**
 * Legacy interface for backward compatibility with MobX store.
 */
export interface ISprintFilterStore {
  displayFilters: Record<string, TSprintDisplayFilters>;
  filters: Record<string, TSprintFiltersByState>;
  searchQuery: string;
  archivedSprintsSearchQuery: string;
  currentProjectDisplayFilters: TSprintDisplayFilters | undefined;
  currentProjectFilters: TSprintFilters | undefined;
  currentProjectArchivedFilters: TSprintFilters | undefined;
  getDisplayFiltersByProjectId: (projectId: string) => TSprintDisplayFilters | undefined;
  getFiltersByProjectId: (projectId: string) => TSprintFilters | undefined;
  getArchivedFiltersByProjectId: (projectId: string) => TSprintFilters | undefined;
  updateDisplayFilters: (projectId: string, displayFilters: TSprintDisplayFilters) => void;
  updateFilters: (projectId: string, filters: TSprintFilters, state?: keyof TSprintFiltersByState) => void;
  updateSearchQuery: (query: string) => void;
  updateArchivedSprintsSearchQuery: (query: string) => void;
  clearAllFilters: (projectId: string, state?: keyof TSprintFiltersByState) => void;
}

/**
 * Legacy class wrapper for backward compatibility with MobX patterns.
 * @deprecated Use useSprintFilterStore hook directly in React components
 */
export class SprintFilterStoreLegacy implements ISprintFilterStore {
  private rootStore: {
    router: { projectId: string | null };
  };

  constructor(rootStore: any) {
    this.rootStore = rootStore;
  }

  get displayFilters() {
    return useSprintFilterStore.getState().displayFilters;
  }

  get filters() {
    return useSprintFilterStore.getState().filters;
  }

  get searchQuery() {
    return useSprintFilterStore.getState().searchQuery;
  }

  get archivedSprintsSearchQuery() {
    return useSprintFilterStore.getState().archivedSprintsSearchQuery;
  }

  get currentProjectDisplayFilters() {
    const projectId = this.rootStore.router.projectId;
    return useSprintFilterStore.getState().getCurrentProjectDisplayFilters(projectId ?? undefined);
  }

  get currentProjectFilters() {
    const projectId = this.rootStore.router.projectId;
    return useSprintFilterStore.getState().getCurrentProjectFilters(projectId ?? undefined);
  }

  get currentProjectArchivedFilters() {
    const projectId = this.rootStore.router.projectId;
    return useSprintFilterStore.getState().getCurrentProjectArchivedFilters(projectId ?? undefined);
  }

  getDisplayFiltersByProjectId = (projectId: string) => {
    return useSprintFilterStore.getState().getDisplayFiltersByProjectId(projectId);
  };

  getFiltersByProjectId = (projectId: string) => {
    return useSprintFilterStore.getState().getFiltersByProjectId(projectId);
  };

  getArchivedFiltersByProjectId = (projectId: string) => {
    return useSprintFilterStore.getState().getArchivedFiltersByProjectId(projectId);
  };

  updateDisplayFilters = (projectId: string, displayFilters: TSprintDisplayFilters) => {
    useSprintFilterStore.getState().updateDisplayFilters(projectId, displayFilters);
  };

  updateFilters = (projectId: string, filters: TSprintFilters, state?: keyof TSprintFiltersByState) => {
    useSprintFilterStore.getState().updateFilters(projectId, filters, state);
  };

  updateSearchQuery = (query: string) => {
    useSprintFilterStore.getState().updateSearchQuery(query);
  };

  updateArchivedSprintsSearchQuery = (query: string) => {
    useSprintFilterStore.getState().updateArchivedSprintsSearchQuery(query);
  };

  clearAllFilters = (projectId: string, state?: keyof TSprintFiltersByState) => {
    useSprintFilterStore.getState().clearAllFilters(projectId, state);
  };
}
