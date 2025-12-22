"use client";

import { create } from "zustand";
import { concat, get, set, uniq, update } from "lodash-es";
import { ALL_ISSUES } from "@plane/constants";
import { SitesIssueService } from "@plane/services";
import type {
  TGroupedIssues,
  TSubGroupedIssues,
  TLoader,
  IssuePaginationOptions,
  TIssuePaginationData,
  TGroupedIssueCount,
  TPaginationData,
  TIssues,
} from "@plane/types";
import type { IIssue, TIssuesResponse } from "@/types/issue";

const issueService = new SitesIssueService();

interface IssueListState {
  // State
  loader: Record<string, TLoader>;
  groupedIssueIds: TGroupedIssues | TSubGroupedIssues | undefined;
  issuePaginationData: TIssuePaginationData;
  groupedIssueCount: TGroupedIssueCount;
  paginationOptions: IssuePaginationOptions | undefined;
  issueMap: Record<string, IIssue>;

  // Actions
  setLoader: (loaderValue: TLoader, groupId?: string, subGroupId?: string) => void;
  getIssueLoader: (groupId?: string, subGroupId?: string) => TLoader;
  getPaginationData: (groupId?: string, subGroupId?: string) => TPaginationData | undefined;
  getGroupIssueCount: (groupId?: string, subGroupId?: string, isSubGroupCumulative?: boolean) => number | undefined;
  getIssueById: (issueId: string) => IIssue | undefined;
  addIssues: (issues: IIssue[]) => void;
  clear: (shouldClearPaginationOptions?: boolean) => void;

  // Fetch actions
  fetchPublicIssues: (
    anchor: string,
    loadType: TLoader,
    options: IssuePaginationOptions,
    filterParams?: Record<string, string | boolean>
  ) => Promise<void>;
  fetchNextPublicIssues: (
    anchor: string,
    groupId?: string,
    subGroupId?: string,
    filterParams?: Record<string, string | boolean>
  ) => Promise<void>;
}

const getGroupKey = (groupId?: string, subGroupId?: string): string => {
  if (groupId && subGroupId && subGroupId !== "null") return `${groupId}_${subGroupId}`;
  if (groupId) return groupId;
  return ALL_ISSUES;
};

const processIssueResponse = (
  issueResponse: TIssuesResponse
): {
  issueList: IIssue[];
  groupedIssues: TIssues;
  groupedIssueCount: TGroupedIssueCount;
} => {
  const issueResult = issueResponse?.results;

  if (!issueResult) {
    return { issueList: [], groupedIssues: {}, groupedIssueCount: {} };
  }

  if (Array.isArray(issueResult)) {
    return {
      issueList: issueResult,
      groupedIssues: { [ALL_ISSUES]: issueResult.map((issue) => issue.id) },
      groupedIssueCount: { [ALL_ISSUES]: issueResponse.total_count },
    };
  }

  const issueList: IIssue[] = [];
  const groupedIssues: TGroupedIssues | TSubGroupedIssues = {};
  const groupedIssueCount: TGroupedIssueCount = {};

  set(groupedIssueCount, [ALL_ISSUES], issueResponse.total_count);

  for (const groupId in issueResult) {
    const groupIssuesObject = issueResult[groupId];
    const groupIssueResult = groupIssuesObject?.results;

    if (!groupIssueResult) continue;

    set(groupedIssueCount, [groupId], groupIssuesObject.total_results);

    if (Array.isArray(groupIssueResult)) {
      issueList.push(...groupIssueResult);
      set(
        groupedIssues,
        [groupId],
        groupIssueResult.map((issue) => issue.id)
      );
      continue;
    }

    for (const subGroupId in groupIssueResult) {
      const subGroupIssuesObject = groupIssueResult[subGroupId];
      const subGroupIssueResult = subGroupIssuesObject?.results;

      if (!subGroupIssueResult) continue;

      set(groupedIssueCount, [getGroupKey(groupId, subGroupId)], subGroupIssuesObject.total_results);

      if (Array.isArray(subGroupIssueResult)) {
        issueList.push(...subGroupIssueResult);
        set(
          groupedIssues,
          [groupId, subGroupId],
          subGroupIssueResult.map((issue) => issue.id)
        );
      }
    }
  }

  return { issueList, groupedIssues, groupedIssueCount };
};

export const useIssueListStore = create<IssueListState>((setState, getState) => ({
  // Initial state
  loader: {},
  groupedIssueIds: undefined,
  issuePaginationData: {},
  groupedIssueCount: {},
  paginationOptions: undefined,
  issueMap: {},

  // Actions
  setLoader: (loaderValue, groupId, subGroupId) => {
    setState((state) => ({
      loader: { ...state.loader, [getGroupKey(groupId, subGroupId)]: loaderValue },
    }));
  },

  getIssueLoader: (groupId, subGroupId) => {
    return get(getState().loader, getGroupKey(groupId, subGroupId));
  },

  getPaginationData: (groupId, subGroupId) => {
    return get(getState().issuePaginationData, [getGroupKey(groupId, subGroupId)]);
  },

  getGroupIssueCount: (groupId, subGroupId, isSubGroupCumulative = false) => {
    const state = getState();
    if (isSubGroupCumulative && subGroupId) {
      const groupIssuesKeys = Object.keys(state.groupedIssueCount);
      let subGroupCumulativeCount = 0;
      for (const groupKey of groupIssuesKeys) {
        if (groupKey.includes(`_${subGroupId}`)) {
          subGroupCumulativeCount += state.groupedIssueCount[groupKey] ?? 0;
        }
      }
      return subGroupCumulativeCount;
    }
    return get(state.groupedIssueCount, [getGroupKey(groupId, subGroupId)]);
  },

  getIssueById: (issueId) => {
    return getState().issueMap[issueId];
  },

  addIssues: (issues) => {
    if (!issues || issues.length === 0) return;
    setState((state) => {
      const newMap = { ...state.issueMap };
      issues.forEach((issue) => {
        newMap[issue.id] = issue;
      });
      return { issueMap: newMap };
    });
  },

  clear: (shouldClearPaginationOptions = true) => {
    setState({
      groupedIssueIds: undefined,
      issuePaginationData: {},
      groupedIssueCount: {},
      ...(shouldClearPaginationOptions ? { paginationOptions: undefined } : {}),
    });
  },

  fetchPublicIssues: async (anchor, loadType = "init-loader", options, filterParams = {}) => {
    const state = getState();

    state.setLoader(loadType);
    state.clear(true);

    const params = {
      ...filterParams,
      per_page: options.perPageCount ?? 50,
      ...(options.groupedBy ? { group_by: options.groupedBy } : {}),
      ...(options.subGroupedBy ? { sub_group_by: options.subGroupedBy } : {}),
    };

    const response = await issueService.list(anchor, params);
    const { issueList, groupedIssues, groupedIssueCount } = processIssueResponse(response);

    // Add issues to map
    state.addIssues(issueList);

    // Update state with grouped data
    const updateGroupedIssueIds = (
      currentGroupedIssues: TGroupedIssues | TSubGroupedIssues | undefined,
      newGroupedIssues: TIssues
    ): TGroupedIssues | TSubGroupedIssues => {
      const result: TGroupedIssues | TSubGroupedIssues = currentGroupedIssues ? { ...currentGroupedIssues } : {};

      for (const groupId in newGroupedIssues) {
        const issueGroup = newGroupedIssues[groupId];
        if (Array.isArray(issueGroup)) {
          const existing = (result as TGroupedIssues)[groupId] ?? [];
          (result as TGroupedIssues)[groupId] = uniq(concat(existing, issueGroup));
        } else {
          for (const subGroupId in issueGroup) {
            const subGroup = (issueGroup as TGroupedIssues)[subGroupId];
            if (Array.isArray(subGroup)) {
              if (!(result as TSubGroupedIssues)[groupId]) {
                (result as TSubGroupedIssues)[groupId] = {};
              }
              const existing = ((result as TSubGroupedIssues)[groupId] as TGroupedIssues)[subGroupId] ?? [];
              ((result as TSubGroupedIssues)[groupId] as TGroupedIssues)[subGroupId] = uniq(concat(existing, subGroup));
            }
          }
        }
      }

      return result;
    };

    setState((currentState) => ({
      groupedIssueIds: updateGroupedIssueIds(undefined, groupedIssues),
      groupedIssueCount: { ...currentState.groupedIssueCount, ...groupedIssueCount },
      issuePaginationData: {
        ...currentState.issuePaginationData,
        [getGroupKey()]: {
          prevCursor: response.prev_cursor,
          nextCursor: response.next_cursor,
          nextPageResults: response.next_page_results,
        },
      },
      paginationOptions: options,
      loader: { ...currentState.loader, [getGroupKey()]: undefined },
    }));
  },

  fetchNextPublicIssues: async (anchor, groupId, subGroupId, filterParams = {}) => {
    const state = getState();
    const cursorObject = state.getPaginationData(groupId, subGroupId);

    if (!state.paginationOptions || (cursorObject && !cursorObject?.nextPageResults)) return;

    state.setLoader("pagination", groupId, subGroupId);

    const params = {
      ...filterParams,
      per_page: state.paginationOptions.perPageCount ?? 50,
      cursor: cursorObject?.nextCursor,
      ...(state.paginationOptions.groupedBy ? { group_by: state.paginationOptions.groupedBy } : {}),
      ...(state.paginationOptions.subGroupedBy ? { sub_group_by: state.paginationOptions.subGroupedBy } : {}),
      ...(groupId ? { group_id: groupId } : {}),
      ...(subGroupId && subGroupId !== "null" ? { sub_group_id: subGroupId } : {}),
    };

    const response = await issueService.list(anchor, params);
    const { issueList, groupedIssues, groupedIssueCount } = processIssueResponse(response);

    state.addIssues(issueList);

    setState((currentState) => {
      let newGroupedIssueIds = currentState.groupedIssueIds ? { ...currentState.groupedIssueIds } : {};

      // Handle individual group/subgroup pagination
      if (groupId && groupedIssues[ALL_ISSUES] && Array.isArray(groupedIssues[ALL_ISSUES])) {
        const issueGroup = groupedIssues[ALL_ISSUES];
        if (subGroupId && subGroupId !== "null") {
          if (!(newGroupedIssueIds as TSubGroupedIssues)[groupId]) {
            (newGroupedIssueIds as TSubGroupedIssues)[groupId] = {};
          }
          const existing = ((newGroupedIssueIds as TSubGroupedIssues)[groupId] as TGroupedIssues)[subGroupId] ?? [];
          ((newGroupedIssueIds as TSubGroupedIssues)[groupId] as TGroupedIssues)[subGroupId] = uniq(
            concat(existing, issueGroup)
          );
        } else {
          const existing = (newGroupedIssueIds as TGroupedIssues)[groupId] ?? [];
          (newGroupedIssueIds as TGroupedIssues)[groupId] = uniq(concat(existing, issueGroup));
        }
      } else {
        // Full grouped pagination
        for (const gId in groupedIssues) {
          const issueGroup = groupedIssues[gId];
          if (Array.isArray(issueGroup)) {
            const existing = (newGroupedIssueIds as TGroupedIssues)[gId] ?? [];
            (newGroupedIssueIds as TGroupedIssues)[gId] = uniq(concat(existing, issueGroup));
          } else {
            for (const sGId in issueGroup) {
              const subGroup = (issueGroup as TGroupedIssues)[sGId];
              if (Array.isArray(subGroup)) {
                if (!(newGroupedIssueIds as TSubGroupedIssues)[gId]) {
                  (newGroupedIssueIds as TSubGroupedIssues)[gId] = {};
                }
                const existing = ((newGroupedIssueIds as TSubGroupedIssues)[gId] as TGroupedIssues)[sGId] ?? [];
                ((newGroupedIssueIds as TSubGroupedIssues)[gId] as TGroupedIssues)[sGId] = uniq(
                  concat(existing, subGroup)
                );
              }
            }
          }
        }
      }

      const newGroupedIssueCount = { ...currentState.groupedIssueCount };
      if (groupId && groupedIssueCount[ALL_ISSUES] !== undefined) {
        newGroupedIssueCount[getGroupKey(groupId, subGroupId)] = groupedIssueCount[ALL_ISSUES];
      } else {
        Object.assign(newGroupedIssueCount, groupedIssueCount);
      }

      return {
        groupedIssueIds: newGroupedIssueIds,
        groupedIssueCount: newGroupedIssueCount,
        issuePaginationData: {
          ...currentState.issuePaginationData,
          [getGroupKey(groupId, subGroupId)]: {
            prevCursor: response.prev_cursor,
            nextCursor: response.next_cursor,
            nextPageResults: response.next_page_results,
          },
        },
        loader: { ...currentState.loader, [getGroupKey(groupId, subGroupId)]: undefined },
      };
    });
  },
}));
