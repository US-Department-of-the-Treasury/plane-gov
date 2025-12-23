import { set as lodashSet } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// types
import type { TProjectDisplayFilters, TProjectFilters, TProjectAppliedDisplayFilterKeys } from "@plane/types";
// store
import type { CoreRootStore } from "../root.store";

// Zustand Store
interface ProjectFilterState {
  displayFilters: Record<string, TProjectDisplayFilters>;
  filters: Record<string, TProjectFilters>;
  searchQuery: string;
}

interface ProjectFilterActions {
  getDisplayFiltersByWorkspaceSlug: (workspaceSlug: string) => TProjectDisplayFilters | undefined;
  getFiltersByWorkspaceSlug: (workspaceSlug: string) => TProjectFilters | undefined;
  initWorkspaceFilters: (workspaceSlug: string) => void;
  updateDisplayFilters: (workspaceSlug: string, displayFilters: TProjectDisplayFilters) => void;
  updateFilters: (workspaceSlug: string, filters: TProjectFilters) => void;
  updateSearchQuery: (query: string) => void;
  clearAllFilters: (workspaceSlug: string) => void;
  clearAllAppliedDisplayFilters: (workspaceSlug: string, appliedFilters: TProjectAppliedDisplayFilterKeys[]) => void;
}

type ProjectFilterStoreType = ProjectFilterState & ProjectFilterActions;

export const useProjectFilterStore = create<ProjectFilterStoreType>()(
  immer((set, get) => ({
    // State
    displayFilters: {},
    filters: {},
    searchQuery: "",

    // Actions
    getDisplayFiltersByWorkspaceSlug: (workspaceSlug: string) => {
      return get().displayFilters[workspaceSlug];
    },

    getFiltersByWorkspaceSlug: (workspaceSlug: string) => {
      return get().filters[workspaceSlug];
    },

    /**
     * @description initialize display filters and filters of a workspace
     * @param {string} workspaceSlug
     */
    initWorkspaceFilters: (workspaceSlug: string) => {
      const displayFilters = get().displayFilters[workspaceSlug];
      set((state) => {
        state.displayFilters[workspaceSlug] = {
          order_by: displayFilters?.order_by || "created_at",
        };
        state.filters[workspaceSlug] = state.filters[workspaceSlug] ?? {};
      });
    },

    /**
     * @description update display filters of a workspace
     * @param {string} workspaceSlug
     * @param {TProjectDisplayFilters} displayFilters
     */
    updateDisplayFilters: (workspaceSlug: string, displayFilters: TProjectDisplayFilters) => {
      set((state) => {
        Object.keys(displayFilters).forEach((key) => {
          lodashSet(state.displayFilters, [workspaceSlug, key], displayFilters[key as keyof TProjectDisplayFilters]);
        });
      });
    },

    /**
     * @description update filters of a workspace
     * @param {string} workspaceSlug
     * @param {TProjectFilters} filters
     */
    updateFilters: (workspaceSlug: string, filters: TProjectFilters) => {
      set((state) => {
        Object.keys(filters).forEach((key) => {
          lodashSet(state.filters, [workspaceSlug, key], filters[key as keyof TProjectFilters]);
        });
      });
    },

    /**
     * @description update search query
     * @param {string} query
     */
    updateSearchQuery: (query: string) => {
      set((state) => {
        state.searchQuery = query;
      });
    },

    /**
     * @description clear all filters of a workspace
     * @param {string} workspaceSlug
     */
    clearAllFilters: (workspaceSlug: string) => {
      set((state) => {
        state.filters[workspaceSlug] = {};
      });
    },

    /**
     * @description clear project display filters of a workspace
     * @param {string} workspaceSlug
     */
    clearAllAppliedDisplayFilters: (workspaceSlug: string, appliedFilters: TProjectAppliedDisplayFilterKeys[]) => {
      set((state) => {
        appliedFilters.forEach((key) => {
          lodashSet(state.displayFilters, [workspaceSlug, key], false);
        });
      });
    },
  }))
);

// Legacy interface
export interface IProjectFilterStore {
  // observables
  displayFilters: Record<string, TProjectDisplayFilters>;
  filters: Record<string, TProjectFilters>;
  searchQuery: string;
  // computed
  currentWorkspaceDisplayFilters: TProjectDisplayFilters | undefined;
  currentWorkspaceAppliedDisplayFilters: TProjectAppliedDisplayFilterKeys[] | undefined;
  currentWorkspaceFilters: TProjectFilters | undefined;
  // computed functions
  getDisplayFiltersByWorkspaceSlug: (workspaceSlug: string) => TProjectDisplayFilters | undefined;
  getFiltersByWorkspaceSlug: (workspaceSlug: string) => TProjectFilters | undefined;
  // actions
  updateDisplayFilters: (workspaceSlug: string, displayFilters: TProjectDisplayFilters) => void;
  updateFilters: (workspaceSlug: string, filters: TProjectFilters) => void;
  updateSearchQuery: (query: string) => void;
  clearAllFilters: (workspaceSlug: string) => void;
  clearAllAppliedDisplayFilters: (workspaceSlug: string) => void;
}

// Legacy class wrapper for backward compatibility
export class ProjectFilterStore implements IProjectFilterStore {
  // root store
  rootStore: CoreRootStore;

  constructor(_rootStore: CoreRootStore) {
    this.rootStore = _rootStore;

    // Set up reaction equivalent using subscription
    let previousWorkspaceSlug: string | undefined;
    useProjectFilterStore.subscribe((state) => {
      const currentWorkspaceSlug = this.rootStore.router.workspaceSlug;
      if (currentWorkspaceSlug && currentWorkspaceSlug !== previousWorkspaceSlug) {
        this.initWorkspaceFilters(currentWorkspaceSlug);
        state.searchQuery = "";
      }
      previousWorkspaceSlug = currentWorkspaceSlug;
    });
  }

  private get store() {
    return useProjectFilterStore.getState();
  }

  get displayFilters() {
    return this.store.displayFilters;
  }

  get filters() {
    return this.store.filters;
  }

  get searchQuery() {
    return this.store.searchQuery;
  }

  /**
   * @description get display filters of the current workspace
   */
  get currentWorkspaceDisplayFilters() {
    const workspaceSlug = this.rootStore.router.workspaceSlug;
    if (!workspaceSlug) return;
    return this.store.displayFilters[workspaceSlug];
  }

  /**
   * @description get project state applied display filter of the current workspace
   * @returns {TProjectAppliedDisplayFilterKeys[] | undefined} // An array of keys of applied display filters
   */
  // TODO: Figure out a better approach for this
  get currentWorkspaceAppliedDisplayFilters() {
    const workspaceSlug = this.rootStore.router.workspaceSlug;
    if (!workspaceSlug) return;
    const displayFilters = this.store.displayFilters[workspaceSlug];
    if (!displayFilters) return;
    return Object.keys(displayFilters).filter(
      (key): key is TProjectAppliedDisplayFilterKeys =>
        ["my_projects", "archived_projects"].includes(key) && !!displayFilters[key as keyof TProjectDisplayFilters]
    );
  }

  /**
   * @description get filters of the current workspace
   */
  get currentWorkspaceFilters() {
    const workspaceSlug = this.rootStore.router.workspaceSlug;
    if (!workspaceSlug) return;
    return this.store.filters[workspaceSlug];
  }

  /**
   * @description get display filters of a workspace by workspaceSlug
   * @param {string} workspaceSlug
   */
  getDisplayFiltersByWorkspaceSlug = (workspaceSlug: string) => {
    return this.store.getDisplayFiltersByWorkspaceSlug(workspaceSlug);
  };

  /**
   * @description get filters of a workspace by workspaceSlug
   * @param {string} workspaceSlug
   */
  getFiltersByWorkspaceSlug = (workspaceSlug: string) => {
    return this.store.getFiltersByWorkspaceSlug(workspaceSlug);
  };

  /**
   * @description initialize display filters and filters of a workspace
   * @param {string} workspaceSlug
   */
  initWorkspaceFilters = (workspaceSlug: string) => {
    this.store.initWorkspaceFilters(workspaceSlug);
  };

  /**
   * @description update display filters of a workspace
   * @param {string} workspaceSlug
   * @param {TProjectDisplayFilters} displayFilters
   */
  updateDisplayFilters = (workspaceSlug: string, displayFilters: TProjectDisplayFilters) => {
    this.store.updateDisplayFilters(workspaceSlug, displayFilters);
  };

  /**
   * @description update filters of a workspace
   * @param {string} workspaceSlug
   * @param {TProjectFilters} filters
   */
  updateFilters = (workspaceSlug: string, filters: TProjectFilters) => {
    this.store.updateFilters(workspaceSlug, filters);
  };

  /**
   * @description update search query
   * @param {string} query
   */
  updateSearchQuery = (query: string) => {
    this.store.updateSearchQuery(query);
  };

  /**
   * @description clear all filters of a workspace
   * @param {string} workspaceSlug
   */
  clearAllFilters = (workspaceSlug: string) => {
    this.store.clearAllFilters(workspaceSlug);
  };

  /**
   * @description clear project display filters of a workspace
   * @param {string} workspaceSlug
   */
  clearAllAppliedDisplayFilters = (workspaceSlug: string) => {
    if (!this.currentWorkspaceAppliedDisplayFilters) return;
    this.store.clearAllAppliedDisplayFilters(workspaceSlug, this.currentWorkspaceAppliedDisplayFilters);
  };
}
