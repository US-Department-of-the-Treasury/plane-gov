import { set } from "lodash-es";
import { action, computed, observable, makeObservable, runInAction, reaction } from "mobx";
import { computedFn } from "mobx-utils";
// types
import type { TSprintDisplayFilters, TSprintFilters, TSprintFiltersByState } from "@plane/types";
// store
import type { CoreRootStore } from "./root.store";

export interface ISprintFilterStore {
  // observables
  displayFilters: Record<string, TSprintDisplayFilters>;
  filters: Record<string, TSprintFiltersByState>;
  searchQuery: string;
  archivedSprintsSearchQuery: string;
  // computed
  currentProjectDisplayFilters: TSprintDisplayFilters | undefined;
  currentProjectFilters: TSprintFilters | undefined;
  currentProjectArchivedFilters: TSprintFilters | undefined;
  // computed functions
  getDisplayFiltersByProjectId: (projectId: string) => TSprintDisplayFilters | undefined;
  getFiltersByProjectId: (projectId: string) => TSprintFilters | undefined;
  getArchivedFiltersByProjectId: (projectId: string) => TSprintFilters | undefined;
  // actions
  updateDisplayFilters: (projectId: string, displayFilters: TSprintDisplayFilters) => void;
  updateFilters: (projectId: string, filters: TSprintFilters, state?: keyof TSprintFiltersByState) => void;
  updateSearchQuery: (query: string) => void;
  updateArchivedSprintsSearchQuery: (query: string) => void;
  clearAllFilters: (projectId: string, state?: keyof TSprintFiltersByState) => void;
}

export class SprintFilterStore implements ISprintFilterStore {
  // observables
  displayFilters: Record<string, TSprintDisplayFilters> = {};
  filters: Record<string, TSprintFiltersByState> = {};
  searchQuery: string = "";
  archivedSprintsSearchQuery: string = "";
  // root store
  rootStore: CoreRootStore;

  constructor(_rootStore: CoreRootStore) {
    makeObservable(this, {
      // observables
      displayFilters: observable,
      filters: observable,
      searchQuery: observable.ref,
      archivedSprintsSearchQuery: observable.ref,
      // computed
      currentProjectDisplayFilters: computed,
      currentProjectFilters: computed,
      currentProjectArchivedFilters: computed,
      // actions
      updateDisplayFilters: action,
      updateFilters: action,
      updateSearchQuery: action,
      updateArchivedSprintsSearchQuery: action,
      clearAllFilters: action,
    });
    // root store
    this.rootStore = _rootStore;
    // initialize display filters of the current project
    reaction(
      () => this.rootStore.router.projectId,
      (projectId) => {
        if (!projectId) return;
        this.initProjectSprintFilters(projectId);
        this.searchQuery = "";
      }
    );
  }

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
  initProjectSprintFilters = (projectId: string) => {
    const displayFilters = this.getDisplayFiltersByProjectId(projectId);
    runInAction(() => {
      this.displayFilters[projectId] = {
        active_tab: displayFilters?.active_tab || "active",
        layout: displayFilters?.layout || "list",
      };
      this.filters[projectId] = this.filters[projectId] ?? {
        default: {},
        archived: {},
      };
    });
  };

  /**
   * @description update display filters of a project
   * @param {string} projectId
   * @param {TSprintDisplayFilters} displayFilters
   */
  updateDisplayFilters = (projectId: string, displayFilters: TSprintDisplayFilters) => {
    runInAction(() => {
      Object.keys(displayFilters).forEach((key) => {
        set(this.displayFilters, [projectId, key], displayFilters[key as keyof TSprintDisplayFilters]);
      });
    });
  };

  /**
   * @description update filters of a project
   * @param {string} projectId
   * @param {TSprintFilters} filters
   */
  updateFilters = (projectId: string, filters: TSprintFilters, state: keyof TSprintFiltersByState = "default") => {
    runInAction(() => {
      Object.keys(filters).forEach((key) => {
        set(this.filters, [projectId, state, key], filters[key as keyof TSprintFilters]);
      });
    });
  };

  /**
   * @description update search query
   * @param {string} query
   */
  updateSearchQuery = (query: string) => (this.searchQuery = query);

  /**
   * @description update archived search query
   * @param {string} query
   */
  updateArchivedSprintsSearchQuery = (query: string) => (this.archivedSprintsSearchQuery = query);

  /**
   * @description clear all filters of a project
   * @param {string} projectId
   */
  clearAllFilters = (projectId: string, state: keyof TSprintFiltersByState = "default") => {
    runInAction(() => {
      this.filters[projectId][state] = {};
    });
  };
}
