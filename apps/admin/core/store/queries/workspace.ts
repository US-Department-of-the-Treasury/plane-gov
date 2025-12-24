"use client";

import { InfiniteData, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { InstanceWorkspaceService } from "@plane/services";
import type { IWorkspace, TWorkspacePaginationInfo } from "@plane/types";
import { queryKeys } from "./query-keys";

const instanceWorkspaceService = new InstanceWorkspaceService();

type WorkspaceInfiniteData = InfiniteData<TWorkspacePaginationInfo, string | undefined>;

/**
 * Hook to fetch workspaces with pagination support.
 * Replaces MobX WorkspaceStore.fetchWorkspaces and fetchNextWorkspaces.
 *
 * Uses TanStack Query's infinite query pattern for cursor-based pagination.
 */
export function useWorkspaces() {
  return useInfiniteQuery({
    queryKey: queryKeys.workspaces.all(),
    queryFn: ({ pageParam }) => instanceWorkspaceService.list(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      // Return next cursor if there are more results, undefined otherwise
      return lastPage.next_page_results ? lastPage.next_cursor : undefined;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to create a new workspace.
 * Replaces MobX WorkspaceStore.createWorkspace.
 */
export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: IWorkspace) => instanceWorkspaceService.create(data),
    onSuccess: async () => {
      // Reset (not just invalidate) to clear cached data completely.
      // This ensures the list page shows a loading state and fetches fresh data
      // rather than displaying stale cached data while refetching in background.
      await queryClient.resetQueries({ queryKey: queryKeys.workspaces.all() });
    },
  });
}

/**
 * Utility to get a workspace by ID from the infinite query cache.
 * Replaces MobX WorkspaceStore.getWorkspaceById.
 */
export function getWorkspaceById(
  data: WorkspaceInfiniteData | undefined,
  workspaceId: string
): IWorkspace | undefined {
  if (!data?.pages) return undefined;

  for (const page of data.pages) {
    const workspace = page.results?.find((w: IWorkspace) => w.id === workspaceId);
    if (workspace) return workspace;
  }

  return undefined;
}

/**
 * Utility to get all workspaces as a flat array from infinite query data.
 * Replaces MobX WorkspaceStore.workspaceIds computed value.
 */
export function getAllWorkspaces(data: WorkspaceInfiniteData | undefined): IWorkspace[] {
  if (!data?.pages) return [];
  return data.pages.flatMap((page) => page.results || []);
}
