"use client";

import { create } from "zustand";
import { cloneDeep, isEqual, set } from "lodash-es";
// plane internal
import { ISSUE_DISPLAY_FILTERS_BY_LAYOUT } from "@plane/constants";
import type { IssuePaginationOptions, TIssueParams } from "@plane/types";
// types
import type {
  TIssueLayoutOptions,
  TIssueFilters,
  TIssueQueryFilters,
  TIssueQueryFiltersParams,
  TIssueFilterKeys,
} from "@/types/issue";
import { getPaginationParams } from "./helpers/filter.helpers";

interface IssueFilterState {
  // State
  layoutOptions: TIssueLayoutOptions;
  filters: { [anchor: string]: TIssueFilters } | undefined;

  // Actions
  updateLayoutOptions: (options: TIssueLayoutOptions) => void;
  initIssueFilters: (anchor: string, filters: TIssueFilters) => void;
  updateIssueFilters: <K extends keyof TIssueFilters>(
    anchor: string,
    filterKind: K,
    filterKey: keyof TIssueFilters[K],
    filterValue: TIssueFilters[K][typeof filterKey]
  ) => void;

  // Getters
  getIssueFilters: (anchor: string) => TIssueFilters | undefined;
  getAppliedFilters: (anchor: string) => TIssueQueryFiltersParams | undefined;
  isIssueFiltersUpdated: (anchor: string, userFilters: TIssueFilters) => boolean;
  getFilterParams: (
    options: IssuePaginationOptions,
    anchor: string,
    cursor: string | undefined,
    groupId: string | undefined,
    subGroupId: string | undefined
  ) => Partial<Record<TIssueParams, string | boolean>>;
}

const computedFilter = (filters: TIssueQueryFilters, filteredParams: TIssueFilterKeys[]): TIssueQueryFiltersParams => {
  const computedFilters: TIssueQueryFiltersParams = {};

  Object.keys(filters).map((key) => {
    const currentFilterKey = key as TIssueFilterKeys;
    const filterValue = filters[currentFilterKey] as any;

    if (filterValue !== undefined && filteredParams.includes(currentFilterKey)) {
      if (Array.isArray(filterValue)) computedFilters[currentFilterKey] = filterValue.join(",");
      else if (typeof filterValue === "string" || typeof filterValue === "boolean")
        computedFilters[currentFilterKey] = filterValue.toString();
    }
  });

  return computedFilters;
};

export const useIssueFiltersStore = create<IssueFilterState>((setState, getState) => ({
  // Initial state
  layoutOptions: {
    list: true,
    kanban: false,
    calendar: false,
    gantt: false,
    spreadsheet: false,
  },
  filters: undefined,

  // Actions
  updateLayoutOptions: (options) => {
    setState({ layoutOptions: options });
  },

  initIssueFilters: (anchor, initFilters) => {
    setState((state) => {
      const newFilters = state.filters ? { ...state.filters } : {};
      newFilters[anchor] = initFilters;
      return { filters: newFilters };
    });
  },

  updateIssueFilters: (anchor, filterKind, filterKey, filterValue) => {
    if (!filterKind || !filterKey || filterValue === undefined) return;

    setState((state) => {
      const newFilters = state.filters ? { ...state.filters } : {};
      if (!newFilters[anchor]) {
        newFilters[anchor] = {} as TIssueFilters;
      }
      set(newFilters, [anchor, filterKind, filterKey], filterValue);
      return { filters: newFilters };
    });
  },

  // Getters
  getIssueFilters: (anchor) => {
    return getState().filters?.[anchor];
  },

  getAppliedFilters: (anchor) => {
    const issueFilters = getState().filters?.[anchor];
    if (!issueFilters) return undefined;

    const currentLayout = issueFilters?.display_filters?.layout;
    if (!currentLayout) return undefined;

    const currentFilters: TIssueQueryFilters = {
      priority: issueFilters?.filters?.priority || undefined,
      state: issueFilters?.filters?.state || undefined,
      labels: issueFilters?.filters?.labels || undefined,
    };
    const filteredParams = ISSUE_DISPLAY_FILTERS_BY_LAYOUT?.[currentLayout]?.filters || [];
    return computedFilter(currentFilters, filteredParams);
  },

  isIssueFiltersUpdated: (anchor, userFilters) => {
    const issueFilters = getState().filters?.[anchor];
    if (!issueFilters) return false;
    const currentUserFilters = cloneDeep(userFilters?.filters || {});
    const currentIssueFilters = cloneDeep(issueFilters?.filters || {});
    return isEqual(currentUserFilters, currentIssueFilters);
  },

  getFilterParams: (options, anchor, cursor, groupId, subGroupId) => {
    const filterParams = getState().getAppliedFilters(anchor);
    return getPaginationParams(filterParams, options, cursor, groupId, subGroupId);
  },
}));
