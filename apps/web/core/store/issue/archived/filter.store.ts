import { isEmpty } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// base class
import type { TSupportedFilterTypeForUpdate } from "@plane/constants";
import { EIssueFilterType } from "@plane/constants";
import type {
  IIssueDisplayFilterOptions,
  IIssueDisplayProperties,
  TIssueKanbanFilters,
  IIssueFilters,
  TIssueParams,
  IssuePaginationOptions,
  TWorkItemFilterExpression,
  TSupportedFilterForUpdate,
} from "@plane/types";
import { EIssuesStoreType } from "@plane/types";
import { handleIssueQueryParamsByLayout } from "@plane/utils";
import { IssueFiltersService } from "@/services/issue_filter.service";
import type { IBaseIssueFilterStore } from "../helpers/issue-filter-helper.store";
import { IssueFilterHelperStore } from "../helpers/issue-filter-helper.store";
// helpers
// types
import type { IIssueRootStore } from "../root.store";
// constants
// services

export interface IArchivedIssuesFilter extends IBaseIssueFilterStore {
  //helper actions
  getFilterParams: (
    options: IssuePaginationOptions,
    projectId: string,
    cursor: string | undefined,
    groupId: string | undefined,
    subGroupId: string | undefined
  ) => Partial<Record<TIssueParams, string | boolean>>;
  getIssueFilters(projectId: string): IIssueFilters | undefined;
  // action
  fetchFilters: (workspaceSlug: string, projectId: string) => Promise<void>;
  updateFilterExpression: (
    workspaceSlug: string,
    projectId: string,
    filters: TWorkItemFilterExpression
  ) => Promise<void>;
  updateFilters: (
    workspaceSlug: string,
    projectId: string,
    filterType: TSupportedFilterTypeForUpdate,
    filters: TSupportedFilterForUpdate
  ) => Promise<void>;
}

interface ArchivedIssuesFilterState {
  filters: { [projectId: string]: IIssueFilters };
}

interface ArchivedIssuesFilterActions {
  // Dedicated setters for proper Zustand reactivity
  setFilters: (projectId: string, filters: IIssueFilters) => void;
  setRichFilters: (projectId: string, richFilters: TWorkItemFilterExpression) => void;
  setDisplayFilters: (projectId: string, displayFilters: Partial<IIssueDisplayFilterOptions>) => void;
  setDisplayProperties: (projectId: string, displayProperties: Partial<IIssueDisplayProperties>) => void;
  setKanbanFilters: (projectId: string, kanbanFilters: Partial<TIssueKanbanFilters>) => void;
  // Getters
  getIssueFilters: (projectId: string, helperStore: IssueFilterHelperStore) => IIssueFilters | undefined;
  getAppliedFilters: (projectId: string, helperStore: IssueFilterHelperStore) => Partial<Record<TIssueParams, string | boolean>> | undefined;
  getFilterParams: (
    options: IssuePaginationOptions,
    projectId: string,
    cursor: string | undefined,
    groupId: string | undefined,
    subGroupId: string | undefined,
    helperStore: IssueFilterHelperStore
  ) => Partial<Record<TIssueParams, string | boolean>>;
  fetchFilters: (workspaceSlug: string, projectId: string, helperStore: IssueFilterHelperStore) => Promise<void>;
  updateFilterExpression: (
    workspaceSlug: string,
    projectId: string,
    filters: TWorkItemFilterExpression,
    helperStore: IssueFilterHelperStore,
    rootIssueStore: IIssueRootStore
  ) => Promise<void>;
  updateFilters: (
    workspaceSlug: string,
    projectId: string,
    filterType: TSupportedFilterTypeForUpdate,
    filters: TSupportedFilterForUpdate,
    helperStore: IssueFilterHelperStore,
    rootIssueStore: IIssueRootStore
  ) => Promise<void>;
}

type ArchivedIssuesFilterStore = ArchivedIssuesFilterState & ArchivedIssuesFilterActions;

export const useArchivedIssuesFilterStore = create<ArchivedIssuesFilterStore>()(
  immer((set, get) => ({
    filters: {},

    // Dedicated setters for proper Zustand reactivity
    setFilters: (projectId, filters) => {
      set((state) => {
        state.filters[projectId] = filters;
      });
    },

    setRichFilters: (projectId, richFilters) => {
      set((state) => {
        if (!state.filters[projectId]) {
          state.filters[projectId] = {} as IIssueFilters;
        }
        state.filters[projectId].richFilters = richFilters;
      });
    },

    setDisplayFilters: (projectId, displayFilters) => {
      set((state) => {
        // Use explicit spread to create new references that Zustand selectors will detect
        state.filters[projectId] = {
          ...(state.filters[projectId] ?? {}),
          displayFilters: {
            ...(state.filters[projectId]?.displayFilters ?? {}),
            ...displayFilters,
          },
        } as IIssueFilters;
      });
    },

    setDisplayProperties: (projectId, displayProperties) => {
      set((state) => {
        // Use explicit spread to create new references that Zustand selectors will detect
        state.filters[projectId] = {
          ...(state.filters[projectId] ?? {}),
          displayProperties: {
            ...(state.filters[projectId]?.displayProperties ?? {}),
            ...displayProperties,
          },
        } as IIssueFilters;
      });
    },

    setKanbanFilters: (projectId, kanbanFilters) => {
      set((state) => {
        // Use explicit spread to create new references that Zustand selectors will detect
        state.filters[projectId] = {
          ...(state.filters[projectId] ?? {}),
          kanbanFilters: {
            ...(state.filters[projectId]?.kanbanFilters ?? {}),
            ...kanbanFilters,
          },
        } as IIssueFilters;
      });
    },

    getIssueFilters: (projectId, helperStore) => {
      const state = get();
      const displayFilters = state.filters[projectId] || undefined;
      if (isEmpty(displayFilters)) return undefined;

      const _filters: IIssueFilters = helperStore.computedIssueFilters(displayFilters);
      return _filters;
    },

    getAppliedFilters: (projectId, helperStore) => {
      const state = get();
      const userFilters = state.getIssueFilters(projectId, helperStore);
      if (!userFilters) return undefined;

      const filteredParams = handleIssueQueryParamsByLayout(userFilters?.displayFilters?.layout, "issues");
      if (!filteredParams) return undefined;

      const filteredRouteParams: Partial<Record<TIssueParams, string | boolean>> = helperStore.computedFilteredParams(
        userFilters?.richFilters,
        userFilters?.displayFilters,
        filteredParams
      );

      return filteredRouteParams;
    },

    getFilterParams: (options, projectId, cursor, groupId, subGroupId, helperStore) => {
      const state = get();
      const filterParams = state.getAppliedFilters(projectId, helperStore);
      const paginationParams = helperStore.getPaginationParams(filterParams, options, cursor, groupId, subGroupId);
      return paginationParams;
    },

    fetchFilters: async (workspaceSlug, projectId, helperStore) => {
      const _filters = helperStore.handleIssuesLocalFilters.get(EIssuesStoreType.ARCHIVED, workspaceSlug, projectId, undefined);

      const richFilters: TWorkItemFilterExpression = _filters?.richFilters;
      const displayFilters: IIssueDisplayFilterOptions = helperStore.computedDisplayFilters({
        ..._filters?.display_filters,
        sub_issue: true,
      });
      const displayProperties: IIssueDisplayProperties = helperStore.computedDisplayProperties(_filters?.display_properties);
      const kanbanFilters = {
        group_by: _filters?.kanban_filters?.group_by || [],
        sub_group_by: _filters?.kanban_filters?.sub_group_by || [],
      };

      // Use setFilters for proper Zustand reactivity
      get().setFilters(projectId, {
        richFilters,
        displayFilters,
        displayProperties,
        kanbanFilters,
      });
    },

    updateFilterExpression: async (workspaceSlug, projectId, filters, helperStore, rootIssueStore) => {
      try {
        // Use setRichFilters for proper Zustand reactivity
        get().setRichFilters(projectId, filters);

        rootIssueStore.archivedIssues.fetchIssuesWithExistingPagination(workspaceSlug, projectId, "mutation");
        helperStore.handleIssuesLocalFilters.set(
          EIssuesStoreType.ARCHIVED,
          EIssueFilterType.FILTERS,
          workspaceSlug,
          projectId,
          undefined,
          {
            rich_filters: filters,
          }
        );
      } catch (error) {
        console.log("error while updating rich filters", error);
        throw error;
      }
    },

    updateFilters: async (workspaceSlug, projectId, type, filters, helperStore, rootIssueStore) => {
      try {
        const state = get();
        if (isEmpty(state.filters) || isEmpty(state.filters[projectId])) return;

        const _filters = {
          richFilters: state.filters[projectId].richFilters,
          displayFilters: state.filters[projectId].displayFilters as IIssueDisplayFilterOptions,
          displayProperties: state.filters[projectId].displayProperties as IIssueDisplayProperties,
          kanbanFilters: state.filters[projectId].kanbanFilters as TIssueKanbanFilters,
        };

        switch (type) {
          case EIssueFilterType.DISPLAY_FILTERS: {
            const updatedDisplayFilters = filters as IIssueDisplayFilterOptions;
            _filters.displayFilters = { ..._filters.displayFilters, ...updatedDisplayFilters };

            // set sub_group_by to null if group_by is set to null
            if (_filters.displayFilters.group_by === null) {
              _filters.displayFilters.sub_group_by = null;
              updatedDisplayFilters.sub_group_by = null;
            }
            // set sub_group_by to null if layout is switched to kanban group_by and sub_group_by are same
            if (
              _filters.displayFilters.layout === "kanban" &&
              _filters.displayFilters.group_by === _filters.displayFilters.sub_group_by
            ) {
              _filters.displayFilters.sub_group_by = null;
              updatedDisplayFilters.sub_group_by = null;
            }
            // set group_by to state if layout is switched to kanban and group_by is null
            if (_filters.displayFilters.layout === "kanban" && _filters.displayFilters.group_by === null) {
              _filters.displayFilters.group_by = "state";
              updatedDisplayFilters.group_by = "state";
            }

            // Use setDisplayFilters for proper Zustand reactivity
            get().setDisplayFilters(projectId, updatedDisplayFilters);

            if (helperStore.getShouldReFetchIssues(updatedDisplayFilters)) {
              rootIssueStore.archivedIssues.fetchIssuesWithExistingPagination(workspaceSlug, projectId, "mutation");
            }

            helperStore.handleIssuesLocalFilters.set(EIssuesStoreType.ARCHIVED, type, workspaceSlug, projectId, undefined, {
              display_filters: _filters.displayFilters,
            });

            break;
          }
          case EIssueFilterType.DISPLAY_PROPERTIES: {
            const updatedDisplayProperties = filters as IIssueDisplayProperties;
            _filters.displayProperties = { ..._filters.displayProperties, ...updatedDisplayProperties };

            // Use setDisplayProperties for proper Zustand reactivity
            get().setDisplayProperties(projectId, updatedDisplayProperties);

            helperStore.handleIssuesLocalFilters.set(EIssuesStoreType.ARCHIVED, type, workspaceSlug, projectId, undefined, {
              display_properties: _filters.displayProperties,
            });
            break;
          }

          case EIssueFilterType.KANBAN_FILTERS: {
            const updatedKanbanFilters = filters as TIssueKanbanFilters;
            _filters.kanbanFilters = { ..._filters.kanbanFilters, ...updatedKanbanFilters };

            const currentUserId = rootIssueStore.currentUserId;
            if (currentUserId)
              helperStore.handleIssuesLocalFilters.set(EIssuesStoreType.ARCHIVED, type, workspaceSlug, projectId, undefined, {
                kanban_filters: _filters.kanbanFilters,
              });

            // Use setKanbanFilters for proper Zustand reactivity
            get().setKanbanFilters(projectId, updatedKanbanFilters);

            break;
          }
          default:
            break;
        }
      } catch (error) {
        get().fetchFilters(workspaceSlug, projectId, helperStore);
        throw error;
      }
    },
  }))
);

// Legacy class wrapper
export class ArchivedIssuesFilter extends IssueFilterHelperStore implements IArchivedIssuesFilter {
  rootIssueStore;
  issueFilterService;

  private get state() {
    return useArchivedIssuesFilterStore.getState();
  }

  constructor(_rootStore: IIssueRootStore) {
    super();
    this.rootIssueStore = _rootStore;
    this.issueFilterService = new IssueFiltersService();
  }

  get filters() {
    return this.state.filters;
  }

  get issueFilters() {
    const projectId = this.rootIssueStore.projectId;
    if (!projectId) return undefined;

    return this.getIssueFilters(projectId);
  }

  get appliedFilters() {
    const projectId = this.rootIssueStore.projectId;
    if (!projectId) return undefined;

    return this.getAppliedFilters(projectId);
  }

  getIssueFilters(projectId: string) {
    return this.state.getIssueFilters(projectId, this);
  }

  getAppliedFilters(projectId: string) {
    return this.state.getAppliedFilters(projectId, this);
  }

  getFilterParams = (
    options: IssuePaginationOptions,
    projectId: string,
    cursor: string | undefined,
    groupId: string | undefined,
    subGroupId: string | undefined
  ) => {
    return this.state.getFilterParams(options, projectId, cursor, groupId, subGroupId, this);
  };

  fetchFilters = async (workspaceSlug: string, projectId: string) => {
    return this.state.fetchFilters(workspaceSlug, projectId, this);
  };

  updateFilterExpression: IArchivedIssuesFilter["updateFilterExpression"] = async (
    workspaceSlug,
    projectId,
    filters
  ) => {
    return this.state.updateFilterExpression(workspaceSlug, projectId, filters, this, this.rootIssueStore);
  };

  updateFilters: IArchivedIssuesFilter["updateFilters"] = async (workspaceSlug, projectId, type, filters) => {
    return this.state.updateFilters(workspaceSlug, projectId, type, filters, this, this.rootIssueStore);
  };
}
