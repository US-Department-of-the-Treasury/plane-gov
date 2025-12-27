import { isEmpty, set as lodashSet } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// plane imports
import type { TSupportedFilterTypeForUpdate } from "@plane/constants";
import { EIssueFilterType } from "@plane/constants";
import type {
  IIssueDisplayFilterOptions,
  IIssueDisplayProperties,
  TIssueKanbanFilters,
  IIssueFilters,
  TIssueParams,
  TStaticViewTypes,
  IssuePaginationOptions,
  TWorkItemFilterExpression,
  TSupportedFilterForUpdate,
} from "@plane/types";
import { EIssuesStoreType, EIssueLayoutTypes, STATIC_VIEW_TYPES } from "@plane/types";
import { handleIssueQueryParamsByLayout } from "@plane/utils";
// services
import { WorkspaceService } from "@/plane-web/services";
// local imports
import type { IBaseIssueFilterStore, IIssueFilterHelperStore } from "../helpers/issue-filter-helper.store";
import { IssueFilterHelperStore } from "../helpers/issue-filter-helper.store";
import type { IIssueRootStore } from "../root.store";

type TWorkspaceFilters = TStaticViewTypes;

export type TBaseFilterStore = IBaseIssueFilterStore & IIssueFilterHelperStore;

export interface IWorkspaceIssuesFilter extends TBaseFilterStore {
  // fetch action
  fetchFilters: (workspaceSlug: string, viewId: string) => Promise<void>;
  updateFilterExpression: (workspaceSlug: string, viewId: string, filters: TWorkItemFilterExpression) => Promise<void>;
  updateFilters: (
    workspaceSlug: string,
    projectId: string | undefined,
    filterType: TSupportedFilterTypeForUpdate,
    filters: TSupportedFilterForUpdate,
    viewId: string
  ) => Promise<void>;
  //helper action
  getIssueFilters: (viewId: string | undefined) => IIssueFilters | undefined;
  getAppliedFilters: (viewId: string) => Partial<Record<TIssueParams, string | boolean>> | undefined;
  getFilterParams: (
    options: IssuePaginationOptions,
    viewId: string,
    cursor: string | undefined,
    groupId: string | undefined,
    subGroupId: string | undefined
  ) => Partial<Record<TIssueParams, string | boolean>>;
}

// Zustand Store
interface WorkspaceIssuesFilterState {
  filters: { [viewId: string]: IIssueFilters };
}

interface WorkspaceIssuesFilterActions {
  setFilters: (viewId: string, filters: IIssueFilters) => void;
  setRichFilters: (viewId: string, richFilters: TWorkItemFilterExpression) => void;
  setDisplayFilters: (viewId: string, displayFilters: Partial<IIssueDisplayFilterOptions>) => void;
  setDisplayProperties: (viewId: string, displayProperties: Partial<IIssueDisplayProperties>) => void;
  setKanbanFilters: (viewId: string, kanbanFilters: Partial<TIssueKanbanFilters>) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateFilterField: (viewId: string, field: string, value: any) => void;
}

type WorkspaceIssuesFilterStore = WorkspaceIssuesFilterState & WorkspaceIssuesFilterActions;

export const useWorkspaceIssuesFilterStore = create<WorkspaceIssuesFilterStore>()(
  immer((set) => ({
    // State
    filters: {},

    // Actions
    setFilters: (viewId, filters) => {
      set((state) => {
        state.filters[viewId] = filters;
      });
    },

    setRichFilters: (viewId, richFilters) => {
      set((state) => {
        if (!state.filters[viewId]) {
          state.filters[viewId] = {} as IIssueFilters;
        }
        state.filters[viewId].richFilters = richFilters;
      });
    },

    setDisplayFilters: (viewId, displayFilters) => {
      set((state) => {
        // Use explicit spread to create new references that Zustand selectors will detect
        state.filters[viewId] = {
          ...(state.filters[viewId] ?? {}),
          displayFilters: {
            ...(state.filters[viewId]?.displayFilters ?? {}),
            ...displayFilters,
          },
        } as IIssueFilters;
      });
    },

    setDisplayProperties: (viewId, displayProperties) => {
      set((state) => {
        // Use explicit spread to create new references that Zustand selectors will detect
        state.filters[viewId] = {
          ...(state.filters[viewId] ?? {}),
          displayProperties: {
            ...(state.filters[viewId]?.displayProperties ?? {}),
            ...displayProperties,
          },
        } as IIssueFilters;
      });
    },

    setKanbanFilters: (viewId, kanbanFilters) => {
      set((state) => {
        // Use explicit spread to create new references that Zustand selectors will detect
        state.filters[viewId] = {
          ...(state.filters[viewId] ?? {}),
          kanbanFilters: {
            ...(state.filters[viewId]?.kanbanFilters ?? {}),
            ...kanbanFilters,
          },
        } as IIssueFilters;
      });
    },

    updateFilterField: (viewId, field, value) => {
      set((state) => {
        // Use string path notation so lodash properly handles nested keys like "displayFilters.layout"
        // With immer middleware, lodashSet allows proper mutation tracking at each path level
        lodashSet(state.filters, `${viewId}.${field}`, value);
      });
    },
  }))
);

// Legacy class wrapper for backward compatibility
export class WorkspaceIssuesFilter extends IssueFilterHelperStore implements IWorkspaceIssuesFilter {
  // root store
  rootIssueStore;
  // services
  issueFilterService;

  constructor(_rootStore: IIssueRootStore) {
    super();
    // root store
    this.rootIssueStore = _rootStore;
    // services
    this.issueFilterService = new WorkspaceService();
  }

  private get store() {
    return useWorkspaceIssuesFilterStore.getState();
  }

  get filters() {
    return this.store.filters;
  }

  getIssueFilters = (viewId: string | undefined) => {
    if (!viewId) return undefined;

    const displayFilters = this.filters[viewId] || undefined;
    if (isEmpty(displayFilters)) return undefined;

    const _filters: IIssueFilters = this.computedIssueFilters(displayFilters);

    return _filters;
  };

  getAppliedFilters = (viewId: string | undefined) => {
    if (!viewId) return undefined;

    const userFilters = this.getIssueFilters(viewId);
    if (!userFilters) return undefined;

    const filteredParams = handleIssueQueryParamsByLayout(EIssueLayoutTypes.SPREADSHEET, "my_issues");
    if (!filteredParams) return undefined;

    const filteredRouteParams: Partial<Record<TIssueParams, string | boolean>> = this.computedFilteredParams(
      userFilters?.richFilters,
      userFilters?.displayFilters,
      filteredParams
    );

    return filteredRouteParams;
  };

  get issueFilters() {
    const viewId = this.rootIssueStore.globalViewId;
    return this.getIssueFilters(viewId);
  }

  get appliedFilters() {
    const viewId = this.rootIssueStore.globalViewId;
    return this.getAppliedFilters(viewId);
  }

  getFilterParams = (
    options: IssuePaginationOptions,
    viewId: string,
    cursor: string | undefined,
    groupId: string | undefined,
    subGroupId: string | undefined
  ) => {
    let filterParams = this.getAppliedFilters(viewId);

    if (!filterParams) {
      filterParams = {};
    }

    if (STATIC_VIEW_TYPES.includes(viewId)) {
      const currentUserId = this.rootIssueStore.currentUserId;
      const paramForStaticView = this.getFilterConditionBasedOnViews(currentUserId, viewId);
      if (paramForStaticView) {
        filterParams = { ...filterParams, ...paramForStaticView };
      }
    }

    const paginationParams = this.getPaginationParams(filterParams, options, cursor, groupId, subGroupId);
    return paginationParams;
  };

  fetchFilters = async (workspaceSlug: string, viewId: TWorkspaceFilters) => {
    let richFilters: TWorkItemFilterExpression = {};
    let displayFilters: IIssueDisplayFilterOptions;
    let displayProperties: IIssueDisplayProperties;
    let kanbanFilters: TIssueKanbanFilters = {
      group_by: [],
      sub_group_by: [],
    };

    const _filters = this.handleIssuesLocalFilters.get(EIssuesStoreType.GLOBAL, workspaceSlug, undefined, viewId);
    displayFilters = this.computedDisplayFilters(_filters?.display_filters, {
      layout: EIssueLayoutTypes.SPREADSHEET,
      order_by: "-created_at",
    });
    displayProperties = this.computedDisplayProperties(_filters?.display_properties);
    kanbanFilters = {
      group_by: _filters?.kanban_filters?.group_by || [],
      sub_group_by: _filters?.kanban_filters?.sub_group_by || [],
    };

    // Get the view details if the view is not a static view
    if (STATIC_VIEW_TYPES.includes(viewId) === false) {
      const _filters = await this.issueFilterService.getViewDetails(workspaceSlug, viewId);
      richFilters = _filters?.rich_filters ?? {};
      displayFilters = this.computedDisplayFilters(_filters?.display_filters, {
        layout: EIssueLayoutTypes.SPREADSHEET,
        order_by: "-created_at",
      });
      displayProperties = this.computedDisplayProperties(_filters?.display_properties);
    }

    // override existing order by if ordered by manual sort_order
    if (displayFilters.order_by === "sort_order") {
      displayFilters.order_by = "-created_at";
    }

    // Use setFilters to set all filters at once for proper Zustand reactivity
    this.store.setFilters(viewId, {
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
  updateFilterExpression: IWorkspaceIssuesFilter["updateFilterExpression"] = async (workspaceSlug, viewId, filters) => {
    try {
      // Use setRichFilters for proper Zustand reactivity
      this.store.setRichFilters(viewId, filters);

      this.rootIssueStore.workspaceIssues.fetchIssuesWithExistingPagination(workspaceSlug, viewId, "mutation");
    } catch (error) {
      console.log("error while updating rich filters", error);
      throw error;
    }
  };

  updateFilters: IWorkspaceIssuesFilter["updateFilters"] = async (workspaceSlug, projectId, type, filters, viewId) => {
    try {
      const issueFilters = this.getIssueFilters(viewId);

      if (!issueFilters) return;

      const _filters = {
        richFilters: issueFilters.richFilters,
        displayFilters: issueFilters.displayFilters as IIssueDisplayFilterOptions,
        displayProperties: issueFilters.displayProperties as IIssueDisplayProperties,
        kanbanFilters: issueFilters.kanbanFilters as TIssueKanbanFilters,
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

          // Use setDisplayFilters directly for proper Zustand reactivity
          this.store.setDisplayFilters(viewId, updatedDisplayFilters);

          this.rootIssueStore.workspaceIssues.fetchIssuesWithExistingPagination(workspaceSlug, viewId, "mutation");

          if (["all-issues", "assigned", "created", "subscribed"].includes(viewId))
            this.handleIssuesLocalFilters.set(EIssuesStoreType.GLOBAL, type, workspaceSlug, undefined, viewId, {
              display_filters: _filters.displayFilters,
            });
          break;
        }
        case EIssueFilterType.DISPLAY_PROPERTIES: {
          const updatedDisplayProperties = filters as IIssueDisplayProperties;
          _filters.displayProperties = { ..._filters.displayProperties, ...updatedDisplayProperties };

          // Use setDisplayProperties for proper Zustand reactivity
          this.store.setDisplayProperties(viewId, updatedDisplayProperties);

          if (["all-issues", "assigned", "created", "subscribed"].includes(viewId))
            this.handleIssuesLocalFilters.set(EIssuesStoreType.GLOBAL, type, workspaceSlug, undefined, viewId, {
              display_properties: _filters.displayProperties,
            });
          break;
        }

        case EIssueFilterType.KANBAN_FILTERS: {
          const updatedKanbanFilters = filters as TIssueKanbanFilters;
          _filters.kanbanFilters = { ..._filters.kanbanFilters, ...updatedKanbanFilters };

          const currentUserId = this.rootIssueStore.currentUserId;
          if (currentUserId)
            this.handleIssuesLocalFilters.set(EIssuesStoreType.GLOBAL, type, workspaceSlug, undefined, viewId, {
              kanban_filters: _filters.kanbanFilters,
            });

          // Use setKanbanFilters for proper Zustand reactivity
          this.store.setKanbanFilters(viewId, updatedKanbanFilters);

          break;
        }
        default:
          break;
      }
    } catch (error) {
      if (viewId) this.fetchFilters(workspaceSlug, viewId);
      throw error;
    }
  };
}
