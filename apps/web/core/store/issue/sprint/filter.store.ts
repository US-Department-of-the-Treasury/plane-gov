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
interface SprintIssuesFilterState {
  filters: { [sprintId: string]: IIssueFilters };
}

interface SprintIssuesFilterActions {
  setFilters: (sprintId: string, filters: Partial<IIssueFilters>) => void;
  setRichFilters: (sprintId: string, richFilters: TWorkItemFilterExpression) => void;
  setDisplayFilters: (sprintId: string, displayFilters: Partial<IIssueDisplayFilterOptions>) => void;
  setDisplayProperties: (sprintId: string, displayProperties: Partial<IIssueDisplayProperties>) => void;
  setKanbanFilters: (sprintId: string, kanbanFilters: Partial<TIssueKanbanFilters>) => void;
}

type SprintIssuesFilterStoreType = SprintIssuesFilterState & SprintIssuesFilterActions;

export const useSprintIssuesFilterStore = create<SprintIssuesFilterStoreType>()(
  immer((set) => ({
    // State
    filters: {},

    // Actions
    setFilters: (sprintId, filters) => {
      set((state) => {
        if (!state.filters[sprintId]) {
          state.filters[sprintId] = {} as IIssueFilters;
        }
        Object.assign(state.filters[sprintId], filters);
      });
    },

    setRichFilters: (sprintId, richFilters) => {
      set((state) => {
        if (!state.filters[sprintId]) {
          state.filters[sprintId] = {} as IIssueFilters;
        }
        state.filters[sprintId].richFilters = richFilters;
      });
    },

    setDisplayFilters: (sprintId, displayFilters) => {
      set((state) => {
        if (!state.filters[sprintId]) {
          state.filters[sprintId] = {} as IIssueFilters;
        }
        if (!state.filters[sprintId].displayFilters) {
          state.filters[sprintId].displayFilters = {} as IIssueDisplayFilterOptions;
        }
        Object.assign(state.filters[sprintId].displayFilters!, displayFilters);
      });
    },

    setDisplayProperties: (sprintId, displayProperties) => {
      set((state) => {
        if (!state.filters[sprintId]) {
          state.filters[sprintId] = {} as IIssueFilters;
        }
        if (!state.filters[sprintId].displayProperties) {
          state.filters[sprintId].displayProperties = {} as IIssueDisplayProperties;
        }
        Object.assign(state.filters[sprintId].displayProperties!, displayProperties);
      });
    },

    setKanbanFilters: (sprintId, kanbanFilters) => {
      set((state) => {
        if (!state.filters[sprintId]) {
          state.filters[sprintId] = {} as IIssueFilters;
        }
        if (!state.filters[sprintId].kanbanFilters) {
          state.filters[sprintId].kanbanFilters = {} as TIssueKanbanFilters;
        }
        Object.assign(state.filters[sprintId].kanbanFilters!, kanbanFilters);
      });
    },
  }))
);

export interface ISprintIssuesFilter extends IBaseIssueFilterStore {
  //helper actions
  getFilterParams: (
    options: IssuePaginationOptions,
    sprintId: string,
    cursor: string | undefined,
    groupId: string | undefined,
    subGroupId: string | undefined
  ) => Partial<Record<TIssueParams, string | boolean>>;
  getIssueFilters(sprintId: string): IIssueFilters | undefined;
  // action
  fetchFilters: (workspaceSlug: string, projectId: string, sprintId: string) => Promise<void>;
  updateFilterExpression: (
    workspaceSlug: string,
    projectId: string,
    sprintId: string,
    filters: TWorkItemFilterExpression
  ) => Promise<void>;
  updateFilters: (
    workspaceSlug: string,
    projectId: string,
    filterType: TSupportedFilterTypeForUpdate,
    filters: TSupportedFilterForUpdate,
    sprintId: string
  ) => Promise<void>;
}

// Legacy class wrapper for backward compatibility
export class SprintIssuesFilter extends IssueFilterHelperStore implements ISprintIssuesFilter {
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
    return useSprintIssuesFilterStore.getState();
  }

  get filters() {
    return this.store.filters;
  }

  get issueFilters() {
    const sprintId = this.rootIssueStore.sprintId;
    if (!sprintId) return undefined;

    return this.getIssueFilters(sprintId);
  }

  get appliedFilters() {
    const sprintId = this.rootIssueStore.sprintId;
    if (!sprintId) return undefined;

    return this.getAppliedFilters(sprintId);
  }

  getIssueFilters(sprintId: string) {
    const displayFilters = this.filters[sprintId] || undefined;
    if (isEmpty(displayFilters)) return undefined;

    const _filters: IIssueFilters = this.computedIssueFilters(displayFilters);

    return _filters;
  }

  getAppliedFilters(sprintId: string) {
    const userFilters = this.getIssueFilters(sprintId);
    if (!userFilters) return undefined;

    const filteredParams = handleIssueQueryParamsByLayout(userFilters?.displayFilters?.layout, "issues");
    if (!filteredParams) return undefined;

    if (filteredParams.includes("sprint")) filteredParams.splice(filteredParams.indexOf("sprint"), 1);

    const filteredRouteParams: Partial<Record<TIssueParams, string | boolean>> = this.computedFilteredParams(
      userFilters?.richFilters,
      userFilters?.displayFilters,
      filteredParams
    );

    return filteredRouteParams;
  }

  getFilterParams = (
    options: IssuePaginationOptions,
    sprintId: string,
    cursor: string | undefined,
    groupId: string | undefined,
    subGroupId: string | undefined
  ) => {
    let filterParams = this.getAppliedFilters(sprintId);

    if (!filterParams) {
      filterParams = {};
    }
    filterParams["sprint"] = sprintId;

    const paginationParams = this.getPaginationParams(filterParams, options, cursor, groupId, subGroupId);
    return paginationParams;
  };

  fetchFilters = async (workspaceSlug: string, projectId: string, sprintId: string) => {
    const _filters = await this.issueFilterService.fetchSprintIssueFilters(workspaceSlug, projectId, sprintId);

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
        EIssuesStoreType.SPRINT,
        workspaceSlug,
        sprintId,
        currentUserId
      );
      kanbanFilters.group_by = _kanbanFilters?.kanban_filters?.group_by || [];
      kanbanFilters.sub_group_by = _kanbanFilters?.kanban_filters?.sub_group_by || [];
    }

    this.store.setFilters(sprintId, {
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
  updateFilterExpression: ISprintIssuesFilter["updateFilterExpression"] = async (
    workspaceSlug,
    projectId,
    sprintId,
    filters
  ) => {
    try {
      this.store.setRichFilters(sprintId, filters);

      this.rootIssueStore.sprintIssues.fetchIssuesWithExistingPagination(
        workspaceSlug,
        projectId,
        "mutation",
        sprintId
      );
      await this.issueFilterService.patchSprintIssueFilters(workspaceSlug, projectId, sprintId, {
        rich_filters: filters,
      });
    } catch (error) {
      console.log("error while updating rich filters", error);
      throw error;
    }
  };

  updateFilters: ISprintIssuesFilter["updateFilters"] = async (workspaceSlug, projectId, type, filters, sprintId) => {
    try {
      if (isEmpty(this.filters) || isEmpty(this.filters[sprintId])) return;

      const _filters = {
        richFilters: this.filters[sprintId].richFilters,
        displayFilters: this.filters[sprintId].displayFilters as IIssueDisplayFilterOptions,
        displayProperties: this.filters[sprintId].displayProperties as IIssueDisplayProperties,
        kanbanFilters: this.filters[sprintId].kanbanFilters as TIssueKanbanFilters,
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

          this.store.setDisplayFilters(sprintId, updatedDisplayFilters);

          if (this.getShouldClearIssues(updatedDisplayFilters)) {
            this.rootIssueStore.sprintIssues.clear(true); // clear issues for local store when some filters like layout changes
          }

          if (this.getShouldReFetchIssues(updatedDisplayFilters)) {
            this.rootIssueStore.sprintIssues.fetchIssuesWithExistingPagination(
              workspaceSlug,
              projectId,
              "mutation",
              sprintId
            );
          }

          await this.issueFilterService.patchSprintIssueFilters(workspaceSlug, projectId, sprintId, {
            display_filters: _filters.displayFilters,
          });

          break;
        }
        case EIssueFilterType.DISPLAY_PROPERTIES: {
          const updatedDisplayProperties = filters as IIssueDisplayProperties;
          _filters.displayProperties = { ..._filters.displayProperties, ...updatedDisplayProperties };

          this.store.setDisplayProperties(sprintId, updatedDisplayProperties);

          await this.issueFilterService.patchSprintIssueFilters(workspaceSlug, projectId, sprintId, {
            display_properties: _filters.displayProperties,
          });
          break;
        }

        case EIssueFilterType.KANBAN_FILTERS: {
          const updatedKanbanFilters = filters as TIssueKanbanFilters;
          _filters.kanbanFilters = { ..._filters.kanbanFilters, ...updatedKanbanFilters };

          const currentUserId = this.rootIssueStore.currentUserId;
          if (currentUserId)
            this.handleIssuesLocalFilters.set(EIssuesStoreType.SPRINT, type, workspaceSlug, sprintId, currentUserId, {
              kanban_filters: _filters.kanbanFilters,
            });

          this.store.setKanbanFilters(sprintId, updatedKanbanFilters);

          break;
        }
        default:
          break;
      }
    } catch (error) {
      if (sprintId) this.fetchFilters(workspaceSlug, projectId, sprintId);
      throw error;
    }
  };
}
