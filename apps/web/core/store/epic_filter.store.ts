import { set } from "lodash-es";
import { action, computed, observable, makeObservable, runInAction, reaction } from "mobx";
import { computedFn } from "mobx-utils";
// types
import type { TEpicDisplayFilters, TEpicFilters, TEpicFiltersByState } from "@plane/types";
// helpers
import { storage } from "@/lib/local-storage";
// store
import type { CoreRootStore } from "./root.store";

// localStorage keys
const EPIC_DISPLAY_FILTERS_KEY = "epic_display_filters";
const EPIC_FILTERS_KEY = "epic_filters";

export interface IEpicFilterStore {
  // observables
  displayFilters: Record<string, TEpicDisplayFilters>;
  filters: Record<string, TEpicFiltersByState>;
  searchQuery: string;
  archivedEpicsSearchQuery: string;
  // computed
  currentProjectDisplayFilters: TEpicDisplayFilters | undefined;
  currentProjectFilters: TEpicFilters | undefined;
  currentProjectArchivedFilters: TEpicFilters | undefined;
  // computed functions
  getDisplayFiltersByProjectId: (projectId: string) => TEpicDisplayFilters | undefined;
  getFiltersByProjectId: (projectId: string) => TEpicFilters | undefined;
  getArchivedFiltersByProjectId: (projectId: string) => TEpicFilters | undefined;
  // actions
  updateDisplayFilters: (projectId: string, displayFilters: TEpicDisplayFilters) => void;
  updateFilters: (projectId: string, filters: TEpicFilters, state?: keyof TEpicFiltersByState) => void;
  updateSearchQuery: (query: string) => void;
  updateArchivedEpicsSearchQuery: (query: string) => void;
  clearAllFilters: (projectId: string, state?: keyof TEpicFiltersByState) => void;
}

export class EpicFilterStore implements IEpicFilterStore {
  // observables
  displayFilters: Record<string, TEpicDisplayFilters> = {};
  filters: Record<string, TEpicFiltersByState> = {};
  searchQuery: string = "";
  archivedEpicsSearchQuery: string = "";
  // root store
  rootStore: CoreRootStore;

  constructor(_rootStore: CoreRootStore) {
    makeObservable(this, {
      // observables
      displayFilters: observable,
      filters: observable,
      searchQuery: observable.ref,
      archivedEpicsSearchQuery: observable.ref,
      // computed
      currentProjectDisplayFilters: computed,
      currentProjectFilters: computed,
      currentProjectArchivedFilters: computed,
      // actions
      updateDisplayFilters: action,
      updateFilters: action,
      updateSearchQuery: action,
      updateArchivedEpicsSearchQuery: action,
      clearAllFilters: action,
    });
    // root store
    this.rootStore = _rootStore;

    // initialize display filters of the current project
    reaction(
      () => this.rootStore.router.projectId,
      (projectId) => {
        if (!projectId) return;
        this.initProjectEpicFilters(projectId);
        this.searchQuery = "";
      }
    );

    // Load initial data from localStorage after reactions are set up
    this.loadFromLocalStorage();
  }

  /**
   * @description Load filters from localStorage
   */
  loadFromLocalStorage = () => {
    try {
      const displayFiltersData = storage.get(EPIC_DISPLAY_FILTERS_KEY);
      const filtersData = storage.get(EPIC_FILTERS_KEY);

      runInAction(() => {
        if (displayFiltersData) {
          const parsed = JSON.parse(displayFiltersData);
          if (typeof parsed === "object" && parsed !== null) {
            this.displayFilters = parsed;
          }
        }
        if (filtersData) {
          const parsed = JSON.parse(filtersData);
          if (typeof parsed === "object" && parsed !== null) {
            this.filters = parsed;
          }
        }
      });
    } catch (error) {
      console.error("Failed to load epic filters from localStorage:", error);
      // Reset to defaults on error
      runInAction(() => {
        this.displayFilters = {};
        this.filters = {};
      });
    }
  };

  /**
   * @description Save display filters to localStorage (debounced)
   */
  saveDisplayFiltersToLocalStorage = () => {
    storage.set(EPIC_DISPLAY_FILTERS_KEY, this.displayFilters);
  };

  /**
   * @description Save filters to localStorage (debounced)
   */
  saveFiltersToLocalStorage = () => {
    storage.set(EPIC_FILTERS_KEY, this.filters);
  };

  /**
   * @description get display filters of the current project
   */
  get currentProjectDisplayFilters() {
    const projectId = this.rootStore.router.projectId;
    if (!projectId) return;
    return this.displayFilters[projectId];
  }

  /**
   * @description get filters of the current project
   */
  get currentProjectFilters() {
    const projectId = this.rootStore.router.projectId;
    if (!projectId) return;
    return this.filters[projectId]?.default ?? {};
  }

  /**
   * @description get archived filters of the current project
   */
  get currentProjectArchivedFilters() {
    const projectId = this.rootStore.router.projectId;
    if (!projectId) return;
    return this.filters[projectId].archived;
  }

  /**
   * @description get display filters of a project by projectId
   * @param {string} projectId
   */
  getDisplayFiltersByProjectId = computedFn((projectId: string) => this.displayFilters[projectId]);

  /**
   * @description get filters of a project by projectId
   * @param {string} projectId
   */
  getFiltersByProjectId = computedFn((projectId: string) => this.filters[projectId]?.default ?? {});

  /**
   * @description get archived filters of a project by projectId
   * @param {string} projectId
   */
  getArchivedFiltersByProjectId = computedFn((projectId: string) => this.filters[projectId].archived);

  /**
   * @description initialize display filters and filters of a project
   * @param {string} projectId
   */
  initProjectEpicFilters = (projectId: string) => {
    const displayFilters = this.getDisplayFiltersByProjectId(projectId);
    runInAction(() => {
      this.displayFilters[projectId] = {
        favorites: displayFilters?.favorites || false,
        layout: displayFilters?.layout || "list",
        order_by: displayFilters?.order_by || "name",
      };
      this.filters[projectId] = this.filters[projectId] ?? {
        default: {},
        archived: {},
      };
    });
    this.saveDisplayFiltersToLocalStorage();
    this.saveFiltersToLocalStorage();
  };

  /**
   * @description update display filters of a project
   * @param {string} projectId
   * @param {TEpicDisplayFilters} displayFilters
   */
  updateDisplayFilters = (projectId: string, displayFilters: TEpicDisplayFilters) => {
    runInAction(() => {
      Object.keys(displayFilters).forEach((key) => {
        set(this.displayFilters, [projectId, key], displayFilters[key as keyof TEpicDisplayFilters]);
      });
    });
    this.saveDisplayFiltersToLocalStorage();
  };

  /**
   * @description update filters of a project
   * @param {string} projectId
   * @param {TEpicFilters} filters
   */
  updateFilters = (projectId: string, filters: TEpicFilters, state: keyof TEpicFiltersByState = "default") => {
    runInAction(() => {
      Object.keys(filters).forEach((key) => {
        set(this.filters, [projectId, state, key], filters[key as keyof TEpicFilters]);
      });
    });
    this.saveFiltersToLocalStorage();
  };

  /**
   * @description update search query
   * @param {string} query
   */
  updateSearchQuery = (query: string) => {
    this.searchQuery = query;
  };

  /**
   * @description update archived search query
   * @param {string} query
   */
  updateArchivedEpicsSearchQuery = (query: string) => {
    this.archivedEpicsSearchQuery = query;
  };

  /**
   * @description clear all filters of a project
   * @param {string} projectId
   */
  clearAllFilters = (projectId: string, state: keyof TEpicFiltersByState = "default") => {
    runInAction(() => {
      this.filters[projectId][state] = {};
      this.displayFilters[projectId].favorites = false;
    });
    this.saveFiltersToLocalStorage();
    this.saveDisplayFiltersToLocalStorage();
  };
}
