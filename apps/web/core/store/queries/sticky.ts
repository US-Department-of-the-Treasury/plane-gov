"use client";

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import type { TSticky, InstructionType, TPaginationInfo } from "@plane/types";
import { STICKIES_PER_PAGE } from "@plane/constants";
import { StickyService } from "@/services/sticky.service";
import { queryKeys } from "./query-keys";

// Service instance
const stickyService = new StickyService();

/**
 * Hook to fetch workspace stickies with pagination support.
 * Replaces MobX StickyStore.fetchWorkspaceStickies for read operations.
 *
 * @example
 * const { data: stickies, isLoading, hasNextPage, fetchNextPage } = useWorkspaceStickies(workspaceSlug, searchQuery);
 */
export function useWorkspaceStickies(workspaceSlug: string, searchQuery?: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.stickies.all(workspaceSlug, `${STICKIES_PER_PAGE}:0:0`, searchQuery),
    queryFn: ({ pageParam = `${STICKIES_PER_PAGE}:0:0` }) =>
      stickyService.getStickies(workspaceSlug, pageParam as string, searchQuery),
    enabled: !!workspaceSlug,
    initialPageParam: `${STICKIES_PER_PAGE}:0:0`,
    getNextPageParam: (lastPage) => {
      if (lastPage.next_page_results && lastPage.next_cursor) {
        return lastPage.next_cursor;
      }
      return undefined;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - stickies change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch the most recent sticky.
 * Replaces MobX StickyStore.fetchRecentSticky for read operations.
 *
 * @example
 * const { data: recentSticky, isLoading } = useRecentSticky(workspaceSlug);
 */
export function useRecentSticky(workspaceSlug: string) {
  return useQuery({
    queryKey: queryKeys.stickies.recent(workspaceSlug),
    queryFn: async () => {
      const response = await stickyService.getStickies(workspaceSlug, "1:0:0", undefined, 1);
      return response.results[0];
    },
    enabled: !!workspaceSlug,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

interface CreateStickyParams {
  workspaceSlug: string;
  data: Partial<TSticky>;
}

/**
 * Hook to create a sticky with optimistic updates.
 * Replaces MobX StickyStore.createSticky for write operations.
 *
 * @example
 * const { mutate: createSticky, isPending } = useCreateSticky();
 * createSticky({ workspaceSlug, data: { title: "New sticky", content: "Content" } });
 */
export function useCreateSticky() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, data }: CreateStickyParams) => stickyService.createSticky(workspaceSlug, data),
    onSuccess: (newSticky, { workspaceSlug }) => {
      // Invalidate all sticky queries for this workspace
      void queryClient.invalidateQueries({ queryKey: ["stickies", workspaceSlug] });

      // Update recent sticky
      queryClient.setQueryData(queryKeys.stickies.recent(workspaceSlug), newSticky);
    },
  });
}

interface UpdateStickyParams {
  workspaceSlug: string;
  stickyId: string;
  data: Partial<TSticky>;
}

/**
 * Hook to update a sticky with optimistic updates.
 * Replaces MobX StickyStore.updateSticky for write operations.
 *
 * @example
 * const { mutate: updateSticky, isPending } = useUpdateSticky();
 * updateSticky({ workspaceSlug, stickyId, data: { title: "Updated title" } });
 */
export function useUpdateSticky() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, stickyId, data }: UpdateStickyParams) =>
      stickyService.updateSticky(workspaceSlug, stickyId, data),
    onMutate: async ({ workspaceSlug, stickyId, data }) => {
      // Cancel any outgoing queries
      await queryClient.cancelQueries({ queryKey: ["stickies", workspaceSlug] });

      // Snapshot previous data
      const previousData = queryClient.getQueriesData({ queryKey: ["stickies", workspaceSlug] });

      // Optimistically update all sticky queries
      queryClient.setQueriesData({ queryKey: ["stickies", workspaceSlug] }, (old: any) => {
        if (!old) return old;

        // Handle infinite query structure
        if (old.pages) {
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              results: page.results.map((sticky: TSticky) =>
                sticky.id === stickyId ? { ...sticky, ...data } : sticky
              ),
            })),
          };
        }

        // Handle single sticky (recent sticky query)
        if (old.id === stickyId) {
          return { ...old, ...data };
        }

        return old;
      });

      return { previousData, workspaceSlug };
    },
    onError: (_error, { workspaceSlug }, context) => {
      // Revert optimistic updates on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: (_data, { workspaceSlug, stickyId }) => {
      // Update recent sticky if this was the recent one
      const recentSticky = queryClient.getQueryData<TSticky>(queryKeys.stickies.recent(workspaceSlug));
      if (recentSticky?.id === stickyId) {
        queryClient.setQueryData(queryKeys.stickies.recent(workspaceSlug), _data);
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: ["stickies", workspaceSlug] });
    },
  });
}

interface DeleteStickyParams {
  workspaceSlug: string;
  stickyId: string;
}

/**
 * Hook to delete a sticky with optimistic updates.
 * Replaces MobX StickyStore.deleteSticky for write operations.
 *
 * @example
 * const { mutate: deleteSticky, isPending } = useDeleteSticky();
 * deleteSticky({ workspaceSlug, stickyId });
 */
export function useDeleteSticky() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, stickyId }: DeleteStickyParams) =>
      stickyService.deleteSticky(workspaceSlug, stickyId),
    onMutate: async ({ workspaceSlug, stickyId }) => {
      await queryClient.cancelQueries({ queryKey: ["stickies", workspaceSlug] });

      const previousData = queryClient.getQueriesData({ queryKey: ["stickies", workspaceSlug] });

      // Optimistically remove sticky from all queries
      queryClient.setQueriesData({ queryKey: ["stickies", workspaceSlug] }, (old: any) => {
        if (!old) return old;

        // Handle infinite query structure
        if (old.pages) {
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              results: page.results.filter((sticky: TSticky) => sticky.id !== stickyId),
            })),
          };
        }

        return old;
      });

      return { previousData, workspaceSlug };
    },
    onError: (_error, { workspaceSlug }, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: ["stickies", workspaceSlug] });
    },
  });
}

interface UpdateStickyPositionParams {
  workspaceSlug: string;
  stickyId: string;
  destinationId: string;
  edge: InstructionType;
}

/**
 * Hook to update sticky position (reorder) with optimistic updates.
 * Replaces MobX StickyStore.updateStickyPosition for write operations.
 *
 * @example
 * const { mutate: updatePosition, isPending } = useUpdateStickyPosition();
 * updatePosition({ workspaceSlug, stickyId, destinationId, edge: "reorder-above" });
 */
export function useUpdateStickyPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceSlug, stickyId, destinationId, edge }: UpdateStickyPositionParams) => {
      // Calculate new sort_order
      const allData = queryClient.getQueriesData<any>({ queryKey: ["stickies", workspaceSlug] });
      let stickies: TSticky[] = [];

      for (const [, data] of allData) {
        if (data?.pages) {
          stickies = data.pages.flatMap((page: any) => page.results || []);
          break;
        }
      }

      const sortedStickies = [...stickies].sort((a, b) => (b.sort_order ?? 10000) - (a.sort_order ?? 10000));
      const destinationSticky = sortedStickies.find((s) => s.id === destinationId);
      const destinationIndex = sortedStickies.findIndex((s) => s.id === destinationId);

      let resultSequence = 10000;

      if (destinationSticky) {
        const destinationSequence = destinationSticky.sort_order ?? 10000;

        if (edge === "reorder-above") {
          const prevSticky = sortedStickies[destinationIndex - 1];
          if (prevSticky) {
            resultSequence = (destinationSequence + (prevSticky.sort_order ?? 10000)) / 2;
          } else {
            resultSequence = destinationSequence + 10000;
          }
        } else {
          resultSequence = destinationSequence - 10000;
        }
      }

      // Update the sticky with new sort_order
      return stickyService.updateSticky(workspaceSlug, stickyId, { sort_order: resultSequence });
    },
    onMutate: async ({ workspaceSlug, stickyId, destinationId, edge }) => {
      await queryClient.cancelQueries({ queryKey: ["stickies", workspaceSlug] });

      const previousData = queryClient.getQueriesData({ queryKey: ["stickies", workspaceSlug] });

      // Optimistically update sort_order
      queryClient.setQueriesData({ queryKey: ["stickies", workspaceSlug] }, (old: any) => {
        if (!old?.pages) return old;

        // Get all stickies and calculate new position
        const allStickies = old.pages.flatMap((page: any) => page.results || []);
        const sortedStickies = [...allStickies].sort((a, b) => (b.sort_order ?? 10000) - (a.sort_order ?? 10000));
        const destinationSticky = sortedStickies.find((s: TSticky) => s.id === destinationId);
        const destinationIndex = sortedStickies.findIndex((s: TSticky) => s.id === destinationId);

        let resultSequence = 10000;

        if (destinationSticky) {
          const destinationSequence = destinationSticky.sort_order ?? 10000;

          if (edge === "reorder-above") {
            const prevSticky = sortedStickies[destinationIndex - 1];
            if (prevSticky) {
              resultSequence = (destinationSequence + (prevSticky.sort_order ?? 10000)) / 2;
            } else {
              resultSequence = destinationSequence + 10000;
            }
          } else {
            resultSequence = destinationSequence - 10000;
          }
        }

        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            results: page.results.map((sticky: TSticky) =>
              sticky.id === stickyId ? { ...sticky, sort_order: resultSequence } : sticky
            ),
          })),
        };
      });

      return { previousData, workspaceSlug };
    },
    onError: (_error, { workspaceSlug }, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: ["stickies", workspaceSlug] });
    },
  });
}

/**
 * Get all stickies from cache (flattened from infinite query pages).
 *
 * @example
 * const stickies = getAllStickiesFromCache(queryClient, workspaceSlug, searchQuery);
 */
export function getAllStickiesFromCache(
  queryClient: ReturnType<typeof useQueryClient>,
  workspaceSlug: string,
  searchQuery?: string
): TSticky[] {
  const queryData = queryClient.getQueryData<any>(
    queryKeys.stickies.all(workspaceSlug, `${STICKIES_PER_PAGE}:0:0`, searchQuery)
  );

  if (!queryData?.pages) return [];

  return queryData.pages.flatMap((page: any) => page.results || []);
}

/**
 * Get sorted sticky IDs from cache.
 *
 * @example
 * const stickyIds = getSortedStickyIds(queryClient, workspaceSlug, searchQuery);
 */
export function getSortedStickyIds(
  queryClient: ReturnType<typeof useQueryClient>,
  workspaceSlug: string,
  searchQuery?: string
): string[] {
  const stickies = getAllStickiesFromCache(queryClient, workspaceSlug, searchQuery);
  return [...stickies].sort((a, b) => (b.sort_order ?? 10000) - (a.sort_order ?? 10000)).map((s) => s.id);
}
