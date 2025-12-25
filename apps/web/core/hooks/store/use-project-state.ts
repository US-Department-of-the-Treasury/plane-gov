/**
 * Project state hooks using TanStack Query.
 * Replaces MobX StateStore with individual query hooks.
 *
 * Migration from MobX:
 * - Instead of: const stateStore = useProjectState()
 * - Use individual hooks like: const { data: states } = useProjectStates(workspaceSlug, projectId)
 *
 * Re-exports all state-related hooks from the queries layer.
 */
import { useStateStore } from "@/store/client/state.store";
import { useProjectStates as useProjectStatesQuery } from "@/store/queries/state";

export {
  useWorkspaceStates,
  useIntakeState,
  useCreateState,
  useUpdateState,
  useDeleteState,
  useMarkStateAsDefault,
  useMoveStatePosition,
  useGroupedProjectStates,
  groupStatesByGroup,
  getStateById,
  getStateIds,
  getDefaultStateId,
  getStatePercentageInGroup,
} from "@/store/queries/state";

/**
 * Hook to fetch project states AND sync to Zustand store.
 * This ensures both TanStack Query cache and Zustand store are populated,
 * which is required for legacy store consumers like getGroupByColumns().
 *
 * @example
 * // Fetches states and syncs to Zustand
 * const { data: states, isLoading } = useProjectStates(workspaceSlug, projectId);
 */
export function useProjectStates(workspaceSlug: string | undefined, projectId: string | null | undefined) {
  const query = useProjectStatesQuery(workspaceSlug, projectId);

  // Sync to Zustand store synchronously when data is available.
  // This is safe because:
  // 1. Zustand is external to React's render cycle
  // 2. syncStates is idempotent (same data = no state change)
  // 3. This ensures getGroupByColumns() sees data during the same render
  if (query.data && projectId) {
    useStateStore.getState().syncStates(query.data, projectId);
  }

  return query;
}
