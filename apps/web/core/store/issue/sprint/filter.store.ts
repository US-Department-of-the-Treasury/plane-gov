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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateFilterField: (sprintId: string, field: string, value: any) => void;
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
        // Use explicit spread to create new references that Zustand selectors will detect
        state.filters[sprintId] = {
          ...(state.filters[sprintId] ?? {}),
          displayFilters: {
            ...(state.filters[sprintId]?.displayFilters ?? {}),
            ...displayFilters,
          },
        } as IIssueFilters;
      });
    },

    setDisplayProperties: (sprintId, displayProperties) => {
      set((state) => {
        // Use explicit spread to create new references that Zustand selectors will detect
        state.filters[sprintId] = {
          ...(state.filters[sprintId] ?? {}),
          displayProperties: {
            ...(state.filters[sprintId]?.displayProperties ?? {}),
            ...displayProperties,
          },
        } as IIssueFilters;
      });
    },

    setKanbanFilters: (sprintId, kanbanFilters) => {
      set((state) => {
        // Use explicit spread to create new references that Zustand selectors will detect
        state.filters[sprintId] = {
          ...(state.filters[sprintId] ?? {}),
          kanbanFilters: {
            ...(state.filters[sprintId]?.kanbanFilters ?? {}),
            ...kanbanFilters,
          },
        } as IIssueFilters;
      });
    },

    updateFilterField: (sprintId, field, value) => {
      set((state) => {
        // Use string path notation so lodash properly handles nested keys like "displayFilters.layout"
        // This matches the working pattern from project/filter.store.ts
        // With immer middleware, lodashSet allows proper mutation tracking at each path level
        lodashSet(state.filters, `${sprintId}.${field}`, value);
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
    let richFilters: TWorkItemFilterExpression = {};
    let displayFilters: IIssueDisplayFilterOptions;
    let displayProperties: IIssueDisplayProperties;

    try {
      const _filters = await this.issueFilterService.fetchSprintIssueFilters(workspaceSlug, projectId, sprintId);
      richFilters = _filters?.rich_filters ?? {};
      displayFilters = this.computedDisplayFilters(_filters?.display_filters ?? {} as IIssueDisplayFilterOptions);
      displayProperties = this.computedDisplayProperties(_filters?.display_properties ?? {} as IIssueDisplayProperties);
    } catch {
      // API might return 404 for sprints without user-properties - use defaults
      displayFilters = this.computedDisplayFilters({} as IIssueDisplayFilterOptions);
      displayProperties = this.computedDisplayProperties({} as IIssueDisplayProperties);
    }

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

          // Use setDisplayFilters directly instead of updateFilterField with lodashSet
          // This creates proper new object references that Zustand selectors will detect
          this.store.setDisplayFilters(sprintId, updatedDisplayFilters);

          if (this.getShouldClearIssues(updatedDisplayFilters)) {
            // Use clearAndSetLoader to atomically clear store AND set loader to prevent flash of empty state
            // The new layout component's useEffect will trigger the fetch
            this.rootIssueStore.sprintIssues.clearAndSetLoader("init-loader", true);
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

          // Use updateFilterField for each key, same pattern as ProjectIssuesFilter
          Object.keys(updatedDisplayProperties).forEach((_key) => {
            this.store.updateFilterField(
              sprintId,
              `displayProperties.${_key}`,
              updatedDisplayProperties[_key as keyof IIssueDisplayProperties]
            );
          });

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

          // Use updateFilterField for each key, same pattern as ProjectIssuesFilter
          Object.keys(updatedKanbanFilters).forEach((_key) => {
            this.store.updateFilterField(
              sprintId,
              `kanbanFilters.${_key}`,
              updatedKanbanFilters[_key as keyof TIssueKanbanFilters]
            );
          });

          break;
        }
        default:
          break;
      }
    } catch (error) {
      // Don't re-fetch on error - the Zustand store already has the updated local state
      // The PATCH may fail (e.g., 404 for user-properties) but we should keep the local change
      // This is intentional - the UI should reflect what the user selected even if the server
      // doesn't have user-properties for this sprint yet
      console.warn("Failed to persist sprint filter to server:", error);
    }
  };
}
