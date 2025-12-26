"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";
import type { TIssuesResponse, TProfileViews, TLoader } from "@plane/types";
import { EIssuesStoreType } from "@plane/types";
// TanStack Query hooks
import {
  useProjectIssuesPaginated,
  useSprintIssuesPaginated,
  useEpicIssuesPaginated,
  useArchivedIssuesPaginated,
  useProfileIssuesPaginated,
  useProjectViewIssuesPaginated,
  useWorkspaceViewIssuesPaginated,
} from "@/store/queries";
// Store hooks for filters
import { useIssues } from "./store/use-issues";
// Reactive filter hooks that read from Zustand (not MobX)
import { useProjectAppliedFilters, useSprintAppliedFilters, useWorkspaceViewAppliedFilters } from "./store/use-issue-store-reactive";

/**
 * Interface for TanStack Query-based issue fetching actions.
 * Provides loading states and pagination controls.
 */
export interface IssueQueryActions {
  /** True only on initial load (no cached data) */
  isLoading: boolean;
  /** True whenever a fetch is in progress (including background refetch) */
  isFetching: boolean;
  /** True when fetching the next page */
  isFetchingNextPage: boolean;
  /** True when fetching the previous page */
  isFetchingPreviousPage: boolean;
  /** True if there are more pages available */
  hasNextPage: boolean;
  /** True if there are previous pages available */
  hasPreviousPage: boolean;
  /** Fetch the next page of results */
  fetchNextPage: () => Promise<unknown>;
  /** Fetch the previous page of results */
  fetchPreviousPage: () => Promise<unknown>;
  /** The paginated data (pages array) */
  data: { pages: TIssuesResponse[] } | undefined;
  /** Error if the query failed */
  error: Error | null;
  /** Refetch the data */
  refetch: () => Promise<unknown>;
}

/**
 * Hook for fetching project issues using TanStack Query.
 * Reads filters from Zustand store and syncs fetched issues back to Zustand.
 *
 * @example
 * const { isLoading, hasNextPage, fetchNextPage, data } = useProjectIssuesQuery();
 */
export function useProjectIssuesQuery(): IssueQueryActions {
  const { workspaceSlug: routerWorkspaceSlug, projectId: routerProjectId } = useParams();
  const workspaceSlug = routerWorkspaceSlug?.toString() ?? "";
  const projectId = routerProjectId?.toString() ?? "";

  // Get filters reactively from Zustand store (not MobX)
  // This ensures the query key changes when layout/filters change (e.g., List -> Kanban)
  const filterParams = useProjectAppliedFilters();

  // TanStack Query hook - issues are synced to Zustand inside the hook
  const query = useProjectIssuesPaginated({
    workspaceSlug,
    projectId,
    filterParams,
    enabled: !!workspaceSlug && !!projectId,
  });

  return useMemo(
    () => ({
      isLoading: query.isLoading,
      isFetching: query.isFetching,
      isFetchingNextPage: query.isFetchingNextPage,
      isFetchingPreviousPage: query.isFetchingPreviousPage,
      hasNextPage: query.hasNextPage ?? false,
      hasPreviousPage: query.hasPreviousPage ?? false,
      fetchNextPage: query.fetchNextPage,
      fetchPreviousPage: query.fetchPreviousPage,
      data: query.data,
      error: query.error,
      refetch: query.refetch,
    }),
    [query]
  );
}

/**
 * Hook for fetching sprint issues using TanStack Query.
 */
export function useSprintIssuesQuery(): IssueQueryActions {
  const { workspaceSlug: routerWorkspaceSlug, projectId: routerProjectId, sprintId: routerSprintId } = useParams();
  const workspaceSlug = routerWorkspaceSlug?.toString() ?? "";
  const projectId = routerProjectId?.toString() ?? "";
  const sprintId = routerSprintId?.toString() ?? "";

  // Get filters reactively from Zustand store (not MobX)
  // This ensures the query key changes when layout/filters change
  const filterParams = useSprintAppliedFilters();

  const query = useSprintIssuesPaginated({
    workspaceSlug,
    projectId,
    sprintId,
    filterParams,
    enabled: !!workspaceSlug && !!projectId && !!sprintId,
  });

  return useMemo(
    () => ({
      isLoading: query.isLoading,
      isFetching: query.isFetching,
      isFetchingNextPage: query.isFetchingNextPage,
      isFetchingPreviousPage: query.isFetchingPreviousPage,
      hasNextPage: query.hasNextPage ?? false,
      hasPreviousPage: query.hasPreviousPage ?? false,
      fetchNextPage: query.fetchNextPage,
      fetchPreviousPage: query.fetchPreviousPage,
      data: query.data,
      error: query.error,
      refetch: query.refetch,
    }),
    [query]
  );
}

/**
 * Hook for fetching epic issues using TanStack Query.
 */
export function useEpicIssuesQuery(): IssueQueryActions {
  const { workspaceSlug: routerWorkspaceSlug, projectId: routerProjectId, epicId: routerEpicId } = useParams();
  const workspaceSlug = routerWorkspaceSlug?.toString() ?? "";
  const projectId = routerProjectId?.toString() ?? "";
  const epicId = routerEpicId?.toString() ?? "";

  // Get filters from existing Zustand store
  const { issuesFilter } = useIssues(EIssuesStoreType.EPIC);
  const filterParams = issuesFilter.appliedFilters ?? {};

  const query = useEpicIssuesPaginated({
    workspaceSlug,
    projectId,
    epicId,
    filterParams,
    enabled: !!workspaceSlug && !!projectId && !!epicId,
  });

  return useMemo(
    () => ({
      isLoading: query.isLoading,
      isFetching: query.isFetching,
      isFetchingNextPage: query.isFetchingNextPage,
      isFetchingPreviousPage: query.isFetchingPreviousPage,
      hasNextPage: query.hasNextPage ?? false,
      hasPreviousPage: query.hasPreviousPage ?? false,
      fetchNextPage: query.fetchNextPage,
      fetchPreviousPage: query.fetchPreviousPage,
      data: query.data,
      error: query.error,
      refetch: query.refetch,
    }),
    [query]
  );
}

/**
 * Hook for fetching archived issues using TanStack Query.
 */
export function useArchivedIssuesQuery(): IssueQueryActions {
  const { workspaceSlug: routerWorkspaceSlug, projectId: routerProjectId } = useParams();
  const workspaceSlug = routerWorkspaceSlug?.toString() ?? "";
  const projectId = routerProjectId?.toString() ?? "";

  // Get filters from existing Zustand store
  const { issuesFilter } = useIssues(EIssuesStoreType.ARCHIVED);
  const filterParams = issuesFilter.appliedFilters ?? {};

  const query = useArchivedIssuesPaginated({
    workspaceSlug,
    projectId,
    filterParams,
    enabled: !!workspaceSlug && !!projectId,
  });

  return useMemo(
    () => ({
      isLoading: query.isLoading,
      isFetching: query.isFetching,
      isFetchingNextPage: query.isFetchingNextPage,
      isFetchingPreviousPage: query.isFetchingPreviousPage,
      hasNextPage: query.hasNextPage ?? false,
      hasPreviousPage: query.hasPreviousPage ?? false,
      fetchNextPage: query.fetchNextPage,
      fetchPreviousPage: query.fetchPreviousPage,
      data: query.data,
      error: query.error,
      refetch: query.refetch,
    }),
    [query]
  );
}

/**
 * Hook for fetching profile issues using TanStack Query.
 * @param view - The profile view type (assigned, created, subscribed)
 */
export function useProfileIssuesQuery(view: TProfileViews): IssueQueryActions {
  const { workspaceSlug: routerWorkspaceSlug, userId: routerUserId } = useParams();
  const workspaceSlug = routerWorkspaceSlug?.toString() ?? "";
  const userId = routerUserId?.toString() ?? "";

  // Get filters from existing Zustand store
  const { issuesFilter } = useIssues(EIssuesStoreType.PROFILE);
  const filterParams = issuesFilter.appliedFilters ?? {};

  const query = useProfileIssuesPaginated({
    workspaceSlug,
    userId,
    view,
    filterParams,
    enabled: !!workspaceSlug && !!userId && !!view,
  });

  return useMemo(
    () => ({
      isLoading: query.isLoading,
      isFetching: query.isFetching,
      isFetchingNextPage: query.isFetchingNextPage,
      isFetchingPreviousPage: query.isFetchingPreviousPage,
      hasNextPage: query.hasNextPage ?? false,
      hasPreviousPage: query.hasPreviousPage ?? false,
      fetchNextPage: query.fetchNextPage,
      fetchPreviousPage: query.fetchPreviousPage,
      data: query.data,
      error: query.error,
      refetch: query.refetch,
    }),
    [query]
  );
}

/**
 * Hook for fetching project view issues using TanStack Query.
 */
export function useProjectViewIssuesQuery(): IssueQueryActions {
  const { workspaceSlug: routerWorkspaceSlug, projectId: routerProjectId, viewId: routerViewId } = useParams();
  const workspaceSlug = routerWorkspaceSlug?.toString() ?? "";
  const projectId = routerProjectId?.toString() ?? "";
  const viewId = routerViewId?.toString() ?? "";

  // Get filters from existing Zustand store
  const { issuesFilter } = useIssues(EIssuesStoreType.PROJECT_VIEW);
  const filterParams = issuesFilter.appliedFilters ?? {};

  const query = useProjectViewIssuesPaginated({
    workspaceSlug,
    projectId,
    viewId,
    filterParams,
    enabled: !!workspaceSlug && !!projectId && !!viewId,
  });

  return useMemo(
    () => ({
      isLoading: query.isLoading,
      isFetching: query.isFetching,
      isFetchingNextPage: query.isFetchingNextPage,
      isFetchingPreviousPage: query.isFetchingPreviousPage,
      hasNextPage: query.hasNextPage ?? false,
      hasPreviousPage: query.hasPreviousPage ?? false,
      fetchNextPage: query.fetchNextPage,
      fetchPreviousPage: query.fetchPreviousPage,
      data: query.data,
      error: query.error,
      refetch: query.refetch,
    }),
    [query]
  );
}

/**
 * Hook for fetching workspace view (global view) issues using TanStack Query.
 */
export function useWorkspaceViewIssuesQuery(): IssueQueryActions {
  const { workspaceSlug: routerWorkspaceSlug, globalViewId: routerGlobalViewId } = useParams();
  const workspaceSlug = routerWorkspaceSlug?.toString() ?? "";
  const viewId = routerGlobalViewId?.toString() ?? "";

  // Get filters reactively from Zustand store (not MobX)
  // This ensures the query key changes when filters change
  const filterParams = useWorkspaceViewAppliedFilters(viewId);

  const query = useWorkspaceViewIssuesPaginated({
    workspaceSlug,
    viewId,
    filterParams,
    enabled: !!workspaceSlug && !!viewId,
  });

  return useMemo(
    () => ({
      isLoading: query.isLoading,
      isFetching: query.isFetching,
      isFetchingNextPage: query.isFetchingNextPage,
      isFetchingPreviousPage: query.isFetchingPreviousPage,
      hasNextPage: query.hasNextPage ?? false,
      hasPreviousPage: query.hasPreviousPage ?? false,
      fetchNextPage: query.fetchNextPage,
      fetchPreviousPage: query.fetchPreviousPage,
      data: query.data,
      error: query.error,
      refetch: query.refetch,
    }),
    [query]
  );
}

/**
 * Factory hook that returns the appropriate issues query hook based on store type.
 * This provides a similar interface to `useIssuesActions` but for TanStack Query.
 *
 * @example
 * const { isLoading, fetchNextPage, hasNextPage } = useIssuesQuery(EIssuesStoreType.PROJECT);
 */
export function useIssuesQuery(storeType: EIssuesStoreType): IssueQueryActions {
  // We need to call all hooks unconditionally due to React's rules of hooks
  // The individual hooks handle their own enablement based on route params
  const projectQuery = useProjectIssuesQuery();
  const sprintQuery = useSprintIssuesQuery();
  const epicQuery = useEpicIssuesQuery();
  const archivedQuery = useArchivedIssuesQuery();
  const projectViewQuery = useProjectViewIssuesQuery();
  const workspaceViewQuery = useWorkspaceViewIssuesQuery();
  // Profile query needs a view param, so we'll default to 'assigned'
  const profileQuery = useProfileIssuesQuery("assigned");

  switch (storeType) {
    case EIssuesStoreType.PROJECT:
      return projectQuery;
    case EIssuesStoreType.SPRINT:
      return sprintQuery;
    case EIssuesStoreType.EPIC:
      return epicQuery;
    case EIssuesStoreType.ARCHIVED:
      return archivedQuery;
    case EIssuesStoreType.PROJECT_VIEW:
      return projectViewQuery;
    case EIssuesStoreType.GLOBAL:
      return workspaceViewQuery;
    case EIssuesStoreType.PROFILE:
      return profileQuery;
    default:
      return projectQuery;
  }
}

/**
 * Convert TanStack Query loading states to the existing TLoader type.
 * This enables gradual migration of components from MobX loader state.
 *
 * Mapping:
 * - isLoading (no cached data) -> "init-loader"
 * - isFetchingNextPage -> "pagination"
 * - isFetching (background refetch) -> "mutation"
 * - otherwise -> "loaded" or undefined
 */
function queryStateToLoader(
  isLoading: boolean,
  isFetching: boolean,
  isFetchingNextPage: boolean,
  hasData: boolean
): TLoader {
  if (isLoading) return "init-loader";
  if (isFetchingNextPage) return "pagination";
  if (isFetching) return "mutation";
  if (hasData) return "loaded";
  return undefined;
}

/**
 * Compatibility layer hook that provides TLoader from TanStack Query states.
 * Use this hook to migrate components that consume loader state.
 *
 * @example
 * // Replace:
 * const loader = useIssueLoader(storeType);
 *
 * // With:
 * const loader = useIssueLoaderFromQuery(storeType);
 */
export function useIssueLoaderFromQuery(storeType: EIssuesStoreType): TLoader {
  const query = useIssuesQuery(storeType);

  return useMemo(
    () =>
      queryStateToLoader(
        query.isLoading,
        query.isFetching,
        query.isFetchingNextPage,
        !!query.data?.pages?.length
      ),
    [query.isLoading, query.isFetching, query.isFetchingNextPage, query.data?.pages?.length]
  );
}
