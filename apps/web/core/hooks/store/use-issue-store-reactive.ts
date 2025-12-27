/**
 * Reactive hooks for issue store state.
 *
 * These hooks provide reactive access to zustand store state that properly
 * triggers React re-renders when the state changes. They replace the non-reactive
 * class method calls that use getState() snapshots.
 *
 * @example
 * // Instead of non-reactive:
 * const loader = issues?.getIssueLoader();
 *
 * // Use reactive:
 * const loader = useIssueLoader(storeType);
 *
 * @example
 * // Instead of non-reactive:
 * const displayFilters = issuesFilter?.issueFilters?.displayFilters;
 *
 * // Use reactive:
 * const issueFilters = useProjectIssueFilters();
 * const displayFilters = issueFilters?.displayFilters;
 */

import { isEmpty } from "lodash-es";
import { useParams } from "next/navigation";
import { useCallback, useContext, useMemo, useRef, useSyncExternalStore } from "react";
import { useShallow } from "zustand/react/shallow";
import { ALL_ISSUES, EIssueGroupByToServerOptions, ENABLE_ISSUE_DEPENDENCIES } from "@plane/constants";
import type { IIssueFilters, TGroupedIssues, TIssueParams, TIssuesResponse, TLoader, TSubGroupedIssues, TUnGroupedIssues, IIssueDisplayFilterOptions, TWorkItemFilterExpression } from "@plane/types";
import { EIssueLayoutTypes, EIssuesStoreType } from "@plane/types";
import { handleIssueQueryParamsByLayout } from "@plane/utils";
import { StoreContext } from "@/lib/store-context";
import type { BaseIssuesZustandStore } from "@/store/issue/helpers/base-issues.store";
import { useArchivedIssuesFilterStore } from "@/store/issue/archived/filter.store";
import { useEpicIssuesFilterStore } from "@/store/issue/epic/filter.store";
import { useProjectIssuesFilterStore } from "@/store/issue/project/filter.store";
import { useSprintIssuesFilterStore } from "@/store/issue/sprint/filter.store";
import { useWorkspaceIssuesFilterStore } from "@/store/issue/workspace/filter.store";
import { useIssuesQuery } from "@/hooks/use-issues-query";

/**
 * Get the zustand store for a given issue store type.
 * Returns a stable reference that doesn't change between renders.
 */
function useIssueZustandStore(storeType: EIssuesStoreType): BaseIssuesZustandStore | null {
  const context = useContext(StoreContext);

  // Memoize the store selection to ensure stable reference
  const store = useMemo(() => {
    // Get the issue store based on store type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let issueStore: any = null;

    switch (storeType) {
      case EIssuesStoreType.GLOBAL:
        issueStore = context.issue.workspaceIssues;
        break;
      case EIssuesStoreType.WORKSPACE_DRAFT:
        // WorkspaceDraftIssues doesn't extend BaseIssuesStore, so it doesn't have getBaseStore
        return null;
      case EIssuesStoreType.PROFILE:
        issueStore = context.issue.profileIssues;
        break;
      case EIssuesStoreType.TEAM:
        issueStore = context.issue.teamIssues;
        break;
      case EIssuesStoreType.PROJECT:
        issueStore = context.issue.projectIssues;
        break;
      case EIssuesStoreType.SPRINT:
        issueStore = context.issue.sprintIssues;
        break;
      case EIssuesStoreType.EPIC:
        issueStore = context.issue.epicIssues;
        break;
      case EIssuesStoreType.TEAM_VIEW:
        issueStore = context.issue.teamViewIssues;
        break;
      case EIssuesStoreType.PROJECT_VIEW:
        issueStore = context.issue.projectViewIssues;
        break;
      case EIssuesStoreType.ARCHIVED:
        issueStore = context.issue.archivedIssues;
        break;
      case EIssuesStoreType.TEAM_PROJECT_WORK_ITEMS:
        issueStore = context.issue.teamProjectWorkItems;
        break;
      default:
        issueStore = context.issue.projectIssues;
    }

    // Return the zustand store if available
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (issueStore && typeof issueStore.getBaseStore === "function") {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      return issueStore.getBaseStore() as BaseIssuesZustandStore;
    }
    return null;
  }, [context.issue, storeType]);

  return store;
}

/**
 * Get the issue loader state reactively.
 * Re-renders the component when loader state changes.
 */
export function useIssueLoader(storeType: EIssuesStoreType, groupId?: string, subGroupId?: string): TLoader {
  const store = useIssueZustandStore(storeType);

  // Create stable subscribe function
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const subscribe = useMemo(() => {
    if (!store) return (_callback: () => void) => () => {};
    return (callback: () => void) => store.subscribe(callback);
  }, [store]);

  // Create stable getSnapshot function

  const getSnapshot = useMemo(() => {
    return () => {
      if (!store) return "init-loader" as TLoader;
      const loaderMap = store.getState().loader;

      // Derive the specific loader value using the same logic as getIssueLoader()
      // Uses getGroupKey() pattern: no args = ALL_ISSUES, groupId only = groupId, both = groupId_subGroupId
      // IMPORTANT: undefined means "loaded/done", so we must NOT fallback to "init-loader" when
      // the key exists with undefined value. Only fallback when the loaderMap itself is undefined.
      const key = !groupId ? ALL_ISSUES : groupId && subGroupId ? `${groupId}_${subGroupId}` : groupId;
      if (!loaderMap) return "init-loader" as TLoader;
      return loaderMap[key] as TLoader;
    };
  }, [store, groupId, subGroupId]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Get the grouped issue count reactively.
 * Re-renders the component when issue count changes.
 *
 * Now derives count from TanStack Query data first (via useGroupedIssueIds),
 * falling back to Zustand store for non-migrated store types.
 */
export function useGroupedIssueCount(
  storeType: EIssuesStoreType,
  groupId?: string,
  subGroupId?: string,
  isSubGroupCumulative?: boolean
): number | undefined {
  // Get grouped IDs from TanStack Query (or Zustand fallback)
  const groupedIssueIds = useGroupedIssueIds(storeType);

  // Derive count from grouped IDs
  return useMemo(() => {
    if (!groupedIssueIds || Object.keys(groupedIssueIds).length === 0) {
      return undefined;
    }

    // Uses getGroupKey() pattern: no args = ALL_ISSUES
    if (!groupId && !subGroupId) {
      // Type guard: TUnGroupedIssues is an array, so check if groupedIssueIds is not an array
      if (!Array.isArray(groupedIssueIds)) {
        const allIssues = groupedIssueIds[ALL_ISSUES];
        if (Array.isArray(allIssues)) {
          return allIssues.length;
        }
        // If no ALL_ISSUES key, sum all groups
        let total = 0;
        for (const key in groupedIssueIds) {
          const value = groupedIssueIds[key];
          if (Array.isArray(value)) {
            total += value.length;
          } else if (typeof value === "object" && value !== null) {
            // Sub-grouped: sum all sub-group arrays
            for (const subKey in value) {
              const subValue = (value as Record<string, string[]>)[subKey];
              if (Array.isArray(subValue)) {
                total += subValue.length;
              }
            }
          }
        }
        return total > 0 ? total : undefined;
      }
      return undefined;
    }

    if (isSubGroupCumulative && groupId && subGroupId) {
      // Type guard: ensure groupedIssueIds is not an array before indexing with string
      if (!Array.isArray(groupedIssueIds)) {
        const groupData = groupedIssueIds[groupId];
        if (typeof groupData === "object" && groupData !== null && !Array.isArray(groupData)) {
          return Object.values(groupData as Record<string, string[]>).reduce((acc: number, val) => {
            if (Array.isArray(val)) return acc + val.length;
            return acc;
          }, 0);
        }
      }
      return undefined;
    }

    if (groupId && !subGroupId) {
      // Type guard: ensure groupedIssueIds is not an array before indexing with string
      if (!Array.isArray(groupedIssueIds)) {
        const groupData = groupedIssueIds[groupId];
        if (Array.isArray(groupData)) {
          return groupData.length;
        }
        // If it's an object (subgroup data), sum all sub-arrays
        if (typeof groupData === "object" && groupData !== null) {
          return Object.values(groupData as Record<string, string[]>).reduce((acc: number, val) => {
            if (Array.isArray(val)) return acc + val.length;
            return acc;
          }, 0);
        }
      }
      return undefined;
    }

    if (groupId && subGroupId) {
      // Type guard: ensure groupedIssueIds is not an array before indexing with string
      if (!Array.isArray(groupedIssueIds)) {
        const groupData = groupedIssueIds[groupId];
        if (typeof groupData === "object" && groupData !== null && !Array.isArray(groupData)) {
          const subGroupData = (groupData as Record<string, string[]>)[subGroupId];
          return Array.isArray(subGroupData) ? subGroupData.length : undefined;
        }
      }
      return undefined;
    }

    return undefined;
  }, [groupedIssueIds, groupId, subGroupId, isSubGroupCumulative]);
}

// Empty store constant for fallback when no store is available
const EMPTY_GROUPED_IDS: TGroupedIssues = {};

/**
 * Shallow comparison for grouped issue IDs.
 * Returns true if the objects have the same keys with the same values (by reference).
 */
function shallowEqual(
  a: TGroupedIssues | TSubGroupedIssues | TUnGroupedIssues,
  b: TGroupedIssues | TSubGroupedIssues | TUnGroupedIssues
): boolean {
  if (a === b) return true;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    // Use type assertion for index access
    if ((a as Record<string, unknown>)[key] !== (b as Record<string, unknown>)[key]) return false;
  }
  return true;
}

/**
 * Extract grouped issue IDs from TanStack Query paginated response.
 * This derives the grouped structure directly from the API response data.
 */
function extractGroupedIssueIdsFromPages(
  pages: TIssuesResponse[] | undefined
): TGroupedIssues | TSubGroupedIssues | TUnGroupedIssues {
  if (!pages || pages.length === 0) return EMPTY_GROUPED_IDS;

  const groupedIds: Record<string, string[] | Record<string, string[]>> = {};

  for (const page of pages) {
    const results = page?.results;
    if (!results) continue;

    if (Array.isArray(results)) {
      // Ungrouped - use ALL_ISSUES key
      const existing = (groupedIds[ALL_ISSUES] as string[]) || [];
      groupedIds[ALL_ISSUES] = [...existing, ...results.map((issue) => issue.id)];
    } else {
      // Grouped response
      for (const groupId in results) {
        const groupData = results[groupId];
        if (!groupData?.results) continue;

        if (Array.isArray(groupData.results)) {
          // Single grouped
          const existing = (groupedIds[groupId] as string[]) || [];
          groupedIds[groupId] = [...existing, ...groupData.results.map((issue) => issue.id)];
        } else {
          // Sub-grouped
          if (!groupedIds[groupId]) {
            groupedIds[groupId] = {};
          }
          for (const subGroupId in groupData.results) {
            const subGroupData = groupData.results[subGroupId];
            if (subGroupData?.results) {
              const existingSub = ((groupedIds[groupId] as Record<string, string[]>)[subGroupId]) || [];
              (groupedIds[groupId] as Record<string, string[]>)[subGroupId] = [
                ...existingSub,
                ...subGroupData.results.map((issue) => issue.id),
              ];
            }
          }
        }
      }
    }
  }

  return groupedIds as TGroupedIssues | TSubGroupedIssues | TUnGroupedIssues;
}

/**
 * Get grouped issue IDs reactively from TanStack Query data.
 * Re-renders the component when TanStack Query data changes.
 *
 * This derives grouped IDs directly from TanStack Query's paginated response,
 * ensuring the UI updates when new data is fetched without requiring
 * manual synchronization to Zustand stores.
 *
 * Falls back to Zustand store for store types not yet migrated to TanStack Query.
 *
 * @returns The grouped issue IDs derived from query data or Zustand store
 */
export function useGroupedIssueIds(
  storeType: EIssuesStoreType
): TGroupedIssues | TSubGroupedIssues | TUnGroupedIssues {
  // Get TanStack Query data for supported store types
  const queryResult = useIssuesQuery(storeType);
  const store = useIssueZustandStore(storeType);

  // Cache the last result to maintain reference stability
  const cachedResult = useRef<TGroupedIssues | TSubGroupedIssues | TUnGroupedIssues>(EMPTY_GROUPED_IDS);

  // Derive grouped IDs from TanStack Query data
  const queryGroupedIds = useMemo(() => {
    if (queryResult.data?.pages && queryResult.data.pages.length > 0) {
      return extractGroupedIssueIdsFromPages(queryResult.data.pages);
    }
    return null;
  }, [queryResult.data?.pages]);

  // Create stable subscribe function for Zustand fallback
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!store) return () => {};
      return store.subscribe(onStoreChange);
    },
    [store]
  );

  // Create stable getSnapshot for Zustand fallback
  const getZustandSnapshot = useCallback(() => {
    if (!store) return EMPTY_GROUPED_IDS;
    return store.getState().groupedIssueIds ?? EMPTY_GROUPED_IDS;
  }, [store]);

  // Get Zustand store value (for fallback)
  const zustandGroupedIds = useSyncExternalStore(subscribe, getZustandSnapshot, getZustandSnapshot);

  // Prefer TanStack Query data, fall back to Zustand store
  const result = useMemo(() => {
    // If TanStack Query has data, use it
    if (queryGroupedIds && Object.keys(queryGroupedIds).length > 0) {
      return queryGroupedIds;
    }
    // Fall back to Zustand store (for non-migrated store types or during initial load)
    if (zustandGroupedIds && Object.keys(zustandGroupedIds).length > 0) {
      return zustandGroupedIds;
    }
    return EMPTY_GROUPED_IDS;
  }, [queryGroupedIds, zustandGroupedIds]);

  // Maintain reference stability
  if (!shallowEqual(cachedResult.current, result)) {
    cachedResult.current = result;
  }

  return cachedResult.current;
}

/**
 * Get project issue filters reactively.
 * Subscribes directly to Zustand store and re-renders when filters change.
 *
 * This replaces the non-reactive `issuesFilter.issueFilters` getter which
 * depends on `rootIssueStore.projectId` being synced from MobX.
 *
 * @returns The computed issue filters for the current project, or undefined if not loaded
 */
export function useProjectIssueFilters(): IIssueFilters | undefined {
  const { projectId } = useParams();
  const projectIdStr = projectId?.toString();

  // Subscribe to Zustand store directly using selector with useShallow
  // useShallow does shallow comparison of the returned object's properties,
  // ensuring re-renders when nested properties like displayFilters change
  const rawFilters = useProjectIssuesFilterStore(
    useShallow((state) => (projectIdStr ? state.filters[projectIdStr] : undefined))
  );

  // Apply computedIssueFilters transform (same logic as IssueFilterHelperStore)
  return useMemo(() => {
    if (!rawFilters || isEmpty(rawFilters)) return undefined;
    return {
      richFilters: isEmpty(rawFilters?.richFilters) ? {} : rawFilters?.richFilters,
      displayFilters: isEmpty(rawFilters?.displayFilters) ? undefined : rawFilters?.displayFilters,
      displayProperties: isEmpty(rawFilters?.displayProperties) ? undefined : rawFilters?.displayProperties,
      kanbanFilters: isEmpty(rawFilters?.kanbanFilters) ? undefined : rawFilters?.kanbanFilters,
    };
  }, [rawFilters]);
}

/**
 * Get sprint issue filters reactively.
 * Subscribes directly to Zustand store and re-renders when filters change.
 *
 * This replaces the non-reactive `issuesFilter.getIssueFilters(sprintId)` call which
 * uses getState() and returns a snapshot that doesn't trigger re-renders.
 *
 * Uses the same pattern as useProjectIssueFilters which works correctly:
 * - useShallow for shallow comparison of the filter object
 * - useMemo to transform to computed filters
 *
 * @returns The computed issue filters for the current sprint, or undefined if not loaded
 */
export function useSprintIssueFilters(): IIssueFilters | undefined {
  const { sprintId } = useParams();
  const sprintIdStr = sprintId?.toString();

  // Subscribe to Zustand store directly using selector with useShallow
  // useShallow does shallow comparison of the returned object's properties,
  // ensuring re-renders when nested properties like displayFilters change
  const rawFilters = useSprintIssuesFilterStore(
    useShallow((state) => (sprintIdStr ? state.filters[sprintIdStr] : undefined))
  );

  // Apply computedIssueFilters transform (same logic as IssueFilterHelperStore)
  return useMemo(() => {
    if (!rawFilters || isEmpty(rawFilters)) return undefined;
    return {
      richFilters: isEmpty(rawFilters?.richFilters) ? {} : rawFilters?.richFilters,
      displayFilters: isEmpty(rawFilters?.displayFilters) ? undefined : rawFilters?.displayFilters,
      displayProperties: isEmpty(rawFilters?.displayProperties) ? undefined : rawFilters?.displayProperties,
      kanbanFilters: isEmpty(rawFilters?.kanbanFilters) ? undefined : rawFilters?.kanbanFilters,
    };
  }, [rawFilters]);
}

/**
 * Get sprint layout reactively.
 * Returns just the layout value as a primitive string for reliable re-renders.
 *
 * This is more reliable than extracting layout from useSprintIssueFilters() because:
 * - Primitive comparison (string) is guaranteed to trigger re-renders on change
 * - No shallow object comparison issues with nested property updates
 *
 * @returns The current layout for the sprint, or undefined if not loaded
 */
export function useSprintLayout(): EIssueLayoutTypes | undefined {
  const { sprintId } = useParams();
  const sprintIdStr = sprintId?.toString();

  // Select just the layout value directly - primitive comparison is reliable
  return useSprintIssuesFilterStore((state) =>
    sprintIdStr ? state.filters[sprintIdStr]?.displayFilters?.layout : undefined
  );
}

/**
 * Get epic issue filters reactively.
 * Subscribes directly to Zustand store and re-renders when filters change.
 *
 * This replaces the non-reactive `issuesFilter.getIssueFilters(epicId)` call which
 * uses getState() and returns a snapshot that doesn't trigger re-renders.
 *
 * @returns The computed issue filters for the current epic, or undefined if not loaded
 */
export function useEpicIssueFilters(): IIssueFilters | undefined {
  const { epicId } = useParams();
  const epicIdStr = epicId?.toString();

  // Subscribe to Zustand store directly using selector with useShallow
  const rawFilters = useEpicIssuesFilterStore(
    useShallow((state) => (epicIdStr ? state.filters[epicIdStr] : undefined))
  );

  // Apply computedIssueFilters transform (same logic as IssueFilterHelperStore)
  return useMemo(() => {
    if (!rawFilters || isEmpty(rawFilters)) return undefined;
    return {
      richFilters: isEmpty(rawFilters?.richFilters) ? {} : rawFilters?.richFilters,
      displayFilters: isEmpty(rawFilters?.displayFilters) ? undefined : rawFilters?.displayFilters,
      displayProperties: isEmpty(rawFilters?.displayProperties) ? undefined : rawFilters?.displayProperties,
      kanbanFilters: isEmpty(rawFilters?.kanbanFilters) ? undefined : rawFilters?.kanbanFilters,
    };
  }, [rawFilters]);
}

/**
 * Get epic layout reactively.
 * Returns just the layout value as a primitive string for reliable re-renders.
 *
 * @returns The current layout for the epic, or undefined if not loaded
 */
export function useEpicLayout(): EIssueLayoutTypes | undefined {
  const { epicId } = useParams();
  const epicIdStr = epicId?.toString();

  // Select just the layout value directly - primitive comparison is reliable
  return useEpicIssuesFilterStore((state) =>
    epicIdStr ? state.filters[epicIdStr]?.displayFilters?.layout : undefined
  );
}

/**
 * Get project layout reactively.
 * Returns just the layout value as a primitive string for reliable re-renders.
 *
 * @returns The current layout for the project, or undefined if not loaded
 */
export function useProjectLayout(): EIssueLayoutTypes | undefined {
  const { projectId } = useParams();
  const projectIdStr = projectId?.toString();

  // Select just the layout value directly - primitive comparison is reliable
  return useProjectIssuesFilterStore((state) =>
    projectIdStr ? state.filters[projectIdStr]?.displayFilters?.layout : undefined
  );
}

/**
 * Get archived issue filters reactively.
 * Subscribes directly to Zustand store and re-renders when filters change.
 *
 * Archived filters use projectId as the key (same as project filters).
 *
 * @returns The computed issue filters for the archived view, or undefined if not loaded
 */
export function useArchivedIssueFilters(): IIssueFilters | undefined {
  const { projectId } = useParams();
  const projectIdStr = projectId?.toString();

  // Subscribe to Zustand store directly using selector with useShallow
  const rawFilters = useArchivedIssuesFilterStore(
    useShallow((state) => (projectIdStr ? state.filters[projectIdStr] : undefined))
  );

  // Apply computedIssueFilters transform (same logic as IssueFilterHelperStore)
  return useMemo(() => {
    if (!rawFilters || isEmpty(rawFilters)) return undefined;
    return {
      richFilters: isEmpty(rawFilters?.richFilters) ? {} : rawFilters?.richFilters,
      displayFilters: isEmpty(rawFilters?.displayFilters) ? undefined : rawFilters?.displayFilters,
      displayProperties: isEmpty(rawFilters?.displayProperties) ? undefined : rawFilters?.displayProperties,
      kanbanFilters: isEmpty(rawFilters?.kanbanFilters) ? undefined : rawFilters?.kanbanFilters,
    };
  }, [rawFilters]);
}

/**
 * Get archived layout reactively.
 * Returns just the layout value as a primitive string for reliable re-renders.
 *
 * @returns The current layout for the archived view, or undefined if not loaded
 */
export function useArchivedLayout(): EIssueLayoutTypes | undefined {
  const { projectId } = useParams();
  const projectIdStr = projectId?.toString();

  // Select just the layout value directly - primitive comparison is reliable
  return useArchivedIssuesFilterStore((state) =>
    projectIdStr ? state.filters[projectIdStr]?.displayFilters?.layout : undefined
  );
}

/**
 * Compute API filter params from display filters and rich filters.
 * This replicates the logic from IssueFilterHelperStore.computedFilteredParams
 * but as a pure function for use in hooks.
 */
function computeFilterParams(
  richFilters: TWorkItemFilterExpression | undefined,
  displayFilters: IIssueDisplayFilterOptions | undefined,
  acceptableParamsByLayout: TIssueParams[]
): Partial<Record<TIssueParams, string | boolean>> {
  const computedDisplayFilters: Partial<Record<TIssueParams, undefined | string[] | boolean | string>> = {
    group_by: displayFilters?.group_by ? EIssueGroupByToServerOptions[displayFilters.group_by] : undefined,
    sub_group_by: displayFilters?.sub_group_by
      ? EIssueGroupByToServerOptions[displayFilters.sub_group_by]
      : undefined,
    order_by: displayFilters?.order_by || undefined,
    sub_issue: displayFilters?.sub_issue ?? true,
  };

  const issueFiltersParams: Partial<Record<TIssueParams, boolean | string>> = {};
  Object.keys(computedDisplayFilters).forEach((key) => {
    const _key = key as TIssueParams;
    const _value: string | boolean | string[] | undefined = computedDisplayFilters[_key];
    const nonEmptyArrayValue = Array.isArray(_value) && _value.length === 0 ? undefined : _value;
    if (nonEmptyArrayValue != undefined && acceptableParamsByLayout.includes(_key))
      issueFiltersParams[_key] = Array.isArray(nonEmptyArrayValue)
        ? nonEmptyArrayValue.join(",")
        : nonEmptyArrayValue;
  });

  // work item filters
  if (richFilters && Object.keys(richFilters).length > 0) {
    issueFiltersParams.filters = JSON.stringify(richFilters);
  }

  if (displayFilters?.layout) issueFiltersParams.layout = displayFilters?.layout;

  if (ENABLE_ISSUE_DEPENDENCIES && displayFilters?.layout === EIssueLayoutTypes.GANTT)
    issueFiltersParams["expand"] = "issue_relation,issue_related";

  return issueFiltersParams;
}

/**
 * Get project applied filters reactively.
 * Computes the API filter params from Zustand store, triggering re-renders when filters change.
 *
 * This replaces the non-reactive `issuesFilter.appliedFilters` getter which
 * depends on `rootIssueStore.projectId` being synced from MobX.
 *
 * @returns The computed API filter params for the current project, or empty object if not loaded
 */
export function useProjectAppliedFilters(): Partial<Record<TIssueParams, string | boolean>> {
  const filters = useProjectIssueFilters();

  return useMemo(() => {
    if (!filters) return {};

    const layout = filters.displayFilters?.layout as EIssueLayoutTypes | undefined;
    const filteredParams = handleIssueQueryParamsByLayout(layout, "issues");
    if (!filteredParams) return {};

    return computeFilterParams(
      filters.richFilters,
      filters.displayFilters,
      filteredParams
    );
  }, [filters]);
}

/**
 * Get sprint applied filters reactively.
 * Computes the API filter params from Zustand store, triggering re-renders when filters change.
 *
 * @returns The computed API filter params for the current sprint, or empty object if not loaded
 */
export function useSprintAppliedFilters(): Partial<Record<TIssueParams, string | boolean>> {
  const filters = useSprintIssueFilters();

  return useMemo(() => {
    if (!filters) return {};

    const layout = filters.displayFilters?.layout as EIssueLayoutTypes | undefined;
    const filteredParams = handleIssueQueryParamsByLayout(layout, "issues");
    if (!filteredParams) return {};

    // Remove sprint from params since it's handled separately
    const paramsWithoutSprint = filteredParams.filter(p => p !== "sprint");

    return computeFilterParams(
      filters.richFilters,
      filters.displayFilters,
      paramsWithoutSprint
    );
  }, [filters]);
}

/**
 * Get workspace view (global view) filters reactively.
 * Reads from the Zustand store to ensure React re-renders when filters change.
 *
 * @param viewId - The workspace view ID (e.g., "all-issues", "assigned", "created", "subscribed")
 * @returns The issue filters for the workspace view, or undefined if not loaded
 */
export function useWorkspaceViewIssueFilters(viewId: string | undefined): IIssueFilters | undefined {
  const filters = useWorkspaceIssuesFilterStore(
    useShallow((state) => (viewId ? state.filters[viewId] : undefined))
  );

  return useMemo(() => {
    if (!filters || isEmpty(filters)) return undefined;

    // Type the displayFilters to avoid unsafe-any warnings
    const displayFilters = filters.displayFilters as IIssueDisplayFilterOptions | undefined;

    // Compute issue filters similar to WorkspaceIssuesFilter.getIssueFilters
    return {
      richFilters: filters.richFilters,
      displayFilters: {
        layout: displayFilters?.layout ?? EIssueLayoutTypes.SPREADSHEET,
        order_by: displayFilters?.order_by ?? "-created_at",
        group_by: displayFilters?.group_by,
        sub_group_by: displayFilters?.sub_group_by,
        sub_issue: displayFilters?.sub_issue ?? true,
        show_empty_groups: displayFilters?.show_empty_groups ?? true,
        calendar: displayFilters?.calendar,
      },
      displayProperties: filters.displayProperties,
      kanbanFilters: filters.kanbanFilters,
    };
  }, [filters]);
}

/**
 * Get workspace view (global view) applied filters reactively.
 * Computes the API filter params from Zustand store, triggering re-renders when filters change.
 *
 * @param viewId - The workspace view ID
 * @returns The computed API filter params for the workspace view, or empty object if not loaded
 */
export function useWorkspaceViewAppliedFilters(viewId: string | undefined): Partial<Record<TIssueParams, string | boolean>> {
  const filters = useWorkspaceViewIssueFilters(viewId);

  return useMemo(() => {
    if (!filters || !viewId) return {};

    // Workspace views use SPREADSHEET layout and "my_issues" type for params
    const filteredParams = handleIssueQueryParamsByLayout(EIssueLayoutTypes.SPREADSHEET, "my_issues");
    if (!filteredParams) return {};

    return computeFilterParams(
      filters.richFilters,
      filters.displayFilters,
      filteredParams
    );
  }, [filters, viewId]);
}
