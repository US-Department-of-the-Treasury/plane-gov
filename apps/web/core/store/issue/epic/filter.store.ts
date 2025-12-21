import { isEmpty, set } from "lodash-es";
import { action, computed, makeObservable, observable, runInAction } from "mobx";
// base class
import { computedFn } from "mobx-utils";
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

export class EpicIssuesFilter extends IssueFilterHelperStore implements IEpicIssuesFilter {
  // observables
  filters: { [epicId: string]: IIssueFilters } = {};
  // root store
  rootIssueStore: IIssueRootStore;
  // services
  issueFilterService;

  constructor(_rootStore: IIssueRootStore) {
    super();
    makeObservable(this, {
      // observables
      filters: observable,
      // computed
      issueFilters: computed,
      appliedFilters: computed,
      // actions
      fetchFilters: action,
      updateFilters: action,
    });
    // root store
    this.rootIssueStore = _rootStore;
    // services
    this.issueFilterService = new IssueFiltersService();
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

  getFilterParams = computedFn(
    (
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
    }
  );

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

    runInAction(() => {
      set(this.filters, [epicId, "richFilters"], richFilters);
      set(this.filters, [epicId, "displayFilters"], displayFilters);
      set(this.filters, [epicId, "displayProperties"], displayProperties);
      set(this.filters, [epicId, "kanbanFilters"], kanbanFilters);
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
      runInAction(() => {
        set(this.filters, [epicId, "richFilters"], filters);
      });

      this.rootIssueStore.epicIssues.fetchIssuesWithExistingPagination(
        workspaceSlug,
        projectId,
        "mutation",
        epicId
      );
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

          runInAction(() => {
            Object.keys(updatedDisplayFilters).forEach((_key) => {
              set(
                this.filters,
                [epicId, "displayFilters", _key],
                updatedDisplayFilters[_key as keyof IIssueDisplayFilterOptions]
              );
            });
          });

          if (this.getShouldClearIssues(updatedDisplayFilters)) {
            this.rootIssueStore.epicIssues.clear(true); // clear issues for local store when some filters like layout changes
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

          runInAction(() => {
            Object.keys(updatedDisplayProperties).forEach((_key) => {
              set(
                this.filters,
                [epicId, "displayProperties", _key],
                updatedDisplayProperties[_key as keyof IIssueDisplayProperties]
              );
            });
          });

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

          runInAction(() => {
            Object.keys(updatedKanbanFilters).forEach((_key) => {
              set(
                this.filters,
                [epicId, "kanbanFilters", _key],
                updatedKanbanFilters[_key as keyof TIssueKanbanFilters]
              );
            });
          });

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
