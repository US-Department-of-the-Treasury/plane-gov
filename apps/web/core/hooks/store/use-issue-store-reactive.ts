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
import { ALL_ISSUES } from "@plane/constants";
import type { IIssueFilters, TGroupedIssues, TLoader, TSubGroupedIssues, TUnGroupedIssues } from "@plane/types";
import { EIssuesStoreType } from "@plane/types";
import { StoreContext } from "@/lib/store-context";
import type { BaseIssuesZustandStore } from "@/store/issue/helpers/base-issues.store";
import { useProjectIssuesFilterStore } from "@/store/issue/project/filter.store";

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
 */
export function useGroupedIssueCount(
  storeType: EIssuesStoreType,
  groupId?: string,
  subGroupId?: string,
  isSubGroupCumulative?: boolean
): number | undefined {
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
      if (!store) return undefined;
      const groupedIssueCount = store.getState().groupedIssueCount;

      // Derive the count using the same logic as getGroupIssueCount()
      // Uses getGroupKey() pattern: no args = ALL_ISSUES
      if (!groupId && !subGroupId) {
        return groupedIssueCount?.[ALL_ISSUES];
      }

      if (isSubGroupCumulative && groupId && subGroupId) {
        const subGroupCounts = groupedIssueCount?.[groupId];
        if (typeof subGroupCounts === "object" && subGroupCounts !== null) {
          return Object.values(subGroupCounts).reduce((acc: number, val) => {
            if (typeof val === "number") return acc + val;
            return acc;
          }, 0);
        }
        return undefined;
      }

      if (groupId && !subGroupId) {
        const count = groupedIssueCount?.[groupId];
        if (typeof count === "number") return count;
        // If it's an object (subgroup counts), sum all values
        if (typeof count === "object" && count !== null) {
          return Object.values(count).reduce((acc: number, val) => {
            if (typeof val === "number") return acc + val;
            return acc;
          }, 0);
        }
        return undefined;
      }

      if (groupId && subGroupId) {
        const groupCounts = groupedIssueCount?.[groupId];
        if (typeof groupCounts === "object" && groupCounts !== null) {
          const subCount = (groupCounts as Record<string, number>)[subGroupId];
          return typeof subCount === "number" ? subCount : undefined;
        }
        return undefined;
      }

      return undefined;
    };
  }, [store, groupId, subGroupId, isSubGroupCumulative]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
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
    if (a[key] !== b[key]) return false;
  }
  return true;
}

/**
 * Get grouped issue IDs reactively.
 * Re-renders the component when grouped issue IDs change.
 *
 * This replaces the non-reactive `issues.groupedIssueIds` getter which
 * uses getState() and returns a snapshot that doesn't trigger re-renders.
 *
 * Uses useSyncExternalStore with a cached snapshot to maintain reference
 * stability and prevent infinite loops.
 *
 * @returns The grouped issue IDs from the store
 */
export function useGroupedIssueIds(
  storeType: EIssuesStoreType
): TGroupedIssues | TSubGroupedIssues | TUnGroupedIssues {
  const store = useIssueZustandStore(storeType);

  // Cache the last snapshot to maintain reference stability
  const snapshotCache = useRef<TGroupedIssues | TSubGroupedIssues | TUnGroupedIssues>(EMPTY_GROUPED_IDS);

  // Create stable subscribe function
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!store) return () => {};
      return store.subscribe(onStoreChange);
    },
    [store]
  );

  // Create stable getSnapshot with reference caching
  const getSnapshot = useCallback(() => {
    if (!store) return EMPTY_GROUPED_IDS;
    const current = store.getState().groupedIssueIds ?? EMPTY_GROUPED_IDS;
    // Only update cache if values actually changed (shallow comparison)
    if (!shallowEqual(snapshotCache.current, current)) {
      snapshotCache.current = current;
    }
    return snapshotCache.current;
  }, [store]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
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

  // Subscribe to Zustand store directly using selector
  // This is reactive and will trigger re-renders when filters change
  const rawFilters = useProjectIssuesFilterStore((state) =>
    projectIdStr ? state.filters[projectIdStr] : undefined
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
