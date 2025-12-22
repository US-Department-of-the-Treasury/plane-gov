"use client";

import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { TSticky } from "@plane/types";

/**
 * Sticky hooks using TanStack Query + Zustand.
 * Replaces MobX StickyStore.
 *
 * Migration guide:
 * ===============
 *
 * SERVER DATA (TanStack Query):
 * - fetchWorkspaceStickies → useWorkspaceStickies(workspaceSlug, searchQuery)
 * - fetchNextWorkspaceStickies → use hasNextPage and fetchNextPage from useWorkspaceStickies
 * - fetchRecentSticky → useRecentSticky(workspaceSlug)
 * - createSticky → useCreateSticky().mutate({ workspaceSlug, data })
 * - updateSticky → useUpdateSticky().mutate({ workspaceSlug, stickyId, data })
 * - deleteSticky → useDeleteSticky().mutate({ workspaceSlug, stickyId })
 * - updateStickyPosition → useUpdateStickyPosition().mutate({ workspaceSlug, stickyId, destinationId, edge })
 * - stickies, workspaceStickies → access via query data
 * - loader → isLoading, isFetching from query hooks
 * - creatingSticky → isPending from useCreateSticky
 * - paginationInfo → managed internally by useInfiniteQuery
 *
 * UI STATE (Zustand):
 * - searchQuery → useStickyUIStore().searchQuery / setSearchQuery(query)
 * - activeStickyId → useStickyUIStore().activeStickyId / setActiveStickyId(id)
 * - showAddNewSticky → useStickyUIStore().showAddNewSticky / toggleAddNewSticky(show)
 * - updateSearchQuery → useStickyUIStore().setSearchQuery
 * - updateActiveStickyId → useStickyUIStore().setActiveStickyId
 * - toggleShowNewSticky → useStickyUIStore().toggleAddNewSticky
 *
 * COMPUTED/HELPERS:
 * - getWorkspaceStickyIds → getSortedStickyIds(queryClient, workspaceSlug, searchQuery)
 * - recentStickyId → useRecentSticky(workspaceSlug).data?.id
 */

// TanStack Query hooks (server data)
export {
  useWorkspaceStickies,
  useRecentSticky,
  useCreateSticky,
  useUpdateSticky,
  useDeleteSticky,
  useUpdateStickyPosition,
  getAllStickiesFromCache,
  getSortedStickyIds,
} from "@/store/queries/sticky";

// Zustand store (UI state)
export { useStickyUIStore } from "@/store/client/sticky-ui.store";
export type { StickyUIStore } from "@/store/client/sticky-ui.store";

// Import for backward-compatible hook
import {
  useWorkspaceStickies,
  useRecentSticky,
  getAllStickiesFromCache,
  useCreateSticky,
  useUpdateSticky,
  useDeleteSticky,
  useUpdateStickyPosition,
  getSortedStickyIds,
} from "@/store/queries/sticky";
import { useStickyUIStore } from "@/store/client/sticky-ui.store";
import type { InstructionType } from "@plane/types";

/**
 * Backward-compatible hook that combines TanStack Query + Zustand.
 * Provides the same interface as the old MobX StickyStore.
 *
 * @example
 * const { stickies, activeStickyId, recentStickyId, updateActiveStickyId, fetchRecentSticky, toggleShowNewSticky } = useSticky();
 */
export function useSticky() {
  const params = useParams();
  const workspaceSlug = params?.workspaceSlug as string | undefined;
  const queryClient = useQueryClient();

  // Get UI state from Zustand
  const {
    activeStickyId,
    setActiveStickyId,
    toggleAddNewSticky,
    searchQuery,
    setSearchQuery,
  } = useStickyUIStore();

  // Fetch stickies data (auto-fetches when workspaceSlug is available)
  const workspaceStickiesQuery = useWorkspaceStickies(workspaceSlug || "", searchQuery);
  const { data, isLoading, isFetching, hasNextPage, fetchNextPage, isFetchingNextPage } = workspaceStickiesQuery;

  // Fetch recent sticky
  const { data: recentSticky } = useRecentSticky(workspaceSlug || "");

  // Get mutation hooks
  const { mutate: createStickyMutation, isPending: creatingSticky } = useCreateSticky();
  const { mutate: updateStickyMutation } = useUpdateSticky();
  const { mutate: deleteStickyMutation } = useDeleteSticky();
  const { mutate: updateStickyPositionMutation } = useUpdateStickyPosition();

  // Convert array of stickies to object mapping ID -> sticky
  const stickies: Record<string, TSticky> = {};
  if (workspaceSlug) {
    const allStickies = getAllStickiesFromCache(queryClient, workspaceSlug, searchQuery);
    allStickies.forEach((sticky) => {
      stickies[sticky.id] = sticky;
    });
  }

  // Determine loader state
  let loader: "init-loader" | "loaded" | "pagination" | undefined;
  if (isLoading) {
    loader = "init-loader";
  } else if (isFetchingNextPage) {
    loader = "pagination";
  } else if (data) {
    loader = "loaded";
  }

  // Get pagination info from last page
  const lastPage = data?.pages[data.pages.length - 1];
  const paginationInfo = lastPage
    ? {
        next_page_results: lastPage.next_page_results,
        next_cursor: lastPage.next_cursor,
      }
    : undefined;

  return {
    // Data
    stickies,
    activeStickyId,
    recentStickyId: recentSticky?.id,
    searchQuery,
    creatingSticky,
    loader,
    paginationInfo,

    // Computed/Helpers
    getWorkspaceStickyIds: (workspaceSlug: string) => {
      return getSortedStickyIds(queryClient, workspaceSlug, searchQuery);
    },

    // Actions
    updateActiveStickyId: setActiveStickyId,
    updateSearchQuery: setSearchQuery,
    fetchRecentSticky: (_workspaceSlug: string) => {
      // No-op: TanStack Query auto-fetches via useRecentSticky hook
      // Kept for backward compatibility
    },
    fetchWorkspaceStickies: (_workspaceSlug?: string) => {
      // No-op: TanStack Query auto-fetches via useWorkspaceStickies hook
      // Kept for backward compatibility
      return Promise.resolve();
    },
    fetchNextWorkspaceStickies: (_workspaceSlug?: string) => {
      if (hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    },
    toggleShowNewSticky: toggleAddNewSticky,

    // Mutations (wrapped for backward compatibility)
    createSticky: (workspaceSlug: string, data: Partial<TSticky>) => {
      return new Promise<TSticky>((resolve, reject) => {
        createStickyMutation(
          { workspaceSlug, data },
          {
            onSuccess: (result) => resolve(result),
            onError: (error) => reject(error),
          }
        );
      });
    },
    updateSticky: (workspaceSlug: string, stickyId: string, data: Partial<TSticky>) => {
      return new Promise<TSticky>((resolve, reject) => {
        updateStickyMutation(
          { workspaceSlug, stickyId, data },
          {
            onSuccess: (result) => resolve(result),
            onError: (error) => reject(error),
          }
        );
      });
    },
    deleteSticky: (workspaceSlug: string, stickyId: string) => {
      return new Promise<void>((resolve, reject) => {
        deleteStickyMutation(
          { workspaceSlug, stickyId },
          {
            onSuccess: () => resolve(),
            onError: (error) => reject(error),
          }
        );
      });
    },
    updateStickyPosition: (
      workspaceSlug: string,
      stickyId: string,
      destinationId: string,
      edge: InstructionType
    ) => {
      return new Promise<TSticky>((resolve, reject) => {
        updateStickyPositionMutation(
          { workspaceSlug, stickyId, destinationId, edge },
          {
            onSuccess: (result) => resolve(result),
            onError: (error) => reject(error),
          }
        );
      });
    },
  };
}
