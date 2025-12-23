"use client";

import { create } from "zustand";
import type { TSprintDisplayFilters, TSprintFilters, TSprintFiltersByState } from "@plane/types";

/**
 * Sprint Filter Store (Zustand)
 *
 * Manages UI filter state for sprints. This is client-side state that doesn't need
 * server synchronization.
 *
 * Replaces MobX SprintFilterStore with Zustand for better performance and simpler
 * state management.
 *
 * @example
 * ```tsx
 * // In a component
 * const { displayFilters, updateDisplayFilters } = useSprintFilters((state) => ({
 *   displayFilters: state.getDisplayFiltersByProjectId(projectId),
 *   updateDisplayFilters: state.updateDisplayFilters,
 * }));
 *
 * // Update filters
 * updateDisplayFilters(projectId, { layout: "kanban" });
 * ```
 */

interface SprintFiltersState {
  // State
  displayFilters: Record<string, TSprintDisplayFilters>;
  filters: Record<string, TSprintFiltersByState>;
  searchQuery: string;
  archivedSprintsSearchQuery: string;

  // Getters
  getDisplayFiltersByProjectId: (projectId: string) => TSprintDisplayFilters | undefined;
  getFiltersByProjectId: (projectId: string) => TSprintFilters | undefined;
  getArchivedFiltersByProjectId: (projectId: string) => TSprintFilters | undefined;

  // Actions
  updateDisplayFilters: (projectId: string, displayFilters: TSprintDisplayFilters) => void;
  updateFilters: (projectId: string, filters: TSprintFilters, state?: keyof TSprintFiltersByState) => void;
  updateSearchQuery: (query: string) => void;
  updateArchivedSprintsSearchQuery: (query: string) => void;
  clearAllFilters: (projectId: string, state?: keyof TSprintFiltersByState) => void;
  initProjectSprintFilters: (projectId: string) => void;
}

/**
 * Default display filters for a new project
 */
const DEFAULT_DISPLAY_FILTERS: TSprintDisplayFilters = {
  active_tab: "active",
  layout: "list",
};

/**
 * Default filters for a new project
 */
const DEFAULT_FILTERS: TSprintFiltersByState = {
  default: {},
  archived: {},
};

/**
 * Sprint filters Zustand store
 */
export const useSprintFilters = create<SprintFiltersState>((set, get) => ({
  // Initial state
  displayFilters: {},
  filters: {},
  searchQuery: "",
  archivedSprintsSearchQuery: "",

  // Getters
  getDisplayFiltersByProjectId: (projectId: string) => {
    return get().displayFilters[projectId];
  },

  getFiltersByProjectId: (projectId: string) => {
    return get().filters[projectId]?.default ?? {};
  },

  getArchivedFiltersByProjectId: (projectId: string) => {
    return get().filters[projectId]?.archived ?? {};
  },

  // Actions
  updateDisplayFilters: (projectId: string, newDisplayFilters: TSprintDisplayFilters) => {
    set((state) => ({
      displayFilters: {
        ...state.displayFilters,
        [projectId]: {
          ...state.displayFilters[projectId],
          ...newDisplayFilters,
        },
      },
    }));
  },

  updateFilters: (projectId: string, newFilters: TSprintFilters, filterState: keyof TSprintFiltersByState = "default") => {
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
  },

  updateSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  updateArchivedSprintsSearchQuery: (query: string) => {
    set({ archivedSprintsSearchQuery: query });
  },

  clearAllFilters: (projectId: string, filterState: keyof TSprintFiltersByState = "default") => {
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
  },

  initProjectSprintFilters: (projectId: string) => {
    set((state) => {
      const updates: Partial<SprintFiltersState> = {};

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

      return updates as SprintFiltersState;
    });
  },
}));

/**
 * Helper hook to get sprint filters for a specific project
 *
 * @example
 * ```tsx
 * const { displayFilters, filters, updateDisplayFilters } = useProjectSprintFilters(projectId);
 * ```
 */
export function useProjectSprintFilters(projectId: string) {
  return useSprintFilters((state) => ({
    displayFilters: state.getDisplayFiltersByProjectId(projectId),
    filters: state.getFiltersByProjectId(projectId),
    archivedFilters: state.getArchivedFiltersByProjectId(projectId),
    searchQuery: state.searchQuery,
    archivedSprintsSearchQuery: state.archivedSprintsSearchQuery,
    updateDisplayFilters: (filters: TSprintDisplayFilters) => state.updateDisplayFilters(projectId, filters),
    updateFilters: (filters: TSprintFilters, filterState?: keyof TSprintFiltersByState) =>
      state.updateFilters(projectId, filters, filterState),
    updateSearchQuery: state.updateSearchQuery,
    updateArchivedSprintsSearchQuery: state.updateArchivedSprintsSearchQuery,
    clearAllFilters: (filterState?: keyof TSprintFiltersByState) => state.clearAllFilters(projectId, filterState),
    initProjectSprintFilters: () => state.initProjectSprintFilters(projectId),
  }));
}
