import { set as lodashSet } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { EIssueFilterType } from "@plane/constants";
import type {
  IIssueDisplayFilterOptions,
  IIssueDisplayProperties,
  IIssueFilterOptions,
  ISubWorkItemFilters,
  TGroupedIssues,
  TIssue,
} from "@plane/types";
import { getFilteredWorkItems, getGroupedWorkItemIds, updateSubWorkItemFilters } from "../helpers/base-issues-utils";

export const DEFAULT_DISPLAY_PROPERTIES: IIssueDisplayProperties = {
  key: true,
  issue_type: true,
  assignee: true,
  start_date: true,
  due_date: true,
  labels: true,
  priority: true,
  state: true,
};

export interface IWorkItemSubIssueFiltersStore {
  subIssueFilters: Record<string, Partial<ISubWorkItemFilters>>;
  // helpers methods
  getSubIssueFilters: (workItemId: string) => Partial<ISubWorkItemFilters>;
  initializeFilters: (workItemId: string) => void;
  updateSubWorkItemFilters: (
    filterType: EIssueFilterType,
    filters: IIssueDisplayFilterOptions | IIssueDisplayProperties | IIssueFilterOptions,
    workItemId: string
  ) => void;
  getGroupedSubWorkItems: (
    parentWorkItemId: string,
    getFilteredSubWorkItems: (workItemId: string, filters: IIssueFilterOptions) => TIssue[]
  ) => TGroupedIssues;
  resetFilters: (workItemId: string) => void;
}

export const useWorkItemSubIssueFiltersStore = create<IWorkItemSubIssueFiltersStore>()(
  immer((set, get) => ({
    // state
    subIssueFilters: {},

    // helpers methods
    getSubIssueFilters: (workItemId: string) => {
      const state = get();
      if (!state.subIssueFilters[workItemId]) {
        state.initializeFilters(workItemId);
      }
      return get().subIssueFilters[workItemId] || {
        displayProperties: DEFAULT_DISPLAY_PROPERTIES,
        filters: {},
        displayFilters: {},
      };
    },

    initializeFilters: (workItemId: string) => {
      set((state) => {
        if (!state.subIssueFilters[workItemId]) {
          state.subIssueFilters[workItemId] = {};
        }
        state.subIssueFilters[workItemId].displayProperties = DEFAULT_DISPLAY_PROPERTIES;
        state.subIssueFilters[workItemId].filters = {};
        state.subIssueFilters[workItemId].displayFilters = {};
      });
    },

    updateSubWorkItemFilters: (
      filterType: EIssueFilterType,
      filters: IIssueDisplayFilterOptions | IIssueDisplayProperties | IIssueFilterOptions,
      workItemId: string
    ) => {
      set((state) => {
        updateSubWorkItemFilters(state.subIssueFilters, filterType, filters, workItemId);
      });
    },

    getGroupedSubWorkItems: (
      parentWorkItemId: string,
      getFilteredSubWorkItems: (workItemId: string, filters: IIssueFilterOptions) => TIssue[]
    ) => {
      const subIssueFilters = get().getSubIssueFilters(parentWorkItemId);
      const filteredWorkItems = getFilteredSubWorkItems(parentWorkItemId, subIssueFilters.filters ?? {});

      // get group by and order by
      const groupByKey = subIssueFilters.displayFilters?.group_by;
      const orderByKey = subIssueFilters.displayFilters?.order_by;

      const groupedWorkItemIds = getGroupedWorkItemIds(filteredWorkItems, groupByKey, orderByKey);
      return groupedWorkItemIds;
    },

    resetFilters: (workItemId: string) => {
      get().initializeFilters(workItemId);
    },
  }))
);

// Export factory function for backwards compatibility
export const createWorkItemSubIssueFiltersStore = () => useWorkItemSubIssueFiltersStore.getState();
