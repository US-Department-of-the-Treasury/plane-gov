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
interface ProfileIssuesFilterState {
  userId: string;
  filters: { [userId: string]: IIssueFilters };
}

interface ProfileIssuesFilterActions {
  setUserId: (userId: string) => void;
  setFilters: (userId: string, filters: Partial<IIssueFilters>) => void;
  setRichFilters: (userId: string, richFilters: TWorkItemFilterExpression) => void;
  setDisplayFilters: (userId: string, displayFilters: Partial<IIssueDisplayFilterOptions>) => void;
  setDisplayProperties: (userId: string, displayProperties: Partial<IIssueDisplayProperties>) => void;
  setKanbanFilters: (userId: string, kanbanFilters: Partial<TIssueKanbanFilters>) => void;
}

type ProfileIssuesFilterStoreType = ProfileIssuesFilterState & ProfileIssuesFilterActions;

export const useProfileIssuesFilterStore = create<ProfileIssuesFilterStoreType>()(
  immer((set) => ({
    // State
    userId: "",
    filters: {},

    // Actions
    setUserId: (userId) => {
      set((state) => {
        state.userId = userId;
      });
    },

    setFilters: (userId, filters) => {
      set((state) => {
        if (!state.filters[userId]) {
          state.filters[userId] = {} as IIssueFilters;
        }
        Object.assign(state.filters[userId], filters);
      });
    },

    setRichFilters: (userId, richFilters) => {
      set((state) => {
        if (!state.filters[userId]) {
          state.filters[userId] = {} as IIssueFilters;
        }
        state.filters[userId].richFilters = richFilters;
      });
    },

    setDisplayFilters: (userId, displayFilters) => {
      set((state) => {
        if (!state.filters[userId]) {
          state.filters[userId] = {} as IIssueFilters;
        }
        if (!state.filters[userId].displayFilters) {
          state.filters[userId].displayFilters = {} as IIssueDisplayFilterOptions;
        }
        Object.assign(state.filters[userId].displayFilters!, displayFilters);
      });
    },

    setDisplayProperties: (userId, displayProperties) => {
      set((state) => {
        if (!state.filters[userId]) {
          state.filters[userId] = {} as IIssueFilters;
        }
        if (!state.filters[userId].displayProperties) {
          state.filters[userId].displayProperties = {} as IIssueDisplayProperties;
        }
        Object.assign(state.filters[userId].displayProperties!, displayProperties);
      });
    },

    setKanbanFilters: (userId, kanbanFilters) => {
      set((state) => {
        if (!state.filters[userId]) {
          state.filters[userId] = {} as IIssueFilters;
        }
        if (!state.filters[userId].kanbanFilters) {
          state.filters[userId].kanbanFilters = {} as TIssueKanbanFilters;
        }
        Object.assign(state.filters[userId].kanbanFilters!, kanbanFilters);
      });
    },
  }))
);

export interface IProfileIssuesFilter extends IBaseIssueFilterStore {
  // observables
  userId: string;
  //helper actions
  getFilterParams: (
    options: IssuePaginationOptions,
    userId: string,
    cursor: string | undefined,
    groupId: string | undefined,
    subGroupId: string | undefined
  ) => Partial<Record<TIssueParams, string | boolean>>;
  // action
  fetchFilters: (workspaceSlug: string, userId: string) => Promise<void>;
  updateFilterExpression: (workspaceSlug: string, userId: string, filters: TWorkItemFilterExpression) => Promise<void>;
  updateFilters: (
    workspaceSlug: string,
    projectId: string | undefined,
    filterType: TSupportedFilterTypeForUpdate,
    filters: TSupportedFilterForUpdate,
    userId: string
  ) => Promise<void>;
}

// Legacy class wrapper for backward compatibility
export class ProfileIssuesFilter extends IssueFilterHelperStore implements IProfileIssuesFilter {
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
    return useProfileIssuesFilterStore.getState();
  }

  get userId() {
    return this.store.userId;
  }

  set userId(value: string) {
    this.store.setUserId(value);
  }

  get filters() {
    return this.store.filters;
  }

  get issueFilters() {
    const userId = this.rootIssueStore.userId;
    if (!userId) return undefined;

    return this.getIssueFilters(userId);
  }

  get appliedFilters() {
    const userId = this.rootIssueStore.userId;
    if (!userId) return undefined;

    return this.getAppliedFilters(userId);
  }

  getIssueFilters(userId: string) {
    const displayFilters = this.filters[userId] || undefined;
    if (isEmpty(displayFilters)) return undefined;

    const _filters: IIssueFilters = this.computedIssueFilters(displayFilters);

    return _filters;
  }

  getAppliedFilters(userId: string) {
    const userFilters = this.getIssueFilters(userId);
    if (!userFilters) return undefined;

    const filteredParams = handleIssueQueryParamsByLayout(userFilters?.displayFilters?.layout, "profile_issues");
    if (!filteredParams) return undefined;

    const filteredRouteParams: Partial<Record<TIssueParams, string | boolean>> = this.computedFilteredParams(
      userFilters?.richFilters,
      userFilters?.displayFilters,
      filteredParams
    );

    return filteredRouteParams;
  }

  getFilterParams = (
    options: IssuePaginationOptions,
    userId: string,
    cursor: string | undefined,
    groupId: string | undefined,
    subGroupId: string | undefined
  ) => {
    const filterParams = this.getAppliedFilters(userId);

    const paginationParams = this.getPaginationParams(filterParams, options, cursor, groupId, subGroupId);
    return paginationParams;
  };

  fetchFilters = async (workspaceSlug: string, userId: string) => {
    this.store.setUserId(userId);
    const _filters = this.handleIssuesLocalFilters.get(EIssuesStoreType.PROFILE, workspaceSlug, userId, undefined);

    const richFilters: TWorkItemFilterExpression = _filters?.rich_filters;
    const displayFilters: IIssueDisplayFilterOptions = this.computedDisplayFilters(_filters?.display_filters);
    const displayProperties: IIssueDisplayProperties = this.computedDisplayProperties(_filters?.display_properties);
    const kanbanFilters = {
      group_by: _filters?.kanban_filters?.group_by || [],
      sub_group_by: _filters?.kanban_filters?.sub_group_by || [],
    };

    this.store.setFilters(userId, {
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
  updateFilterExpression: IProfileIssuesFilter["updateFilterExpression"] = async (workspaceSlug, userId, filters) => {
    try {
      this.store.setRichFilters(userId, filters);

      this.rootIssueStore.profileIssues.fetchIssuesWithExistingPagination(workspaceSlug, userId, "mutation");
      this.handleIssuesLocalFilters.set(
        EIssuesStoreType.PROFILE,
        EIssueFilterType.FILTERS,
        workspaceSlug,
        userId,
        undefined,
        {
          rich_filters: filters,
        }
      );
    } catch (error) {
      console.log("error while updating rich filters", error);
      throw error;
    }
  };

  updateFilters: IProfileIssuesFilter["updateFilters"] = async (workspaceSlug, _projectId, type, filters, userId) => {
    try {
      if (isEmpty(this.filters) || isEmpty(this.filters[userId])) return;

      const _filters = {
        richFilters: this.filters[userId].richFilters,
        displayFilters: this.filters[userId].displayFilters as IIssueDisplayFilterOptions,
        displayProperties: this.filters[userId].displayProperties as IIssueDisplayProperties,
        kanbanFilters: this.filters[userId].kanbanFilters as TIssueKanbanFilters,
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
          // set group_by to priority if layout is switched to kanban and group_by is null
          if (_filters.displayFilters.layout === "kanban" && _filters.displayFilters.group_by === null) {
            _filters.displayFilters.group_by = "priority";
            updatedDisplayFilters.group_by = "priority";
          }

          this.store.setDisplayFilters(userId, updatedDisplayFilters);

          this.rootIssueStore.profileIssues.fetchIssuesWithExistingPagination(workspaceSlug, userId, "mutation");

          this.handleIssuesLocalFilters.set(EIssuesStoreType.PROFILE, type, workspaceSlug, userId, undefined, {
            display_filters: _filters.displayFilters,
          });

          break;
        }
        case EIssueFilterType.DISPLAY_PROPERTIES: {
          const updatedDisplayProperties = filters as IIssueDisplayProperties;
          _filters.displayProperties = { ..._filters.displayProperties, ...updatedDisplayProperties };

          this.store.setDisplayProperties(userId, updatedDisplayProperties);

          this.handleIssuesLocalFilters.set(EIssuesStoreType.PROFILE, type, workspaceSlug, userId, undefined, {
            display_properties: _filters.displayProperties,
          });
          break;
        }

        case EIssueFilterType.KANBAN_FILTERS: {
          const updatedKanbanFilters = filters as TIssueKanbanFilters;
          _filters.kanbanFilters = { ..._filters.kanbanFilters, ...updatedKanbanFilters };

          const currentUserId = this.rootIssueStore.currentUserId;
          if (currentUserId)
            this.handleIssuesLocalFilters.set(EIssuesStoreType.PROFILE, type, workspaceSlug, userId, undefined, {
              kanban_filters: _filters.kanbanFilters,
            });

          this.store.setKanbanFilters(userId, updatedKanbanFilters);

          break;
        }
        default:
          break;
      }
    } catch (error) {
      if (userId) this.fetchFilters(workspaceSlug, userId);
      throw error;
    }
  };
}
