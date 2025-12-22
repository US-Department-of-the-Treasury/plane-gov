/**
 * Label hooks using TanStack Query.
 * Replaces MobX LabelStore with individual query hooks.
 *
 * Migration from MobX:
 * - Instead of: const labelStore = useLabel()
 * - Use individual hooks like: const { data: labels } = useProjectLabels(workspaceSlug, projectId)
 *
 * Re-exports all label-related hooks from the queries layer.
 */
import { useQueryClient } from "@tanstack/react-query";
import { IssueLabelService } from "@/services/issue/issue_label.service";
import { queryKeys } from "@/store/queries/query-keys";

export {
  useProjectLabels,
  useWorkspaceLabels,
  useCreateLabel,
  useUpdateLabel,
  useUpdateLabelPosition,
  useDeleteLabel,
  buildLabelTree,
  useProjectLabelTree,
} from "@/store/queries/label";

// Service instance
const labelService = new IssueLabelService();

/**
 * Backward-compatible hook that wraps TanStack Query label hooks.
 * Provides imperative fetch methods for compatibility with existing code.
 *
 * @deprecated Use individual hooks like useProjectLabels, useWorkspaceLabels directly.
 *
 * @example
 * // Old pattern (deprecated but still works):
 * const { fetchProjectLabels, fetchWorkspaceLabels } = useLabel();
 * await fetchProjectLabels(workspaceSlug, projectId);
 *
 * // New pattern (preferred):
 * const { data: labels } = useProjectLabels(workspaceSlug, projectId);
 */
export function useLabel() {
  const queryClient = useQueryClient();

  return {
    /**
     * Fetch project labels imperatively.
     * Uses TanStack Query's prefetchQuery to fetch and cache data.
     */
    fetchProjectLabels: async (workspaceSlug: string, projectId: string) => {
      return queryClient.fetchQuery({
        queryKey: queryKeys.labels.all(workspaceSlug, projectId),
        queryFn: () => labelService.getProjectLabels(workspaceSlug, projectId),
        staleTime: 5 * 60 * 1000, // 5 minutes
      });
    },

    /**
     * Fetch workspace labels imperatively.
     * Uses TanStack Query's prefetchQuery to fetch and cache data.
     */
    fetchWorkspaceLabels: async (workspaceSlug: string) => {
      return queryClient.fetchQuery({
        queryKey: queryKeys.labels.workspace(workspaceSlug),
        queryFn: () => labelService.getWorkspaceIssueLabels(workspaceSlug),
        staleTime: 5 * 60 * 1000,
      });
    },
  };
}
