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
 */

import { useCallback, useSyncExternalStore } from "react";
import type { TLoader } from "@plane/types";
import { EIssuesStoreType } from "@plane/types";
import { useIssues } from "./use-issues";

/**
 * Get the issue loader state reactively.
 * Re-renders the component when loader state changes.
 */
export function useIssueLoader(
  storeType: EIssuesStoreType,
  groupId?: string,
  subGroupId?: string
): TLoader {
  const { issues } = useIssues(storeType);
  // Some store types (e.g., workspace drafts) don't extend IBaseIssuesStore
  const store = "getBaseStore" in issues ? issues.getBaseStore() : null;

  const subscribe = useCallback(
    (callback: () => void) => {
      if (!store) return () => {};
      return store.subscribe(callback);
    },
    [store]
  );

  const getSnapshot = useCallback(() => {
    if (!store) return "init-loader";
    const loaderMap = store.getState().loader;

    // Derive the specific loader value using the same logic as getIssueLoader()
    if (!groupId) {
      return loaderMap?.[""] ?? "init-loader";
    }
    if (groupId && !subGroupId) {
      return loaderMap?.[groupId] ?? "init-loader";
    }
    if (groupId && subGroupId) {
      return loaderMap?.[`${groupId}_${subGroupId}`] ?? "init-loader";
    }
    return "init-loader";
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
  const { issues } = useIssues(storeType);
  // Some store types (e.g., workspace drafts) don't extend IBaseIssuesStore
  const store = "getBaseStore" in issues ? issues.getBaseStore() : null;

  const subscribe = useCallback(
    (callback: () => void) => {
      if (!store) return () => {};
      return store.subscribe(callback);
    },
    [store]
  );

  const getSnapshot = useCallback(() => {
    if (!store) return undefined;
    const groupedIssueCount = store.getState().groupedIssueCount;

    // Derive the count using the same logic as getGroupIssueCount()
    if (!groupId && !subGroupId) {
      return groupedIssueCount?.[""];
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
  }, [store, groupId, subGroupId, isSubGroupCumulative]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
