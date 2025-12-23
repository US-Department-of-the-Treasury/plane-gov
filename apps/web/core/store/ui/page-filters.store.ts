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
 * Replaces MobX ProjectPageStore filters with Zustand for client-side state.
 */

export interface PageFiltersState {
  // State
  filters: TPageFilters;

  // Actions
  updateFilter: <T extends keyof TPageFilters>(key: T, value: TPageFilters[T]) => void;
  clearAllFilters: () => void;
  resetFilters: () => void;
}

const defaultFilters: TPageFilters = {
  searchQuery: "",
  sortKey: "updated_at",
  sortBy: "desc",
};

export const usePageFiltersStore = create<PageFiltersState>((set) => ({
  // Initial state
  filters: { ...defaultFilters },

  // Actions
  updateFilter: (key, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
      },
    })),

  clearAllFilters: () =>
    set((state) => ({
      filters: {
        ...state.filters,
        filters: {},
      },
    })),

  resetFilters: () => set({ filters: { ...defaultFilters } }),
}));
