import { useMemo, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
// plane imports
import type {
  TInboxIssue,
  TInboxIssueFilter,
  TInboxIssuePaginationInfo,
  TInboxIssueSorting,
  TInboxIssueCurrentTab,
} from "@plane/types";
import { EInboxIssueCurrentTab, EInboxIssueStatus } from "@plane/types";
// store
import { store } from "@/lib/store-context";
import type { IProjectInboxStore } from "@/plane-web/store/project-inbox.store";
import { useProjectInboxStore } from "@/plane-web/store/client/project-inbox.store";
import { InboxIssueStore } from "@/store/inbox/inbox-issue.store";
import { getRouterWorkspaceSlug } from "@/store/client";
import { useIssueReactionStore, useIssueCommentStore, useIssueAttachmentStore } from "@/plane-web/store/client";
import { useIssueActivityStore } from "@/plane-web/store/issue/issue-details/activity.store";
// services
import { InboxIssueService } from "@/services/inbox/inbox-issue.service";
import { IssueActivityService } from "@/services/issue/issue_activity.service";

// Service instances
const inboxIssueService = new InboxIssueService();
const issueActivityService = new IssueActivityService();

// Constants
const PER_PAGE_COUNT = 10;

// Local loader type matching the store's TLoader
type TInboxLoader =
  | "init-loading"
  | "mutation-loading"
  | "filter-loading"
  | "pagination-loading"
  | "issue-loading"
  | undefined;

/**
 * Hook for accessing inbox functionality with reactive state.
 * Combines Zustand store state with helper methods that use the rootStore.
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

  // Helper method to create or update inbox issues using rootStore
  const createOrUpdateInboxIssue = useCallback(
    (inboxIssuesData: TInboxIssue[], workspaceSlug: string, projectId: string) => {
      useProjectInboxStore.getState().createOrUpdateInboxIssue(inboxIssuesData, workspaceSlug, projectId, store);
    },
    []
  );

  // Helper to get query params
  const inboxIssueQueryParams = useCallback(
    (
      inboxFilters: Partial<TInboxIssueFilter>,
      inboxSorting: Partial<TInboxIssueSorting>,
      pagePerCount: number,
      paginationCursor: string
    ) => {
      return useProjectInboxStore
        .getState()
        .inboxIssueQueryParams(inboxFilters, inboxSorting, pagePerCount, paginationCursor);
    },
    []
  );

  // Initialize default filters
  const initializeDefaultFilters = useCallback((projectId: string, tab: TInboxIssueCurrentTab) => {
    useProjectInboxStore.getState().initializeDefaultFilters(projectId, tab);
  }, []);

  // Handle tab change
  const handleCurrentTab = useCallback(
    (workspaceSlug: string, projectId: string, tab: TInboxIssueCurrentTab) => {
      if (workspaceSlug && projectId) {
        const state = useProjectInboxStore.getState();
        state.setCurrentTab(tab);
        state.setInboxIssueIds([]);
        state.setInboxIssuePaginationInfo(undefined);
        state.setSorting(projectId, { order_by: "issue__created_at", sort_by: "desc" });
        state.setFilters(projectId, {
          status:
            tab === EInboxIssueCurrentTab.OPEN
              ? [EInboxIssueStatus.PENDING]
              : [EInboxIssueStatus.ACCEPTED, EInboxIssueStatus.DECLINED, EInboxIssueStatus.DUPLICATE],
        });
        // Use fetchInboxIssues after tab change
        void fetchInboxIssuesInternal(
          workspaceSlug,
          projectId,
          "filter-loading",
          undefined,
          createOrUpdateInboxIssue,
          inboxIssueQueryParams
        );
      }
    },
    [createOrUpdateInboxIssue, inboxIssueQueryParams]
  );

  // Handle filter changes
  const handleInboxIssueFilters = useCallback(
    <T extends keyof TInboxIssueFilter>(key: T, value: TInboxIssueFilter[T]) => {
      const workspaceSlug = getRouterWorkspaceSlug();
      const projectId = useProjectInboxStore.getState().currentInboxProjectId;
      if (workspaceSlug && projectId) {
        const state = useProjectInboxStore.getState();
        const currentFilters = state.getInboxFilters(projectId);
        state.setFilters(projectId, { ...currentFilters, [key]: value });
        state.setInboxIssuePaginationInfo(undefined);
        void fetchInboxIssuesInternal(
          workspaceSlug,
          projectId,
          "filter-loading",
          undefined,
          createOrUpdateInboxIssue,
          inboxIssueQueryParams
        );
      }
    },
    [createOrUpdateInboxIssue, inboxIssueQueryParams]
  );

  // Handle sorting changes
  const handleInboxIssueSorting = useCallback(
    <T extends keyof TInboxIssueSorting>(key: T, value: TInboxIssueSorting[T]) => {
      const workspaceSlug = getRouterWorkspaceSlug();
      const projectId = useProjectInboxStore.getState().currentInboxProjectId;
      if (workspaceSlug && projectId) {
        const state = useProjectInboxStore.getState();
        const currentSorting = state.getInboxSorting(projectId);
        state.setSorting(projectId, { ...currentSorting, [key]: value });
        state.setInboxIssuePaginationInfo(undefined);
        void fetchInboxIssuesInternal(
          workspaceSlug,
          projectId,
          "filter-loading",
          undefined,
          createOrUpdateInboxIssue,
          inboxIssueQueryParams
        );
      }
    },
    [createOrUpdateInboxIssue, inboxIssueQueryParams]
  );

  // Fetch inbox issues
  const fetchInboxIssues = useCallback(
    async (
      workspaceSlug: string,
      projectId: string,
      loadingType: TInboxLoader = undefined,
      tab: TInboxIssueCurrentTab | undefined = undefined
    ) => {
      return fetchInboxIssuesInternal(
        workspaceSlug,
        projectId,
        loadingType,
        tab,
        createOrUpdateInboxIssue,
        inboxIssueQueryParams
      );
    },
    [createOrUpdateInboxIssue, inboxIssueQueryParams]
  );

  // Fetch paginated inbox issues
  const fetchInboxPaginationIssues = useCallback(
    async (workspaceSlug: string, projectId: string) => {
      try {
        const state = useProjectInboxStore.getState();
        const paginationInfo = state.inboxIssuePaginationInfo;

        if (
          paginationInfo &&
          (!paginationInfo?.total_results ||
            (paginationInfo?.total_results && state.inboxIssueIds.length < paginationInfo?.total_results))
        ) {
          const filters = state.getInboxFilters(projectId);
          const sorting = state.getInboxSorting(projectId);
          const queryParams = inboxIssueQueryParams(
            filters,
            sorting,
            PER_PAGE_COUNT,
            paginationInfo?.next_cursor || `${PER_PAGE_COUNT}:0:0`
          );
          const { results, ...newPaginationInfo } = await inboxIssueService.list(workspaceSlug, projectId, queryParams);

          state.setInboxIssuePaginationInfo(newPaginationInfo);
          if (results && results.length > 0) {
            const issueIds = results.map((value) => value?.issue?.id);
            state.appendInboxIssueIds(issueIds);
            createOrUpdateInboxIssue(results, workspaceSlug, projectId);
          }
        } else {
          state.setInboxIssuePaginationInfo({
            ...paginationInfo,
            next_page_results: false,
          } as TInboxIssuePaginationInfo);
        }
      } catch (error) {
        console.error("Error fetching the intake issues", error);
        useProjectInboxStore.getState().setError({
          message: "Error fetching the paginated intake work items please try again later.",
          status: "pagination-error",
        });
        throw error;
      }
    },
    [createOrUpdateInboxIssue, inboxIssueQueryParams]
  );

  // Fetch inbox issue by ID
  const fetchInboxIssueById = useCallback(
    async (workspaceSlug: string, projectId: string, inboxIssueId: string): Promise<TInboxIssue> => {
      try {
        const state = useProjectInboxStore.getState();
        state.setLoader("issue-loading");
        const inboxIssue = await inboxIssueService.retrieve(workspaceSlug, projectId, inboxIssueId);
        const issueId = inboxIssue?.issue?.id || undefined;

        if (inboxIssue && issueId) {
          createOrUpdateInboxIssue([inboxIssue], workspaceSlug, projectId);
          state.setLoader(undefined);
          await Promise.all([
            // fetching reactions - use Zustand store directly
            useIssueReactionStore.getState().fetchReactions(workspaceSlug, projectId, issueId),
            // fetching activity - call service and update Zustand store
            (async () => {
              const activities = await issueActivityService.getIssueActivities(workspaceSlug, projectId, issueId, {});
              const activityIds = activities.map((a) => a.id);
              useIssueActivityStore.getState().updateActivities(issueId, activityIds);
              useIssueActivityStore.getState().updateActivityMap(activities);
            })(),
            // fetching comments - use Zustand store directly
            useIssueCommentStore.getState().fetchComments(workspaceSlug, projectId, issueId),
            // fetching attachments - use Zustand store directly
            useIssueAttachmentStore.getState().fetchAttachments(workspaceSlug, projectId, issueId),
          ]);
        }
        return inboxIssue;
      } catch (error) {
        console.error("Error fetching the intake issue with intake issue id");
        useProjectInboxStore.getState().setLoader(undefined);
        throw error;
      }
    },
    [createOrUpdateInboxIssue]
  );

  // Create inbox issue
  const createInboxIssue = useCallback(async (workspaceSlug: string, projectId: string, data: Partial<TInboxIssue>) => {
    try {
      const inboxIssueResponse = await inboxIssueService.create(workspaceSlug, projectId, data);
      if (inboxIssueResponse) {
        const state = useProjectInboxStore.getState();
        const newIssueId = inboxIssueResponse?.issue?.id;
        state.appendInboxIssueIds([newIssueId]);
        state.updateInboxIssue(newIssueId, new InboxIssueStore(workspaceSlug, projectId, inboxIssueResponse, store));
        const currentTotal = state.inboxIssuePaginationInfo?.total_results || 0;
        state.setInboxIssuePaginationInfo({
          ...state.inboxIssuePaginationInfo,
          total_results: currentTotal + 1,
        } as TInboxIssuePaginationInfo);
      }
      return inboxIssueResponse;
    } catch (error) {
      console.error("Error creating the intake issue");
      throw error;
    }
  }, []);

  // Delete inbox issue
  const deleteInboxIssue = useCallback(async (workspaceSlug: string, projectId: string, inboxIssueId: string) => {
    try {
      const state = useProjectInboxStore.getState();
      const issueIdToDelete = state.getIssueInboxByIssueId(inboxIssueId)?.issue?.id;

      await inboxIssueService.destroy(workspaceSlug, projectId, inboxIssueId);

      if (issueIdToDelete) {
        // removeInboxIssue handles both removing from inboxIssues and inboxIssueIds
        state.removeInboxIssue(issueIdToDelete);
        const currentTotal = state.inboxIssuePaginationInfo?.total_results || 0;
        if (currentTotal > 0) {
          state.setInboxIssuePaginationInfo({
            ...state.inboxIssuePaginationInfo,
            total_results: currentTotal - 1,
          } as TInboxIssuePaginationInfo);
        }
      }
    } catch (error) {
      console.error("Error deleting the intake issue");
      throw error;
    }
  }, []);

  // Return a combined interface that uses reactive state for properties
  // and helper methods that use rootStore
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

      // Computed properties - read from current state
      get inboxFilters() {
        const projectId = useProjectInboxStore.getState().currentInboxProjectId;
        return useProjectInboxStore.getState().getInboxFilters(projectId);
      },
      get inboxSorting() {
        const projectId = useProjectInboxStore.getState().currentInboxProjectId;
        return useProjectInboxStore.getState().getInboxSorting(projectId);
      },
      get getAppliedFiltersCount() {
        const projectId = useProjectInboxStore.getState().currentInboxProjectId;
        return useProjectInboxStore.getState().getAppliedFiltersCount(projectId);
      },
      get filteredInboxIssueIds() {
        const state = useProjectInboxStore.getState();
        const projectId = state.currentInboxProjectId;
        const filters = state.getInboxFilters(projectId);
        return state.getFilteredInboxIssueIds(state.currentTab, filters, state.inboxIssueIds, state.inboxIssues);
      },

      // Helper methods from Zustand store
      getIssueInboxByIssueId: (issueId: string) => useProjectInboxStore.getState().getIssueInboxByIssueId(issueId),
      getIsIssueAvailable: (inboxIssueId: string) => useProjectInboxStore.getState().getIsIssueAvailable(inboxIssueId),
      inboxIssueQueryParams,

      // Methods that use rootStore
      createOrUpdateInboxIssue,
      initializeDefaultFilters,
      handleCurrentTab,
      handleInboxIssueFilters,
      handleInboxIssueSorting,
      fetchInboxIssues,
      fetchInboxPaginationIssues,
      fetchInboxIssueById,
      createInboxIssue,
      deleteInboxIssue,
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
      inboxIssueQueryParams,
      createOrUpdateInboxIssue,
      initializeDefaultFilters,
      handleCurrentTab,
      handleInboxIssueFilters,
      handleInboxIssueSorting,
      fetchInboxIssues,
      fetchInboxPaginationIssues,
      fetchInboxIssueById,
      createInboxIssue,
      deleteInboxIssue,
    ]
  );
};

/**
 * Internal helper to fetch inbox issues.
 * Extracted to avoid circular dependency in callbacks.
 */
async function fetchInboxIssuesInternal(
  workspaceSlug: string,
  projectId: string,
  loadingType: TInboxLoader = undefined,
  tab: TInboxIssueCurrentTab | undefined = undefined,
  createOrUpdateInboxIssue: (issues: TInboxIssue[], workspaceSlug: string, projectId: string) => void,
  inboxIssueQueryParams: (
    inboxFilters: Partial<TInboxIssueFilter>,
    inboxSorting: Partial<TInboxIssueSorting>,
    pagePerCount: number,
    paginationCursor: string
  ) => Record<string, unknown>
) {
  try {
    if (loadingType === undefined && tab) {
      useProjectInboxStore.getState().initializeDefaultFilters(projectId, tab);
    }

    const state = useProjectInboxStore.getState();

    if (state.currentInboxProjectId != projectId) {
      state.setCurrentInboxProjectId(projectId);
      state.setInboxIssues({});
      state.setInboxIssueIds([]);
      state.setInboxIssuePaginationInfo(undefined);
    }

    if (Object.keys(state.inboxIssueIds).length === 0) state.setLoader("init-loading");
    else state.setLoader("mutation-loading");
    if (loadingType) state.setLoader(loadingType);

    const filters = state.getInboxFilters(projectId);
    const sorting = state.getInboxSorting(projectId);
    const status = filters?.status;
    const queryParams = inboxIssueQueryParams({ ...filters, status }, sorting, PER_PAGE_COUNT, `${PER_PAGE_COUNT}:0:0`);

    const { results, ...paginationInfo } = await inboxIssueService.list(workspaceSlug, projectId, queryParams);

    state.setLoader(undefined);
    state.setInboxIssuePaginationInfo(paginationInfo);
    if (results) {
      const issueIds = results.map((value) => value?.issue?.id);
      state.setInboxIssueIds(issueIds);
      createOrUpdateInboxIssue(results, workspaceSlug, projectId);
    }
  } catch (error) {
    console.error("Error fetching the intake issues", error);
    useProjectInboxStore.getState().setLoader(undefined);
    useProjectInboxStore.getState().setError({
      message: "Error fetching the intake work items please try again later.",
      status: "init-error",
    });
    throw error;
  }
}

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
