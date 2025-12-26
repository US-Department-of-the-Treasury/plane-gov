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
  IProjectView,
  TWorkItemFilterExpression,
  TSupportedFilterForUpdate,
} from "@plane/types";
import { EIssuesStoreType } from "@plane/types";
import { handleIssueQueryParamsByLayout } from "@plane/utils";
// services
import { ViewService } from "@/plane-web/services";
// zustand stores
import { useProjectViewStore } from "@/store/client";
import type { IBaseIssueFilterStore } from "../helpers/issue-filter-helper.store";
import { IssueFilterHelperStore } from "../helpers/issue-filter-helper.store";
// helpers
// types
import type { IIssueRootStore } from "../root.store";
// constants

export interface IProjectViewIssuesFilter extends IBaseIssueFilterStore {
  //helper actions
  getFilterParams: (
    options: IssuePaginationOptions,
    viewId: string,
    cursor: string | undefined,
    groupId: string | undefined,
    subGroupId: string | undefined
  ) => Partial<Record<TIssueParams, string | boolean>>;
  getIssueFilters(viewId: string): IIssueFilters | undefined;
  // helper actions
  mutateFilters: (workspaceSlug: string, viewId: string, viewDetails: IProjectView) => void;
  // action
  fetchFilters: (workspaceSlug: string, projectId: string, viewId: string) => Promise<void>;
  updateFilterExpression: (
    workspaceSlug: string,
    projectId: string,
    viewId: string,
    filters: TWorkItemFilterExpression
  ) => Promise<void>;
  updateFilters: (
    workspaceSlug: string,
    projectId: string,
    filterType: TSupportedFilterTypeForUpdate,
    filters: TSupportedFilterForUpdate,
    viewId: string
  ) => Promise<void>;
  resetFilters: (workspaceSlug: string, viewId: string) => void;
}

// Zustand Store
interface ProjectViewIssuesFilterState {
  filters: { [viewId: string]: IIssueFilters };
}

interface ProjectViewIssuesFilterActions {
  setFilters: (viewId: string, filters: IIssueFilters) => void;
  setRichFilters: (viewId: string, richFilters: TWorkItemFilterExpression) => void;
  setDisplayFilters: (viewId: string, displayFilters: Partial<IIssueDisplayFilterOptions>) => void;
  setDisplayProperties: (viewId: string, displayProperties: Partial<IIssueDisplayProperties>) => void;
  setKanbanFilters: (viewId: string, kanbanFilters: Partial<TIssueKanbanFilters>) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateFilterField: (viewId: string, field: string, value: any) => void;
}

type ProjectViewIssuesFilterStore = ProjectViewIssuesFilterState & ProjectViewIssuesFilterActions;

export const useProjectViewIssuesFilterStore = create<ProjectViewIssuesFilterStore>()(
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
export class ProjectViewIssuesFilter extends IssueFilterHelperStore implements IProjectViewIssuesFilter {
  // root store
  rootIssueStore;
  // services
  issueFilterService;

  constructor(_rootStore: IIssueRootStore) {
    super();
    // root store
    this.rootIssueStore = _rootStore;
    // services
    this.issueFilterService = new ViewService();
  }

  private get store() {
    return useProjectViewIssuesFilterStore.getState();
  }

  get filters() {
    return this.store.filters;
  }

  get issueFilters() {
    const viewId = this.rootIssueStore.viewId;
    if (!viewId) return undefined;

    return this.getIssueFilters(viewId);
  }

  get appliedFilters() {
    const viewId = this.rootIssueStore.viewId;
    if (!viewId) return undefined;

    return this.getAppliedFilters(viewId);
  }

  getIssueFilters(viewId: string) {
    const displayFilters = this.filters[viewId] || undefined;
    if (isEmpty(displayFilters)) return undefined;

    const _filters: IIssueFilters = this.computedIssueFilters(displayFilters);

    return _filters;
  }

  getAppliedFilters(viewId: string) {
    const userFilters = this.getIssueFilters(viewId);
    if (!userFilters) return undefined;

    const filteredParams = handleIssueQueryParamsByLayout(userFilters?.displayFilters?.layout, "issues");
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
    viewId: string,
    cursor: string | undefined,
    groupId: string | undefined,
    subGroupId: string | undefined
  ) => {
    const filterParams = this.getAppliedFilters(viewId);

    const paginationParams = this.getPaginationParams(filterParams, options, cursor, groupId, subGroupId);
    return paginationParams;
  };

  mutateFilters: IProjectViewIssuesFilter["mutateFilters"] = (workspaceSlug, viewId, viewDetails) => {
    const richFilters: TWorkItemFilterExpression = viewDetails?.rich_filters;
    const displayFilters: IIssueDisplayFilterOptions = this.computedDisplayFilters(viewDetails?.display_filters);
    const displayProperties: IIssueDisplayProperties = this.computedDisplayProperties(viewDetails?.display_properties);

    // fetching the kanban toggle helpers in the local storage
    const kanbanFilters = {
      group_by: [],
      sub_group_by: [],
    };
    const currentUserId = this.rootIssueStore.currentUserId;
    if (currentUserId) {
      const _kanbanFilters = this.handleIssuesLocalFilters.get(
        EIssuesStoreType.PROJECT_VIEW,
        workspaceSlug,
        viewId,
        currentUserId
      );
      kanbanFilters.group_by = _kanbanFilters?.kanban_filters?.group_by || [];
      kanbanFilters.sub_group_by = _kanbanFilters?.kanban_filters?.sub_group_by || [];
    }

    // Use setFilters to set all filters at once for proper Zustand reactivity
    this.store.setFilters(viewId, {
      richFilters,
      displayFilters,
      displayProperties,
      kanbanFilters,
    });
  };

  fetchFilters = async (workspaceSlug: string, projectId: string, viewId: string) => {
    try {
      const viewDetails = await this.issueFilterService.getViewDetails(workspaceSlug, projectId, viewId);
      this.mutateFilters(workspaceSlug, viewId, viewDetails);
    } catch (error) {
      console.log("error while fetching project view filters", error);
      throw error;
    }
  };

  /**
   * NOTE: This method is designed as a fallback function for the work item filter store.
   * Only use this method directly when initializing filter instances.
   * For regular filter updates, use this method as a fallback function for the work item filter store methods instead.
   */
  updateFilterExpression: IProjectViewIssuesFilter["updateFilterExpression"] = async (
    workspaceSlug,
    projectId,
    viewId,
    filters
  ) => {
    try {
      // Use setRichFilters for proper Zustand reactivity
      this.store.setRichFilters(viewId, filters);

      this.rootIssueStore.projectViewIssues.fetchIssuesWithExistingPagination(
        workspaceSlug,
        projectId,
        viewId,
        "mutation"
      );
    } catch (error) {
      console.log("error while updating rich filters", error);
      throw error;
    }
  };

  updateFilters: IProjectViewIssuesFilter["updateFilters"] = async (
    workspaceSlug,
    projectId,
    type,
    filters,
    viewId
  ) => {
    try {
      if (isEmpty(this.filters) || isEmpty(this.filters[viewId])) return;

      const _filters = {
        richFilters: this.filters[viewId].richFilters,
        displayFilters: this.filters[viewId].displayFilters as IIssueDisplayFilterOptions,
        displayProperties: this.filters[viewId].displayProperties as IIssueDisplayProperties,
        kanbanFilters: this.filters[viewId].kanbanFilters as TIssueKanbanFilters,
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

          // Use setDisplayFilters directly instead of updateFilterField with lodashSet
          // This creates proper new object references that Zustand selectors will detect
          this.store.setDisplayFilters(viewId, updatedDisplayFilters);

          if (this.getShouldClearIssues(updatedDisplayFilters)) {
            // Use clearAndSetLoader to atomically clear store AND set loader to prevent flash of empty state
            // The new layout component's useEffect will trigger the fetch
            this.rootIssueStore.projectViewIssues.clearAndSetLoader("init-loader", true);
          }

          if (this.getShouldReFetchIssues(updatedDisplayFilters)) {
            this.rootIssueStore.projectViewIssues.fetchIssuesWithExistingPagination(
              workspaceSlug,
              projectId,
              viewId,
              "mutation"
            );
          }

          break;
        }
        case EIssueFilterType.DISPLAY_PROPERTIES: {
          const updatedDisplayProperties = filters as IIssueDisplayProperties;
          _filters.displayProperties = { ..._filters.displayProperties, ...updatedDisplayProperties };

          // Use setDisplayProperties for proper Zustand reactivity
          this.store.setDisplayProperties(viewId, updatedDisplayProperties);

          break;
        }
        case EIssueFilterType.KANBAN_FILTERS: {
          const updatedKanbanFilters = filters as TIssueKanbanFilters;
          _filters.kanbanFilters = { ..._filters.kanbanFilters, ...updatedKanbanFilters };

          const currentUserId = this.rootIssueStore.currentUserId;
          if (currentUserId)
            this.handleIssuesLocalFilters.set(
              EIssuesStoreType.PROJECT_VIEW,
              type,
              workspaceSlug,
              viewId,
              currentUserId,
              {
                kanban_filters: _filters.kanbanFilters,
              }
            );

          // Use setKanbanFilters for proper Zustand reactivity
          this.store.setKanbanFilters(viewId, updatedKanbanFilters);

          break;
        }
        default:
          break;
      }
    } catch (error) {
      if (viewId) this.fetchFilters(workspaceSlug, projectId, viewId);
      throw error;
    }
  };

  /**
   * @description resets the filters for a project view
   * @param workspaceSlug
   * @param viewId
   */
  resetFilters: IProjectViewIssuesFilter["resetFilters"] = (workspaceSlug, viewId) => {
    const viewDetails = useProjectViewStore.getState().getViewById(viewId);
    if (!viewDetails) return;
    this.mutateFilters(workspaceSlug, viewId, viewDetails);
  };
}
