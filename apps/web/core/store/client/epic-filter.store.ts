import { set as lodashSet } from "lodash-es";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { TEpicDisplayFilters, TEpicFilters, TEpicFiltersByState } from "@plane/types";

// localStorage keys (matching MobX store for migration compatibility)
const EPIC_DISPLAY_FILTERS_KEY = "epic_display_filters";
const EPIC_FILTERS_KEY = "epic_filters";

interface EpicFilterState {
  // State
  displayFilters: Record<string, TEpicDisplayFilters>;
  filters: Record<string, TEpicFiltersByState>;
  searchQuery: string;
  archivedEpicsSearchQuery: string;
}

interface EpicFilterActions {
  // Getters
  getDisplayFiltersByProjectId: (projectId: string) => TEpicDisplayFilters | undefined;
  getFiltersByProjectId: (projectId: string) => TEpicFilters | undefined;
  getArchivedFiltersByProjectId: (projectId: string) => TEpicFilters | undefined;
  getCurrentProjectDisplayFilters: (projectId?: string) => TEpicDisplayFilters | undefined;
  getCurrentProjectFilters: (projectId?: string) => TEpicFilters | undefined;
  getCurrentProjectArchivedFilters: (projectId?: string) => TEpicFilters | undefined;
  // Actions
  initProjectEpicFilters: (projectId: string) => void;
  updateDisplayFilters: (projectId: string, displayFilters: TEpicDisplayFilters) => void;
  updateFilters: (projectId: string, filters: TEpicFilters, state?: keyof TEpicFiltersByState) => void;
  updateSearchQuery: (query: string) => void;
  updateArchivedEpicsSearchQuery: (query: string) => void;
  clearAllFilters: (projectId: string, state?: keyof TEpicFiltersByState) => void;
}

export type EpicFilterStore = EpicFilterState & EpicFilterActions;

// Helper to load from legacy localStorage
const loadLegacyStorage = (): Partial<EpicFilterState> => {
  if (typeof window === "undefined") return {};

  try {
    const displayFiltersData = localStorage.getItem(EPIC_DISPLAY_FILTERS_KEY);
    const filtersData = localStorage.getItem(EPIC_FILTERS_KEY);

    const result: Partial<EpicFilterState> = {};

    if (displayFiltersData) {
      const parsed = JSON.parse(displayFiltersData);
      if (typeof parsed === "object" && parsed !== null) {
        result.displayFilters = parsed;
      }
    }

    if (filtersData) {
      const parsed = JSON.parse(filtersData);
      if (typeof parsed === "object" && parsed !== null) {
        result.filters = parsed;
      }
    }

    return result;
  } catch (error) {
    console.error("Failed to load epic filters from localStorage:", error);
    return {};
  }
};

const initialState: EpicFilterState = {
  displayFilters: {},
  filters: {},
  searchQuery: "",
  archivedEpicsSearchQuery: "",
  ...loadLegacyStorage(),
};

export const useEpicFilterStore = create<EpicFilterStore>()(
  persist(
    (set, get) => ({
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
      initProjectEpicFilters: (projectId) => {
        const state = get();
        const displayFilters = state.displayFilters[projectId];

        set((state) => {
          const newDisplayFilters = { ...state.displayFilters };
          newDisplayFilters[projectId] = {
            favorites: displayFilters?.favorites || false,
            layout: displayFilters?.layout || "list",
            order_by: displayFilters?.order_by || "name",
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

        // Also write to legacy localStorage keys for backward compatibility
        const updatedState = get();
        localStorage.setItem(EPIC_DISPLAY_FILTERS_KEY, JSON.stringify(updatedState.displayFilters));
        localStorage.setItem(EPIC_FILTERS_KEY, JSON.stringify(updatedState.filters));
      },

      updateDisplayFilters: (projectId, displayFilters) => {
        set((state) => {
          const newDisplayFilters = { ...state.displayFilters };
          Object.keys(displayFilters).forEach((key) => {
            // Use string path for proper Zustand reactivity
            lodashSet(newDisplayFilters, `${projectId}.${key}`, displayFilters[key as keyof TEpicDisplayFilters]);
          });
          return { displayFilters: newDisplayFilters };
        });

        // Write to legacy localStorage
        localStorage.setItem(EPIC_DISPLAY_FILTERS_KEY, JSON.stringify(get().displayFilters));
      },

      updateFilters: (projectId, filters, state = "default") => {
        set((prevState) => {
          const newFilters = { ...prevState.filters };
          Object.keys(filters).forEach((key) => {
            // Use string path for proper Zustand reactivity
            lodashSet(newFilters, `${projectId}.${state}.${key}`, filters[key as keyof TEpicFilters]);
          });
          return { filters: newFilters };
        });

        // Write to legacy localStorage
        localStorage.setItem(EPIC_FILTERS_KEY, JSON.stringify(get().filters));
      },

      updateSearchQuery: (query) => {
        set({ searchQuery: query });
      },

      updateArchivedEpicsSearchQuery: (query) => {
        set({ archivedEpicsSearchQuery: query });
      },

      clearAllFilters: (projectId, state = "default") => {
        set((prevState) => {
          const newFilters = { ...prevState.filters };
          const newDisplayFilters = { ...prevState.displayFilters };

          if (newFilters[projectId]) {
            newFilters[projectId] = {
              ...newFilters[projectId],
              [state]: {},
            };
          }

          if (newDisplayFilters[projectId]) {
            newDisplayFilters[projectId] = {
              ...newDisplayFilters[projectId],
              favorites: false,
            };
          }

          return {
            filters: newFilters,
            displayFilters: newDisplayFilters,
          };
        });

        // Write to legacy localStorage
        const updatedState = get();
        localStorage.setItem(EPIC_FILTERS_KEY, JSON.stringify(updatedState.filters));
        localStorage.setItem(EPIC_DISPLAY_FILTERS_KEY, JSON.stringify(updatedState.displayFilters));
      },
    }),
    {
      name: "plane-epic-filters-storage",
      storage: createJSONStorage(() => localStorage),
      // Only persist displayFilters and filters, not search queries
      partialize: (state) => ({
        displayFilters: state.displayFilters,
        filters: state.filters,
      }),
    }
  )
);

/**
 * Legacy interface for backward compatibility with MobX store.
 */
export interface IEpicFilterStore {
  displayFilters: Record<string, TEpicDisplayFilters>;
  filters: Record<string, TEpicFiltersByState>;
  searchQuery: string;
  archivedEpicsSearchQuery: string;
  currentProjectDisplayFilters: TEpicDisplayFilters | undefined;
  currentProjectFilters: TEpicFilters | undefined;
  currentProjectArchivedFilters: TEpicFilters | undefined;
  getDisplayFiltersByProjectId: (projectId: string) => TEpicDisplayFilters | undefined;
  getFiltersByProjectId: (projectId: string) => TEpicFilters | undefined;
  getArchivedFiltersByProjectId: (projectId: string) => TEpicFilters | undefined;
  updateDisplayFilters: (projectId: string, displayFilters: TEpicDisplayFilters) => void;
  updateFilters: (projectId: string, filters: TEpicFilters, state?: keyof TEpicFiltersByState) => void;
  updateSearchQuery: (query: string) => void;
  updateArchivedEpicsSearchQuery: (query: string) => void;
  clearAllFilters: (projectId: string, state?: keyof TEpicFiltersByState) => void;
}

/**
 * Legacy class wrapper for backward compatibility with MobX patterns.
 * @deprecated Use useEpicFilterStore hook directly in React components
 */
export class EpicFilterStoreLegacy implements IEpicFilterStore {
  private rootStore: {
    router: { projectId: string | null };
  };

  constructor(rootStore: any) {
    this.rootStore = rootStore;
  }

  get displayFilters() {
    return useEpicFilterStore.getState().displayFilters;
  }

  get filters() {
    return useEpicFilterStore.getState().filters;
  }

  get searchQuery() {
    return useEpicFilterStore.getState().searchQuery;
  }

  get archivedEpicsSearchQuery() {
    return useEpicFilterStore.getState().archivedEpicsSearchQuery;
  }

  get currentProjectDisplayFilters() {
    const projectId = this.rootStore.router.projectId;
    return useEpicFilterStore.getState().getCurrentProjectDisplayFilters(projectId ?? undefined);
  }

  get currentProjectFilters() {
    const projectId = this.rootStore.router.projectId;
    return useEpicFilterStore.getState().getCurrentProjectFilters(projectId ?? undefined);
  }

  get currentProjectArchivedFilters() {
    const projectId = this.rootStore.router.projectId;
    return useEpicFilterStore.getState().getCurrentProjectArchivedFilters(projectId ?? undefined);
  }

  getDisplayFiltersByProjectId = (projectId: string) => {
    return useEpicFilterStore.getState().getDisplayFiltersByProjectId(projectId);
  };

  getFiltersByProjectId = (projectId: string) => {
    return useEpicFilterStore.getState().getFiltersByProjectId(projectId);
  };

  getArchivedFiltersByProjectId = (projectId: string) => {
    return useEpicFilterStore.getState().getArchivedFiltersByProjectId(projectId);
  };

  updateDisplayFilters = (projectId: string, displayFilters: TEpicDisplayFilters) => {
    useEpicFilterStore.getState().updateDisplayFilters(projectId, displayFilters);
  };

  updateFilters = (projectId: string, filters: TEpicFilters, state?: keyof TEpicFiltersByState) => {
    useEpicFilterStore.getState().updateFilters(projectId, filters, state);
  };

  updateSearchQuery = (query: string) => {
    useEpicFilterStore.getState().updateSearchQuery(query);
  };

  updateArchivedEpicsSearchQuery = (query: string) => {
    useEpicFilterStore.getState().updateArchivedEpicsSearchQuery(query);
  };

  clearAllFilters = (projectId: string, state?: keyof TEpicFiltersByState) => {
    useEpicFilterStore.getState().clearAllFilters(projectId, state);
  };
}
