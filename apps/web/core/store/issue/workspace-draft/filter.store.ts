import { isEmpty, set as lodashSet } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// Plane Imports
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
// services
import { IssueFiltersService } from "@/services/issue_filter.service";
// helpers
import type { IBaseIssueFilterStore } from "../helpers/issue-filter-helper.store";
import { IssueFilterHelperStore } from "../helpers/issue-filter-helper.store";
// types
import type { IIssueRootStore } from "../root.store";

export interface IWorkspaceDraftIssuesFilter extends IBaseIssueFilterStore {
  // observables
  workspaceSlug: string;
  //helper actions
  getFilterParams: (
    options: IssuePaginationOptions,
    userId: string,
    cursor: string | undefined,
    groupId: string | undefined,
    subGroupId: string | undefined
  ) => Partial<Record<TIssueParams, string | boolean>>;
  // action
  fetchFilters: (workspaceSlug: string) => Promise<void>;
  updateFilterExpression: (workspaceSlug: string, userId: string, filters: TWorkItemFilterExpression) => Promise<void>;
  updateFilters: (
    workspaceSlug: string,
    filterType: TSupportedFilterTypeForUpdate,
    filters: TSupportedFilterForUpdate
  ) => Promise<void>;
}

// Zustand Store
interface WorkspaceDraftIssuesFilterState {
  workspaceSlug: string;
  filters: { [userId: string]: IIssueFilters };
}

interface WorkspaceDraftIssuesFilterActions {
  setWorkspaceSlug: (slug: string) => void;
  setFilters: (workspaceSlug: string, filters: IIssueFilters) => void;
  setRichFilters: (workspaceSlug: string, richFilters: TWorkItemFilterExpression) => void;
  setDisplayFilters: (workspaceSlug: string, displayFilters: Partial<IIssueDisplayFilterOptions>) => void;
  setDisplayProperties: (workspaceSlug: string, displayProperties: Partial<IIssueDisplayProperties>) => void;
  setKanbanFilters: (workspaceSlug: string, kanbanFilters: Partial<TIssueKanbanFilters>) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateFilterField: (workspaceSlug: string, field: string, value: any) => void;
}

type WorkspaceDraftIssuesFilterStore = WorkspaceDraftIssuesFilterState & WorkspaceDraftIssuesFilterActions;

export const useWorkspaceDraftIssuesFilterStore = create<WorkspaceDraftIssuesFilterStore>()(
  immer((set) => ({
    // State
    workspaceSlug: "",
    filters: {},

    // Actions
    setWorkspaceSlug: (slug) => {
      set((state) => {
        state.workspaceSlug = slug;
      });
    },

    setFilters: (workspaceSlug, filters) => {
      set((state) => {
        state.filters[workspaceSlug] = filters;
      });
    },

    setRichFilters: (workspaceSlug, richFilters) => {
      set((state) => {
        if (!state.filters[workspaceSlug]) {
          state.filters[workspaceSlug] = {} as IIssueFilters;
        }
        state.filters[workspaceSlug].richFilters = richFilters;
      });
    },

    setDisplayFilters: (workspaceSlug, displayFilters) => {
      set((state) => {
        // Use explicit spread to create new references that Zustand selectors will detect
        state.filters[workspaceSlug] = {
          ...(state.filters[workspaceSlug] ?? {}),
          displayFilters: {
            ...(state.filters[workspaceSlug]?.displayFilters ?? {}),
            ...displayFilters,
          },
        } as IIssueFilters;
      });
    },

    setDisplayProperties: (workspaceSlug, displayProperties) => {
      set((state) => {
        // Use explicit spread to create new references that Zustand selectors will detect
        state.filters[workspaceSlug] = {
          ...(state.filters[workspaceSlug] ?? {}),
          displayProperties: {
            ...(state.filters[workspaceSlug]?.displayProperties ?? {}),
            ...displayProperties,
          },
        } as IIssueFilters;
      });
    },

    setKanbanFilters: (workspaceSlug, kanbanFilters) => {
      set((state) => {
        // Use explicit spread to create new references that Zustand selectors will detect
        state.filters[workspaceSlug] = {
          ...(state.filters[workspaceSlug] ?? {}),
          kanbanFilters: {
            ...(state.filters[workspaceSlug]?.kanbanFilters ?? {}),
            ...kanbanFilters,
          },
        } as IIssueFilters;
      });
    },

    updateFilterField: (workspaceSlug, field, value) => {
      set((state) => {
        // Use string path notation so lodash properly handles nested keys like "displayFilters.layout"
        // With immer middleware, lodashSet allows proper mutation tracking at each path level
        lodashSet(state.filters, `${workspaceSlug}.${field}`, value);
      });
    },
  }))
);

// Legacy class wrapper for backward compatibility
export class WorkspaceDraftIssuesFilter extends IssueFilterHelperStore implements IWorkspaceDraftIssuesFilter {
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
    return useWorkspaceDraftIssuesFilterStore.getState();
  }

  get workspaceSlug() {
    return this.store.workspaceSlug;
  }

  set workspaceSlug(value: string) {
    this.store.setWorkspaceSlug(value);
  }

  get filters() {
    return this.store.filters;
  }

  get issueFilters() {
    const workspaceSlug = this.rootIssueStore.workspaceSlug;
    if (!workspaceSlug) return undefined;

    return this.getIssueFilters(workspaceSlug);
  }

  get appliedFilters() {
    const workspaceSlug = this.rootIssueStore.workspaceSlug;
    if (!workspaceSlug) return undefined;

    return this.getAppliedFilters(workspaceSlug);
  }

  getIssueFilters(workspaceSlug: string) {
    const displayFilters = this.filters[workspaceSlug] || undefined;
    if (isEmpty(displayFilters)) return undefined;

    const _filters: IIssueFilters = this.computedIssueFilters(displayFilters);

    return _filters;
  }

  getAppliedFilters(workspaceSlug: string) {
    const userFilters = this.getIssueFilters(workspaceSlug);
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
    const filterParams = this.getAppliedFilters(this.workspaceSlug);

    const paginationParams = this.getPaginationParams(filterParams, options, cursor, groupId, subGroupId);
    return paginationParams;
  };

  fetchFilters = async (workspaceSlug: string) => {
    this.store.setWorkspaceSlug(workspaceSlug);
    const _filters = this.handleIssuesLocalFilters.get(
      EIssuesStoreType.PROFILE,
      workspaceSlug,
      workspaceSlug,
      undefined
    );

    const richFilters: TWorkItemFilterExpression = _filters?.rich_filters;
    const displayFilters: IIssueDisplayFilterOptions = this.computedDisplayFilters(_filters?.display_filters);
    const displayProperties: IIssueDisplayProperties = this.computedDisplayProperties(_filters?.display_properties);
    const kanbanFilters = {
      group_by: _filters?.kanban_filters?.group_by || [],
      sub_group_by: _filters?.kanban_filters?.sub_group_by || [],
    };

    // Use setFilters to set all filters at once for proper Zustand reactivity
    this.store.setFilters(workspaceSlug, {
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
  updateFilterExpression: IWorkspaceDraftIssuesFilter["updateFilterExpression"] = async (
    workspaceSlug,
    userId,
    filters
  ) => {
    try {
      // Use setRichFilters for proper Zustand reactivity
      this.store.setRichFilters(workspaceSlug, filters);

      this.rootIssueStore.profileIssues.fetchIssuesWithExistingPagination(workspaceSlug, workspaceSlug, "mutation");
      this.handleIssuesLocalFilters.set(
        EIssuesStoreType.PROFILE,
        EIssueFilterType.FILTERS,
        workspaceSlug,
        workspaceSlug,
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

  updateFilters: IWorkspaceDraftIssuesFilter["updateFilters"] = async (workspaceSlug, type, filters) => {
    try {
      if (isEmpty(this.filters) || isEmpty(this.filters[workspaceSlug])) return;

      const _filters = {
        richFilters: this.filters[workspaceSlug].richFilters,
        displayFilters: this.filters[workspaceSlug].displayFilters as IIssueDisplayFilterOptions,
        displayProperties: this.filters[workspaceSlug].displayProperties as IIssueDisplayProperties,
        kanbanFilters: this.filters[workspaceSlug].kanbanFilters as TIssueKanbanFilters,
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

          // Use setDisplayFilters directly for proper Zustand reactivity
          this.store.setDisplayFilters(workspaceSlug, updatedDisplayFilters);

          this.rootIssueStore.profileIssues.fetchIssuesWithExistingPagination(workspaceSlug, workspaceSlug, "mutation");

          this.handleIssuesLocalFilters.set(EIssuesStoreType.PROFILE, type, workspaceSlug, workspaceSlug, undefined, {
            display_filters: _filters.displayFilters,
          });

          break;
        }
        case EIssueFilterType.DISPLAY_PROPERTIES: {
          const updatedDisplayProperties = filters as IIssueDisplayProperties;
          _filters.displayProperties = { ..._filters.displayProperties, ...updatedDisplayProperties };

          // Use setDisplayProperties for proper Zustand reactivity
          this.store.setDisplayProperties(workspaceSlug, updatedDisplayProperties);

          this.handleIssuesLocalFilters.set(EIssuesStoreType.PROFILE, type, workspaceSlug, workspaceSlug, undefined, {
            display_properties: _filters.displayProperties,
          });
          break;
        }

        default:
          break;
      }
    } catch (error) {
      if (workspaceSlug) this.fetchFilters(workspaceSlug);
      throw error;
    }
  };
}
