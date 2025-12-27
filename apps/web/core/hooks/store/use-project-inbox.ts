import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
// store
import { store } from "@/lib/store-context";
import type { IProjectInboxStore } from "@/plane-web/store/project-inbox.store";
import { useProjectInboxStore, ProjectInboxStoreLegacy } from "@/plane-web/store/project-inbox.store";

// Singleton instance for the legacy wrapper
let projectInboxInstance: ProjectInboxStoreLegacy | null = null;

const getProjectInboxInstance = (): ProjectInboxStoreLegacy => {
  if (!projectInboxInstance) {
    projectInboxInstance = new ProjectInboxStoreLegacy(store);
  }
  return projectInboxInstance;
};

/**
 * Hook for accessing inbox functionality with reactive state.
 * Combines Zustand store state with legacy facade for backward compatibility.
 *
 * For new code, prefer using the individual TanStack Query hooks directly:
 * - useInboxIssues, useInfiniteInboxIssues, useInboxIssue
 * - useCreateInboxIssue, useUpdateInboxIssueStatus, useDeleteInboxIssue
 * - etc.
 *
 * @deprecated Use individual TanStack Query hooks from @/store/queries instead
 */
export const useProjectInbox = (): IProjectInboxStore => {
  // Subscribe to Zustand store for reactivity
  const {
    currentTab,
    loader,
    error,
    currentInboxProjectId,
    filtersMap,
    sortingMap,
    inboxIssuePaginationInfo,
    inboxIssues,
    inboxIssueIds,
  } = useProjectInboxStore(
    useShallow((state) => ({
      currentTab: state.currentTab,
      loader: state.loader,
      error: state.error,
      currentInboxProjectId: state.currentInboxProjectId,
      filtersMap: state.filtersMap,
      sortingMap: state.sortingMap,
      inboxIssuePaginationInfo: state.inboxIssuePaginationInfo,
      inboxIssues: state.inboxIssues,
      inboxIssueIds: state.inboxIssueIds,
    }))
  );

  // Get the legacy facade for methods that need CoreRootStore
  const facade = getProjectInboxInstance();

  // Return a combined interface that uses reactive state for properties
  // and the facade for methods
  return useMemo<IProjectInboxStore>(
    () => ({
      // Reactive state from Zustand
      currentTab,
      loader,
      error,
      currentInboxProjectId,
      filtersMap,
      sortingMap,
      inboxIssuePaginationInfo,
      inboxIssues,
      inboxIssueIds,

      // Computed properties from facade (use current state)
      get inboxFilters() {
        return facade.inboxFilters;
      },
      get inboxSorting() {
        return facade.inboxSorting;
      },
      get getAppliedFiltersCount() {
        return facade.getAppliedFiltersCount;
      },
      get filteredInboxIssueIds() {
        return facade.filteredInboxIssueIds;
      },

      // Methods from facade (need CoreRootStore)
      getIssueInboxByIssueId: facade.getIssueInboxByIssueId,
      getIsIssueAvailable: facade.getIsIssueAvailable,
      inboxIssueQueryParams: facade.inboxIssueQueryParams,
      createOrUpdateInboxIssue: facade.createOrUpdateInboxIssue,
      initializeDefaultFilters: facade.initializeDefaultFilters,
      handleCurrentTab: facade.handleCurrentTab,
      handleInboxIssueFilters: facade.handleInboxIssueFilters,
      handleInboxIssueSorting: facade.handleInboxIssueSorting,
      fetchInboxIssues: facade.fetchInboxIssues,
      fetchInboxPaginationIssues: facade.fetchInboxPaginationIssues,
      fetchInboxIssueById: facade.fetchInboxIssueById,
      createInboxIssue: facade.createInboxIssue,
      deleteInboxIssue: facade.deleteInboxIssue,
    }),
    [
      currentTab,
      loader,
      error,
      currentInboxProjectId,
      filtersMap,
      sortingMap,
      inboxIssuePaginationInfo,
      inboxIssues,
      inboxIssueIds,
      facade,
    ]
  );
};

// Re-export all inbox hooks from queries for direct access
export {
  useInboxIssues,
  useInfiniteInboxIssues,
  useInboxIssue,
  useCreateInboxIssue,
  useUpdateInboxIssueStatus,
  useUpdateInboxIssueDuplicate,
  useUpdateInboxIssueSnooze,
  useUpdateInboxIssue,
  useUpdateProjectIssueFromInbox,
  useDeleteInboxIssue,
  getInboxIssueById,
  getInboxIssueIds,
} from "@/store/queries";
