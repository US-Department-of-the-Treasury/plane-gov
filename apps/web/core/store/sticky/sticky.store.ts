/**
 * Sticky hooks and stores using TanStack Query + Zustand.
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
