import { useParams } from "next/navigation";
import {
  useWorkspaceDraftIssues as useWorkspaceDraftIssuesQuery,
  useInfiniteWorkspaceDraftIssues,
  useWorkspaceDraftIssue as useWorkspaceDraftIssueQuery,
  useCreateWorkspaceDraftIssue as useCreateWorkspaceDraftIssueMutation,
  useUpdateWorkspaceDraftIssue as useUpdateWorkspaceDraftIssueMutation,
  useDeleteWorkspaceDraftIssue as useDeleteWorkspaceDraftIssueMutation,
  useMoveWorkspaceDraftIssue as useMoveWorkspaceDraftIssueMutation,
} from "@/store/queries";
import { useWorkspaceDraftFilterStore } from "@/store/client";
import type { TIssue, TWorkspaceDraftIssue } from "@plane/types";
import type { IWorkspaceDraftIssues } from "@/store/issue/workspace-draft";

/**
 * Compatibility hook that provides MobX-like interface using TanStack Query and Zustand.
 * This hook maintains the same interface as the old MobX store for backward compatibility.
 */
export const useWorkspaceDraftIssues = (): IWorkspaceDraftIssues => {
  const { workspaceSlug } = useParams() as { workspaceSlug?: string };
  const filterStore = useWorkspaceDraftFilterStore();

  // Get filters from store for query params
  const filters = filterStore.getFilters(workspaceSlug ?? "");
  const filterParams = filters?.richFilters || {};

  // TanStack Query hooks
  const { data: paginationData, isLoading, refetch } = useWorkspaceDraftIssuesQuery(workspaceSlug ?? "", filterParams);
  const { data: infiniteData, fetchNextPage } = useInfiniteWorkspaceDraftIssues(workspaceSlug ?? "", filterParams);

  const createMutation = useCreateWorkspaceDraftIssueMutation();
  const updateMutation = useUpdateWorkspaceDraftIssueMutation();
  const deleteMutation = useDeleteWorkspaceDraftIssueMutation();
  const moveMutation = useMoveWorkspaceDraftIssueMutation();

  // Build issuesMap from query data
  const issuesMap: Record<string, TWorkspaceDraftIssue> = {};
  const issueMapIds: Record<string, string[]> = {};

  if (paginationData?.results) {
    paginationData.results.forEach((issue) => {
      issuesMap[issue.id] = issue;
    });
    if (workspaceSlug) {
      issueMapIds[workspaceSlug] = paginationData.results.map((issue) => issue.id);
    }
  }

  // Compatibility layer - implements IWorkspaceDraftIssues interface
  return {
    // Observables
    loader: isLoading ? "init-loader" : undefined,
    paginationInfo: paginationData
      ? {
          total_count: paginationData.total_count,
          next_cursor: paginationData.next_cursor,
          prev_cursor: paginationData.prev_cursor,
          next_page_results: paginationData.next_page_results,
          prev_page_results: paginationData.prev_page_results,
          count: paginationData.count,
          total_pages: paginationData.total_pages,
          total_results: paginationData.total_results,
          extra_stats: paginationData.extra_stats,
          grouped_by: paginationData.grouped_by,
          sub_grouped_by: paginationData.sub_grouped_by,
        }
      : undefined,
    issuesMap,
    issueMapIds,

    // Computed
    get issueIds() {
      return workspaceSlug && issueMapIds[workspaceSlug] ? issueMapIds[workspaceSlug] : [];
    },

    // Computed functions
    getIssueById: (issueId: string) => issuesMap[issueId],

    // Helper actions
    addIssue: () => {
      // No-op - TanStack Query handles cache updates automatically
    },
    mutateIssue: (issueId: string, data: Partial<TWorkspaceDraftIssue>) => {
      if (!workspaceSlug) return;
      updateMutation.mutate({ workspaceSlug, issueId, data });
    },
    removeIssue: async (issueId: string) => {
      if (!workspaceSlug) return;
      await deleteMutation.mutateAsync({ workspaceSlug, issueId });
    },

    // Actions
    fetchIssues: async (workspaceSlug, loadType, paginationType) => {
      const result = await refetch();
      return result.data;
    },

    createIssue: async (workspaceSlug, payload) => {
      return await createMutation.mutateAsync({ workspaceSlug, data: payload });
    },

    updateIssue: async (workspaceSlug, issueId, payload) => {
      return await updateMutation.mutateAsync({ workspaceSlug, issueId, data: payload });
    },

    deleteIssue: async (workspaceSlug, issueId) => {
      await deleteMutation.mutateAsync({ workspaceSlug, issueId });
    },

    moveIssue: async (workspaceSlug, issueId, payload) => {
      return await moveMutation.mutateAsync({ workspaceSlug, issueId, data: payload });
    },

    addSprintToIssue: async (workspaceSlug, issueId, sprintId) => {
      return await updateMutation.mutateAsync({
        workspaceSlug,
        issueId,
        data: { sprint_id: sprintId },
      });
    },

    addEpicsToIssue: async (workspaceSlug, issueId, epicIds) => {
      return await updateMutation.mutateAsync({
        workspaceSlug,
        issueId,
        data: { epic_ids: epicIds },
      });
    },

    // Dummies (not implemented for workspace drafts)
    viewFlags: { enableQuickAdd: false, enableIssueCreation: false, enableInlineEditing: false },
    groupedIssueIds: undefined,
    getIssueIds: () => undefined,
    getPaginationData: () => undefined,
    getIssueLoader: () => "loaded",
    getGroupIssueCount: () => undefined,
    removeSprintFromIssue: async () => {},
    addIssueToSprint: async () => {},
    removeIssueFromSprint: async () => {},
    removeIssuesFromEpic: async () => {},
    changeEpicsInIssue: async () => {},
    archiveIssue: async () => {},
    archiveBulkIssues: async () => {},
    removeBulkIssues: async () => {},
    bulkUpdateProperties: async () => {},
  };
};
