import { isEmpty, set as lodashSet } from "lodash-es";
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

// Zustand Store
interface EpicIssuesFilterState {
  filters: { [epicId: string]: IIssueFilters };
}

interface EpicIssuesFilterActions {
  setFilters: (epicId: string, filters: Partial<IIssueFilters>) => void;
  setRichFilters: (epicId: string, richFilters: TWorkItemFilterExpression) => void;
  setDisplayFilters: (epicId: string, displayFilters: Partial<IIssueDisplayFilterOptions>) => void;
  setDisplayProperties: (epicId: string, displayProperties: Partial<IIssueDisplayProperties>) => void;
  setKanbanFilters: (epicId: string, kanbanFilters: Partial<TIssueKanbanFilters>) => void;
}

type EpicIssuesFilterStoreType = EpicIssuesFilterState & EpicIssuesFilterActions;

export const useEpicIssuesFilterStore = create<EpicIssuesFilterStoreType>()(
  immer((set) => ({
    // State
    filters: {},

    // Actions
    setFilters: (epicId, filters) => {
      set((state) => {
        if (!state.filters[epicId]) {
          state.filters[epicId] = {} as IIssueFilters;
        }
        Object.assign(state.filters[epicId], filters);
      });
    },

    setRichFilters: (epicId, richFilters) => {
      set((state) => {
        if (!state.filters[epicId]) {
          state.filters[epicId] = {} as IIssueFilters;
        }
        state.filters[epicId].richFilters = richFilters;
      });
    },

    setDisplayFilters: (epicId, displayFilters) => {
      set((state) => {
        if (!state.filters[epicId]) {
          state.filters[epicId] = {} as IIssueFilters;
        }
        if (!state.filters[epicId].displayFilters) {
          state.filters[epicId].displayFilters = {} as IIssueDisplayFilterOptions;
        }
        Object.assign(state.filters[epicId].displayFilters!, displayFilters);
      });
    },

    setDisplayProperties: (epicId, displayProperties) => {
      set((state) => {
        if (!state.filters[epicId]) {
          state.filters[epicId] = {} as IIssueFilters;
        }
        if (!state.filters[epicId].displayProperties) {
          state.filters[epicId].displayProperties = {} as IIssueDisplayProperties;
        }
        Object.assign(state.filters[epicId].displayProperties!, displayProperties);
      });
    },

    setKanbanFilters: (epicId, kanbanFilters) => {
      set((state) => {
        if (!state.filters[epicId]) {
          state.filters[epicId] = {} as IIssueFilters;
        }
        if (!state.filters[epicId].kanbanFilters) {
          state.filters[epicId].kanbanFilters = {} as TIssueKanbanFilters;
        }
        Object.assign(state.filters[epicId].kanbanFilters!, kanbanFilters);
      });
    },
  }))
);

export interface IEpicIssuesFilter extends IBaseIssueFilterStore {
  //helper actions
  getFilterParams: (
    options: IssuePaginationOptions,
    epicId: string,
    cursor: string | undefined,
    groupId: string | undefined,
    subGroupId: string | undefined
  ) => Partial<Record<TIssueParams, string | boolean>>;
  getIssueFilters(epicId: string): IIssueFilters | undefined;
  // action
  fetchFilters: (workspaceSlug: string, projectId: string, epicId: string) => Promise<void>;
  updateFilterExpression: (
    workspaceSlug: string,
    projectId: string,
    epicId: string,
    filters: TWorkItemFilterExpression
  ) => Promise<void>;
  updateFilters: (
    workspaceSlug: string,
    projectId: string,
    filterType: TSupportedFilterTypeForUpdate,
    filters: TSupportedFilterForUpdate,
    epicId: string
  ) => Promise<void>;
}

// Legacy class wrapper for backward compatibility
export class EpicIssuesFilter extends IssueFilterHelperStore implements IEpicIssuesFilter {
  // root store
  rootIssueStore: IIssueRootStore;
  // services
  issueFilterService;

  constructor(_rootStore: IIssueRootStore) {
    super();
    // root store
    this.rootIssueStore = _rootStore;
    // services
    this.issueFilterService = new IssueFiltersService();
  }

  private get store() {
    return useEpicIssuesFilterStore.getState();
  }

  get filters() {
    return this.store.filters;
  }

  get issueFilters() {
    const epicId = this.rootIssueStore.epicId;
    if (!epicId) return undefined;

    return this.getIssueFilters(epicId);
  }

  get appliedFilters() {
    const epicId = this.rootIssueStore.epicId;
    if (!epicId) return undefined;

    return this.getAppliedFilters(epicId);
  }

  getIssueFilters(epicId: string) {
    const displayFilters = this.filters[epicId] || undefined;
    if (isEmpty(displayFilters)) return undefined;

    const _filters: IIssueFilters = this.computedIssueFilters(displayFilters);

    return _filters;
  }

  getAppliedFilters(epicId: string) {
    const userFilters = this.getIssueFilters(epicId);
    if (!userFilters) return undefined;

    const filteredParams = handleIssueQueryParamsByLayout(userFilters?.displayFilters?.layout, "issues");
    if (!filteredParams) return undefined;

    if (filteredParams.includes("epic")) filteredParams.splice(filteredParams.indexOf("epic"), 1);

    const filteredRouteParams: Partial<Record<TIssueParams, string | boolean>> = this.computedFilteredParams(
      userFilters?.richFilters,
      userFilters?.displayFilters,
      filteredParams
    );

    return filteredRouteParams;
  }

  getFilterParams = (
    options: IssuePaginationOptions,
    epicId: string,
    cursor: string | undefined,
    groupId: string | undefined,
    subGroupId: string | undefined
  ) => {
    let filterParams = this.getAppliedFilters(epicId);

    if (!filterParams) {
      filterParams = {};
    }
    filterParams["epic"] = epicId;

    const paginationParams = this.getPaginationParams(filterParams, options, cursor, groupId, subGroupId);
    return paginationParams;
  };

  fetchFilters = async (workspaceSlug: string, projectId: string, epicId: string) => {
    const _filters = await this.issueFilterService.fetchEpicIssueFilters(workspaceSlug, projectId, epicId);

    const richFilters: TWorkItemFilterExpression = _filters?.rich_filters;
    const displayFilters: IIssueDisplayFilterOptions = this.computedDisplayFilters(_filters?.display_filters);
    const displayProperties: IIssueDisplayProperties = this.computedDisplayProperties(_filters?.display_properties);

    // fetching the kanban toggle helpers in the local storage
    const kanbanFilters = {
      group_by: [],
      sub_group_by: [],
    };
    const currentUserId = this.rootIssueStore.currentUserId;
    if (currentUserId) {
      const _kanbanFilters = this.handleIssuesLocalFilters.get(
        EIssuesStoreType.EPIC,
        workspaceSlug,
        epicId,
        currentUserId
      );
      kanbanFilters.group_by = _kanbanFilters?.kanban_filters?.group_by || [];
      kanbanFilters.sub_group_by = _kanbanFilters?.kanban_filters?.sub_group_by || [];
    }

    this.store.setFilters(epicId, {
      richFilters,
      displayFilters,
      displayProperties,
      kanbanFilters,
    });
  };

  /**
   * NOTE: This method is designed as a fallback function for the work item filter store.
   * Only use this method directly when initializing filter instances.
   * For regular filter updates, use this method as a fallback function for the work item filter store methods instead.
   */
  updateFilterExpression: IEpicIssuesFilter["updateFilterExpression"] = async (
    workspaceSlug,
    projectId,
    epicId,
    filters
  ) => {
    try {
      this.store.setRichFilters(epicId, filters);

      this.rootIssueStore.epicIssues.fetchIssuesWithExistingPagination(workspaceSlug, projectId, "mutation", epicId);
      await this.issueFilterService.patchEpicIssueFilters(workspaceSlug, projectId, epicId, {
        rich_filters: filters,
      });
    } catch (error) {
      console.log("error while updating rich filters", error);
      throw error;
    }
  };

  updateFilters: IEpicIssuesFilter["updateFilters"] = async (workspaceSlug, projectId, type, filters, epicId) => {
    try {
      if (isEmpty(this.filters) || isEmpty(this.filters[epicId])) return;

      const _filters = {
        richFilters: this.filters[epicId].richFilters,
        displayFilters: this.filters[epicId].displayFilters as IIssueDisplayFilterOptions,
        displayProperties: this.filters[epicId].displayProperties as IIssueDisplayProperties,
        kanbanFilters: this.filters[epicId].kanbanFilters as TIssueKanbanFilters,
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

          this.store.setDisplayFilters(epicId, updatedDisplayFilters);

          if (this.getShouldClearIssues(updatedDisplayFilters)) {
            // Use clearAndSetLoader to atomically clear store AND set loader to prevent flash of empty state
            // The new layout component's useEffect will trigger the fetch
            this.rootIssueStore.epicIssues.clearAndSetLoader("init-loader", true);
          }

          if (this.getShouldReFetchIssues(updatedDisplayFilters)) {
            this.rootIssueStore.epicIssues.fetchIssuesWithExistingPagination(
              workspaceSlug,
              projectId,
              "mutation",
              epicId
            );
          }

          await this.issueFilterService.patchEpicIssueFilters(workspaceSlug, projectId, epicId, {
            display_filters: _filters.displayFilters,
          });

          break;
        }
        case EIssueFilterType.DISPLAY_PROPERTIES: {
          const updatedDisplayProperties = filters as IIssueDisplayProperties;
          _filters.displayProperties = { ..._filters.displayProperties, ...updatedDisplayProperties };

          this.store.setDisplayProperties(epicId, updatedDisplayProperties);

          await this.issueFilterService.patchEpicIssueFilters(workspaceSlug, projectId, epicId, {
            display_properties: _filters.displayProperties,
          });
          break;
        }

        case EIssueFilterType.KANBAN_FILTERS: {
          const updatedKanbanFilters = filters as TIssueKanbanFilters;
          _filters.kanbanFilters = { ..._filters.kanbanFilters, ...updatedKanbanFilters };

          const currentUserId = this.rootIssueStore.currentUserId;
          if (currentUserId)
            this.handleIssuesLocalFilters.set(EIssuesStoreType.EPIC, type, workspaceSlug, epicId, currentUserId, {
              kanban_filters: _filters.kanbanFilters,
            });

          this.store.setKanbanFilters(epicId, updatedKanbanFilters);

          break;
        }
        default:
          break;
      }
    } catch (error) {
      if (epicId) this.fetchFilters(workspaceSlug, projectId, epicId);
      throw error;
    }
  };
}
