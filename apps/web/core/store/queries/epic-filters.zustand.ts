"use client";

import { create } from "zustand";
import type { TEpicDisplayFilters, TEpicFilters, TEpicFiltersByState } from "@plane/types";
import { storage } from "@/lib/local-storage";

// localStorage keys
const EPIC_DISPLAY_FILTERS_KEY = "epic_display_filters";
const EPIC_FILTERS_KEY = "epic_filters";

/**
 * Epic Filter Store (Zustand)
 *
 * Manages UI filter state for epics. This is client-side state that doesn't need
 * server synchronization.
 *
 * Replaces MobX EpicFilterStore with Zustand for better performance and simpler
 * state management.
 *
 * @example
 * ```tsx
 * // In a component
 * const { displayFilters, updateDisplayFilters } = useEpicFilters((state) => ({
 *   displayFilters: state.getDisplayFiltersByProjectId(projectId),
 *   updateDisplayFilters: state.updateDisplayFilters,
 * }));
 *
 * // Update filters
 * updateDisplayFilters(projectId, { order_by: "name" });
 * ```
 */

interface EpicFiltersState {
  // State
  displayFilters: Record<string, TEpicDisplayFilters>;
  filters: Record<string, TEpicFiltersByState>;
  searchQuery: string;
  archivedEpicsSearchQuery: string;

  // Getters
  getDisplayFiltersByProjectId: (projectId: string) => TEpicDisplayFilters | undefined;
  getFiltersByProjectId: (projectId: string) => TEpicFilters | undefined;
  getArchivedFiltersByProjectId: (projectId: string) => TEpicFilters | undefined;

  // Actions
  updateDisplayFilters: (projectId: string, displayFilters: TEpicDisplayFilters) => void;
  updateFilters: (projectId: string, filters: TEpicFilters, state?: keyof TEpicFiltersByState) => void;
  updateSearchQuery: (query: string) => void;
  updateArchivedEpicsSearchQuery: (query: string) => void;
  clearAllFilters: (projectId: string, state?: keyof TEpicFiltersByState) => void;
  initProjectEpicFilters: (projectId: string) => void;

  // Internal
  loadFromLocalStorage: () => void;
  saveToLocalStorage: () => void;
}

/**
 * Default display filters for a new project
 */
const DEFAULT_DISPLAY_FILTERS: TEpicDisplayFilters = {
  order_by: "sort_order",
  group_by: null,
  sub_group_by: null,
  layout: "list",
};

/**
 * Default filters for a new project
 */
const DEFAULT_FILTERS: TEpicFiltersByState = {
  active: {},
  archived: {},
};

/**
 * Epic filters Zustand store
 */
export const useEpicFilters = create<EpicFiltersState>((set, get) => ({
  // Initial state
  displayFilters: {},
  filters: {},
  searchQuery: "",
  archivedEpicsSearchQuery: "",

  // Getters
  getDisplayFiltersByProjectId: (projectId: string) => {
    return get().displayFilters[projectId];
  },

  getFiltersByProjectId: (projectId: string) => {
    return get().filters[projectId]?.active;
  },

  getArchivedFiltersByProjectId: (projectId: string) => {
    return get().filters[projectId]?.archived;
  },

  // Actions
  updateDisplayFilters: (projectId: string, newDisplayFilters: TEpicDisplayFilters) => {
    set((state) => ({
      displayFilters: {
        ...state.displayFilters,
        [projectId]: {
          ...state.displayFilters[projectId],
          ...newDisplayFilters,
        },
      },
    }));
    get().saveToLocalStorage();
  },

  updateFilters: (projectId: string, newFilters: TEpicFilters, filterState: keyof TEpicFiltersByState = "active") => {
    set((state) => {
      const projectFilters = state.filters[projectId] || DEFAULT_FILTERS;
      return {
        filters: {
          ...state.filters,
          [projectId]: {
            ...projectFilters,
            [filterState]: {
              ...projectFilters[filterState],
              ...newFilters,
            },
          },
        },
      };
    });
    get().saveToLocalStorage();
  },

  updateSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  updateArchivedEpicsSearchQuery: (query: string) => {
    set({ archivedEpicsSearchQuery: query });
  },

  clearAllFilters: (projectId: string, filterState: keyof TEpicFiltersByState = "active") => {
    set((state) => {
      const projectFilters = state.filters[projectId] || DEFAULT_FILTERS;
      return {
        filters: {
          ...state.filters,
          [projectId]: {
            ...projectFilters,
            [filterState]: {},
          },
        },
      };
    });
    get().saveToLocalStorage();
  },

  initProjectEpicFilters: (projectId: string) => {
    set((state) => {
      const updates: Partial<EpicFiltersState> = {};

      // Initialize display filters if not present
      if (!state.displayFilters[projectId]) {
        updates.displayFilters = {
          ...state.displayFilters,
          [projectId]: DEFAULT_DISPLAY_FILTERS,
        };
      }

      // Initialize filters if not present
      if (!state.filters[projectId]) {
        updates.filters = {
          ...state.filters,
          [projectId]: DEFAULT_FILTERS,
        };
      }

      return updates as EpicFiltersState;
    });

    // Save after initialization
    if (!get().displayFilters[projectId] || !get().filters[projectId]) {
      get().saveToLocalStorage();
    }
  },

  // LocalStorage persistence
  loadFromLocalStorage: () => {
    try {
      const displayFiltersData = storage.get(EPIC_DISPLAY_FILTERS_KEY);
      const filtersData = storage.get(EPIC_FILTERS_KEY);

      const updates: Partial<EpicFiltersState> = {};

      if (displayFiltersData) {
        const parsed = JSON.parse(displayFiltersData);
        if (typeof parsed === "object" && parsed !== null) {
          updates.displayFilters = parsed;
        }
      }

      if (filtersData) {
        const parsed = JSON.parse(filtersData);
        if (typeof parsed === "object" && parsed !== null) {
          updates.filters = parsed;
        }
      }

      if (Object.keys(updates).length > 0) {
        set(updates as EpicFiltersState);
      }
    } catch (error) {
      console.error("Failed to load epic filters from localStorage:", error);
    }
  },

  saveToLocalStorage: () => {
    try {
      const { displayFilters, filters } = get();
      storage.set(EPIC_DISPLAY_FILTERS_KEY, JSON.stringify(displayFilters));
      storage.set(EPIC_FILTERS_KEY, JSON.stringify(filters));
    } catch (error) {
      console.error("Failed to save epic filters to localStorage:", error);
    }
  },
}));

// Load initial data from localStorage
if (typeof window !== "undefined") {
  useEpicFilters.getState().loadFromLocalStorage();
}

/**
 * Helper hook to get epic filters for a specific project
 *
 * @example
 * ```tsx
 * const { displayFilters, filters, updateDisplayFilters } = useProjectEpicFilters(projectId);
 * ```
 */
export function useProjectEpicFilters(projectId: string) {
  return useEpicFilters((state) => ({
    displayFilters: state.getDisplayFiltersByProjectId(projectId),
    filters: state.getFiltersByProjectId(projectId),
    archivedFilters: state.getArchivedFiltersByProjectId(projectId),
    searchQuery: state.searchQuery,
    archivedEpicsSearchQuery: state.archivedEpicsSearchQuery,
    updateDisplayFilters: (filters: TEpicDisplayFilters) => state.updateDisplayFilters(projectId, filters),
    updateFilters: (filters: TEpicFilters, filterState?: keyof TEpicFiltersByState) =>
      state.updateFilters(projectId, filters, filterState),
    updateSearchQuery: state.updateSearchQuery,
    updateArchivedEpicsSearchQuery: state.updateArchivedEpicsSearchQuery,
    clearAllFilters: (filterState?: keyof TEpicFiltersByState) => state.clearAllFilters(projectId, filterState),
    initProjectEpicFilters: () => state.initProjectEpicFilters(projectId),
  }));
}
