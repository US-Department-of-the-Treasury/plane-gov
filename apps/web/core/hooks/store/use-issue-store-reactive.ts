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

import { useContext, useMemo, useSyncExternalStore } from "react";
import type { TLoader } from "@plane/types";
import { EIssuesStoreType } from "@plane/types";
import { StoreContext } from "@/lib/store-context";
import type { BaseIssuesZustandStore } from "@/store/issue/helpers/base-issues.store";

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
      if (!groupId) {
        return loaderMap?.[""] ?? ("init-loader" as TLoader);
      }
      if (groupId && !subGroupId) {
        return loaderMap?.[groupId] ?? ("init-loader" as TLoader);
      }
      if (groupId && subGroupId) {
        return loaderMap?.[`${groupId}_${subGroupId}`] ?? ("init-loader" as TLoader);
      }
      return "init-loader" as TLoader;
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
    };
  }, [store, groupId, subGroupId, isSubGroupCumulative]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
