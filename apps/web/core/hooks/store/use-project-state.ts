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
export {
  useProjectStates,
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
