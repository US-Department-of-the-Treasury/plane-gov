import { create } from "zustand";
import type { TPageFilters } from "@plane/types";

/**
 * Page Filters UI State Store
 *
 * Manages local UI state for page filtering and sorting:
 * - Search query
 * - Sort key and direction
 * - Filter criteria
 *
 * Migrated from MobX to Zustand for client-side state management.
 */

// ============================================================================
// State Interface
// ============================================================================

interface PageFiltersStoreState {
  filters: TPageFilters;
}

// ============================================================================
// Actions Interface
// ============================================================================

interface PageFiltersStoreActions {
  updateFilter: <T extends keyof TPageFilters>(key: T, value: TPageFilters[T]) => void;
  clearAllFilters: () => void;
  resetFilters: () => void;
}

// ============================================================================
// Combined Store Type
// ============================================================================

export type PageFiltersStore = PageFiltersStoreState & PageFiltersStoreActions;

// ============================================================================
// Initial State
// ============================================================================

const defaultFilters: TPageFilters = {
  searchQuery: "",
  sortKey: "updated_at",
  sortBy: "desc",
};

const initialState: PageFiltersStoreState = {
  filters: { ...defaultFilters },
};

// ============================================================================
// Zustand Store
// ============================================================================

/**
 * Page Filters Store (Zustand)
 *
 * Manages filtering and sorting state for pages.
 * Migrated from MobX to Zustand.
 *
 * Migration notes:
 * - Replaced MobX observables with Zustand state
 * - Replaced action decorators with functions that use set()
 * - No service dependencies - pure UI state
 */
export const usePageFiltersStore = create<PageFiltersStore>()((set) => ({
  ...initialState,

  /**
   * Update a specific filter property
   * @param key - The filter key to update
   * @param value - The new value for the filter
   */
  updateFilter: (key, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
      },
    })),

  /**
   * Clear all filters (resets the filters object to empty)
   * Note: This only clears the 'filters' property within TPageFilters,
   * not searchQuery or sort settings
   */
  clearAllFilters: () =>
    set((state) => ({
      filters: {
        ...state.filters,
        filters: {},
      },
    })),

  /**
   * Reset all filters to their default values
   * This includes searchQuery, sortKey, and sortBy
   */
  resetFilters: () => set({ filters: { ...defaultFilters } }),
}));

// ============================================================================
// Legacy Interface (for backwards compatibility)
// ============================================================================

export interface IPageFiltersStore {
  // State
  filters: TPageFilters;

  // Actions
  updateFilter: <T extends keyof TPageFilters>(key: T, value: TPageFilters[T]) => void;
  clearAllFilters: () => void;
  resetFilters: () => void;
}

// Export interface for backward compatibility
export type { IPageFiltersStore as IPageFiltersStoreType };
