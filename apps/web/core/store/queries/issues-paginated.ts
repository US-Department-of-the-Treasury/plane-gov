"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { TIssue, TIssuesResponse, TIssueParams, TProfileViews } from "@plane/types";
import { ALL_ISSUES } from "@plane/constants";
// Services
import { IssueService } from "@/services/issue/issue.service";
import { IssueArchiveService } from "@/services/issue/issue_archive.service";
import { WorkspaceService } from "@/services/workspace.service";
import { UserService } from "@/services/user.service";
// Store
import { useIssueStore } from "@/store/issue/issue.store";
// Query Keys
import { queryKeys } from "./query-keys";

// Service instances
const issueService = new IssueService();
const issueArchiveService = new IssueArchiveService();

// Types
export interface IssuesQueryParams {
  cursor?: string;
  per_page?: number;
  group_by?: string;
  sub_group_by?: string;
  order_by?: string;
  filters?: Record<string, string>;
  expand?: string;
}

export interface UseIssuesPaginatedOptions {
  workspaceSlug: string;
  projectId: string;
  filterParams?: Partial<Record<TIssueParams, string | boolean>>;
  enabled?: boolean;
  perPage?: number;
}

export interface UseSprintIssuesPaginatedOptions extends UseIssuesPaginatedOptions {
  sprintId: string;
}

export interface UseEpicIssuesPaginatedOptions extends UseIssuesPaginatedOptions {
  epicId: string;
}

export interface UseProfileIssuesPaginatedOptions {
  workspaceSlug: string;
  userId: string;
  view: TProfileViews;
  filterParams?: Partial<Record<TIssueParams, string | boolean>>;
  enabled?: boolean;
  perPage?: number;
}

export interface UseProjectViewIssuesPaginatedOptions extends UseIssuesPaginatedOptions {
  viewId: string;
}

export interface UseWorkspaceViewIssuesPaginatedOptions {
  workspaceSlug: string;
  viewId: string;
  filterParams?: Partial<Record<TIssueParams, string | boolean>>;
  enabled?: boolean;
  perPage?: number;
}

/**
 * Extract flat issue list from paginated TanStack Query response
 */
export function extractIssuesFromPages(pages: TIssuesResponse[] | undefined): TIssue[] {
  if (!pages) return [];

  const allIssues: TIssue[] = [];

  for (const page of pages) {
    const results = page?.results;
    if (!results) continue;

    if (Array.isArray(results)) {
      allIssues.push(...results);
    } else {
      // Grouped response - extract from each group
      for (const groupId in results) {
        const groupData = results[groupId];
        if (!groupData?.results) continue;

        if (Array.isArray(groupData.results)) {
          allIssues.push(...groupData.results);
        } else {
          // Sub-grouped - extract from each sub-group
          for (const subGroupId in groupData.results) {
            const subGroupData = groupData.results[subGroupId];
            if (subGroupData?.results) {
              allIssues.push(...subGroupData.results);
            }
          }
        }
      }
    }
  }

  return allIssues;
}

/**
 * Extract grouped issue IDs from paginated response
 */
export function extractGroupedIssueIds(
  pages: TIssuesResponse[] | undefined
): Record<string, string[] | Record<string, string[]>> {
  if (!pages) return {};

  // Use the last page's structure to determine grouping
  // But accumulate IDs from all pages
  const groupedIds: Record<string, string[] | Record<string, string[]>> = {};

  for (const page of pages) {
    const results = page?.results;
    if (!results) continue;

    if (Array.isArray(results)) {
      // Ungrouped
      const existing = (groupedIds[ALL_ISSUES] as string[]) || [];
      groupedIds[ALL_ISSUES] = [...existing, ...results.map((issue) => issue.id)];
    } else {
      // Grouped
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

  return groupedIds;
}

/**
 * Hook to fetch paginated project issues using TanStack Query's useInfiniteQuery.
 * Automatically syncs fetched issues to Zustand store.
 *
 * @example
 * const { data, isLoading, fetchNextPage, hasNextPage } = useProjectIssuesPaginated({
 *   workspaceSlug: "my-workspace",
 *   projectId: "project-123",
 *   filterParams: { state: "backlog" }
 * });
 */
export function useProjectIssuesPaginated(options: UseIssuesPaginatedOptions) {
  const { workspaceSlug, projectId, filterParams = {}, enabled = true, perPage = 50 } = options;
  const addIssue = useIssueStore((state) => state.addIssue);

  return useInfiniteQuery({
    queryKey: queryKeys.issues.list.project(workspaceSlug, projectId, filterParams),
    queryFn: async ({ pageParam }) => {
      const response = await issueService.getIssues(workspaceSlug, projectId, {
        ...filterParams,
        cursor: pageParam,
        per_page: perPage,
      } as unknown as Partial<Record<TIssueParams, string | boolean>>);

      // Sync issues to Zustand store
      const issues = extractIssuesFromSinglePage(response);
      if (issues.length > 0) {
        addIssue(issues);
      }

      return response;
    },
    initialPageParam: `${perPage}:0:0`,
    getNextPageParam: (lastPage) => (lastPage?.next_page_results ? lastPage.next_cursor : undefined),
    getPreviousPageParam: (firstPage) => (firstPage?.prev_page_results ? firstPage.prev_cursor : undefined),
    enabled: !!workspaceSlug && !!projectId && enabled,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch paginated sprint issues.
 */
export function useSprintIssuesPaginated(options: UseSprintIssuesPaginatedOptions) {
  const { workspaceSlug, projectId, sprintId, filterParams = {}, enabled = true, perPage = 50 } = options;
  const addIssue = useIssueStore((state) => state.addIssue);

  return useInfiniteQuery({
    queryKey: queryKeys.issues.list.sprint(workspaceSlug, projectId, sprintId, filterParams),
    queryFn: async ({ pageParam }) => {
      const response = await issueService.getIssues(workspaceSlug, projectId, {
        ...filterParams,
        sprint: sprintId,
        cursor: pageParam,
        per_page: perPage,
      } as unknown as Partial<Record<TIssueParams, string | boolean>>);

      // Sync issues to Zustand store
      const issues = extractIssuesFromSinglePage(response);
      if (issues.length > 0) {
        addIssue(issues);
      }

      return response;
    },
    initialPageParam: `${perPage}:0:0`,
    getNextPageParam: (lastPage) => (lastPage?.next_page_results ? lastPage.next_cursor : undefined),
    getPreviousPageParam: (firstPage) => (firstPage?.prev_page_results ? firstPage.prev_cursor : undefined),
    enabled: !!workspaceSlug && !!projectId && !!sprintId && enabled,
    staleTime: 1 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch paginated epic issues.
 */
export function useEpicIssuesPaginated(options: UseEpicIssuesPaginatedOptions) {
  const { workspaceSlug, projectId, epicId, filterParams = {}, enabled = true, perPage = 50 } = options;
  const addIssue = useIssueStore((state) => state.addIssue);

  return useInfiniteQuery({
    queryKey: queryKeys.issues.list.epic(workspaceSlug, projectId, epicId, filterParams),
    queryFn: async ({ pageParam }) => {
      const response = await issueService.getIssues(workspaceSlug, projectId, {
        ...filterParams,
        epic: epicId,
        cursor: pageParam,
        per_page: perPage,
      } as unknown as Partial<Record<TIssueParams, string | boolean>>);

      // Sync issues to Zustand store
      const issues = extractIssuesFromSinglePage(response);
      if (issues.length > 0) {
        addIssue(issues);
      }

      return response;
    },
    initialPageParam: `${perPage}:0:0`,
    getNextPageParam: (lastPage) => (lastPage?.next_page_results ? lastPage.next_cursor : undefined),
    getPreviousPageParam: (firstPage) => (firstPage?.prev_page_results ? firstPage.prev_cursor : undefined),
    enabled: !!workspaceSlug && !!projectId && !!epicId && enabled,
    staleTime: 1 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch paginated archived issues.
 */
export function useArchivedIssuesPaginated(options: UseIssuesPaginatedOptions) {
  const { workspaceSlug, projectId, filterParams = {}, enabled = true, perPage = 50 } = options;
  const addIssue = useIssueStore((state) => state.addIssue);

  return useInfiniteQuery({
    queryKey: queryKeys.issues.list.archived(workspaceSlug, projectId, filterParams),
    queryFn: async ({ pageParam }): Promise<TIssuesResponse> => {
      const response = (await issueArchiveService.getArchivedIssues(workspaceSlug, projectId, {
        ...filterParams,
        cursor: pageParam,
        per_page: perPage,
      })) as TIssuesResponse;

      // Sync issues to Zustand store
      const issues = extractIssuesFromSinglePage(response);
      if (issues.length > 0) {
        addIssue(issues);
      }

      return response;
    },
    initialPageParam: `${perPage}:0:0`,
    getNextPageParam: (lastPage: TIssuesResponse) => (lastPage?.next_page_results ? lastPage.next_cursor : undefined),
    getPreviousPageParam: (firstPage: TIssuesResponse) => (firstPage?.prev_page_results ? firstPage.prev_cursor : undefined),
    enabled: !!workspaceSlug && !!projectId && enabled,
    staleTime: 1 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch paginated profile issues (assigned, created, subscribed).
 */
export function useProfileIssuesPaginated(options: UseProfileIssuesPaginatedOptions) {
  const { workspaceSlug, userId, view, filterParams = {}, enabled = true, perPage = 50 } = options;
  const addIssue = useIssueStore((state) => state.addIssue);

  return useInfiniteQuery({
    queryKey: queryKeys.issues.list.profile(workspaceSlug, userId, view, filterParams),
    queryFn: async ({ pageParam }) => {
      const userService = new UserService();
      const response = await userService.getUserProfileIssues(workspaceSlug, userId, {
        ...filterParams,
        type: view,
        cursor: pageParam,
        per_page: perPage,
      });

      // Sync issues to Zustand store
      const issues = extractIssuesFromSinglePage(response);
      if (issues.length > 0) {
        addIssue(issues);
      }

      return response;
    },
    initialPageParam: `${perPage}:0:0`,
    getNextPageParam: (lastPage) => (lastPage?.next_page_results ? lastPage.next_cursor : undefined),
    getPreviousPageParam: (firstPage) => (firstPage?.prev_page_results ? firstPage.prev_cursor : undefined),
    enabled: !!workspaceSlug && !!userId && !!view && enabled,
    staleTime: 1 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch paginated project view issues.
 * Uses the standard issue service with view filters applied.
 */
export function useProjectViewIssuesPaginated(options: UseProjectViewIssuesPaginatedOptions) {
  const { workspaceSlug, projectId, viewId, filterParams = {}, enabled = true, perPage = 50 } = options;
  const addIssue = useIssueStore((state) => state.addIssue);

  return useInfiniteQuery({
    queryKey: queryKeys.issues.list.projectView(workspaceSlug, projectId, viewId, filterParams),
    queryFn: async ({ pageParam }) => {
      // Project views use the standard issue service - the view filters are passed as params
      const response = await issueService.getIssues(workspaceSlug, projectId, {
        ...filterParams,
        cursor: pageParam,
        per_page: perPage,
      } as unknown as Partial<Record<TIssueParams, string | boolean>>);

      // Sync issues to Zustand store
      const issues = extractIssuesFromSinglePage(response);
      if (issues.length > 0) {
        addIssue(issues);
      }

      return response;
    },
    initialPageParam: `${perPage}:0:0`,
    getNextPageParam: (lastPage) => (lastPage?.next_page_results ? lastPage.next_cursor : undefined),
    getPreviousPageParam: (firstPage) => (firstPage?.prev_page_results ? firstPage.prev_cursor : undefined),
    enabled: !!workspaceSlug && !!projectId && !!viewId && enabled,
    staleTime: 1 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch paginated workspace view (global view) issues.
 */
export function useWorkspaceViewIssuesPaginated(options: UseWorkspaceViewIssuesPaginatedOptions) {
  const { workspaceSlug, viewId, filterParams = {}, enabled = true, perPage = 50 } = options;
  const addIssue = useIssueStore((state) => state.addIssue);

  return useInfiniteQuery({
    queryKey: queryKeys.issues.list.workspaceView(workspaceSlug, viewId, filterParams),
    queryFn: async ({ pageParam }) => {
      const workspaceService = new WorkspaceService();
      // WorkspaceService.getViewIssues expects params object with filters
      const response = await workspaceService.getViewIssues(workspaceSlug, {
        ...filterParams,
        cursor: pageParam,
        per_page: perPage,
      });

      // Sync issues to Zustand store
      const issues = extractIssuesFromSinglePage(response);
      if (issues.length > 0) {
        addIssue(issues);
      }

      return response;
    },
    initialPageParam: `${perPage}:0:0`,
    getNextPageParam: (lastPage) => (lastPage?.next_page_results ? lastPage.next_cursor : undefined),
    getPreviousPageParam: (firstPage) => (firstPage?.prev_page_results ? firstPage.prev_cursor : undefined),
    enabled: !!workspaceSlug && !!viewId && enabled,
    staleTime: 1 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Helper to extract issues from a single page response
 */
function extractIssuesFromSinglePage(response: TIssuesResponse): TIssue[] {
  const results = response?.results;
  if (!results) return [];

  if (Array.isArray(results)) {
    return results;
  }

  // Grouped response - extract from each group
  const issues: TIssue[] = [];
  for (const groupId in results) {
    const groupData = results[groupId];
    if (!groupData?.results) continue;

    if (Array.isArray(groupData.results)) {
      issues.push(...groupData.results);
    } else {
      // Sub-grouped
      for (const subGroupId in groupData.results) {
        const subGroupData = groupData.results[subGroupId];
        if (subGroupData?.results) {
          issues.push(...subGroupData.results);
        }
      }
    }
  }

  return issues;
}
