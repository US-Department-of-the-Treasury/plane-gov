"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { IState } from "@plane/types";
import { ProjectStateService } from "@/services/project/project-state.service";
import { queryKeys } from "./query-keys";

// Service instance
const stateService = new ProjectStateService();

/**
 * Hook to fetch project states.
 * Replaces MobX StateStore.fetchProjectStates for read operations.
 *
 * @example
 * const { data: states, isLoading } = useProjectStates(workspaceSlug, projectId);
 */
export function useProjectStates(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: queryKeys.states.all(workspaceSlug, projectId),
    queryFn: () => stateService.getStates(workspaceSlug, projectId),
    enabled: !!workspaceSlug && !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch workspace states (all states across projects).
 * Replaces MobX StateStore.fetchWorkspaceStates for read operations.
 *
 * @example
 * const { data: states, isLoading } = useWorkspaceStates(workspaceSlug);
 */
export function useWorkspaceStates(workspaceSlug: string) {
  return useQuery({
    queryKey: queryKeys.states.workspace(workspaceSlug),
    queryFn: () => stateService.getWorkspaceStates(workspaceSlug),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch intake (triage) state for a project.
 *
 * @example
 * const { data: intakeState, isLoading } = useIntakeState(workspaceSlug, projectId);
 */
export function useIntakeState(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: queryKeys.states.intake(workspaceSlug, projectId),
    queryFn: () => stateService.getIntakeState(workspaceSlug, projectId),
    enabled: !!workspaceSlug && !!projectId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface CreateStateParams {
  workspaceSlug: string;
  projectId: string;
  data: Partial<IState>;
}

/**
 * Hook to create a new state with optimistic updates.
 * Replaces MobX StateStore.createState for write operations.
 *
 * @example
 * const { mutate: createState, isPending } = useCreateState();
 * createState({ workspaceSlug, projectId, data: { name: "In Progress", group: "started" } });
 */
export function useCreateState() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, data }: CreateStateParams) =>
      stateService.createState(workspaceSlug, projectId, data),
    onMutate: async ({ workspaceSlug, projectId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.states.all(workspaceSlug, projectId) });

      const previousStates = queryClient.getQueryData<IState[]>(queryKeys.states.all(workspaceSlug, projectId));

      // Optimistic update with temporary ID
      if (previousStates) {
        const optimisticState: IState = {
          id: `temp-${Date.now()}`,
          name: data.name ?? "",
          color: data.color ?? "#000000",
          description: data.description ?? "",
          group: data.group ?? "backlog",
          default: false,
          project_id: projectId,
          workspace_id: "",
          sequence: previousStates.length + 1,
          order: previousStates.length + 1,
        };
        queryClient.setQueryData<IState[]>(queryKeys.states.all(workspaceSlug, projectId), [
          ...previousStates,
          optimisticState,
        ]);
      }

      return { previousStates, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousStates && context.workspaceSlug && context.projectId) {
        queryClient.setQueryData(
          queryKeys.states.all(context.workspaceSlug, context.projectId),
          context.previousStates
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.states.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.states.workspace(workspaceSlug) });
    },
  });
}

interface UpdateStateParams {
  workspaceSlug: string;
  projectId: string;
  stateId: string;
  data: Partial<IState>;
}

/**
 * Hook to update an existing state with optimistic updates.
 * Replaces MobX StateStore.updateState for write operations.
 *
 * @example
 * const { mutate: updateState, isPending } = useUpdateState();
 * updateState({ workspaceSlug, projectId, stateId, data: { name: "Updated Name" } });
 */
export function useUpdateState() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, stateId, data }: UpdateStateParams) =>
      stateService.patchState(workspaceSlug, projectId, stateId, data),
    onMutate: async ({ workspaceSlug, projectId, stateId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.states.all(workspaceSlug, projectId) });

      const previousStates = queryClient.getQueryData<IState[]>(queryKeys.states.all(workspaceSlug, projectId));

      if (previousStates) {
        queryClient.setQueryData<IState[]>(
          queryKeys.states.all(workspaceSlug, projectId),
          previousStates.map((state) => (state.id === stateId ? { ...state, ...data } : state))
        );
      }

      return { previousStates, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousStates && context.workspaceSlug && context.projectId) {
        queryClient.setQueryData(
          queryKeys.states.all(context.workspaceSlug, context.projectId),
          context.previousStates
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.states.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.states.workspace(workspaceSlug) });
    },
  });
}

interface DeleteStateParams {
  workspaceSlug: string;
  projectId: string;
  stateId: string;
}

/**
 * Hook to delete a state with optimistic updates.
 * Replaces MobX StateStore.deleteState for write operations.
 *
 * @example
 * const { mutate: deleteState, isPending } = useDeleteState();
 * deleteState({ workspaceSlug, projectId, stateId });
 */
export function useDeleteState() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, stateId }: DeleteStateParams) =>
      stateService.deleteState(workspaceSlug, projectId, stateId),
    onMutate: async ({ workspaceSlug, projectId, stateId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.states.all(workspaceSlug, projectId) });

      const previousStates = queryClient.getQueryData<IState[]>(queryKeys.states.all(workspaceSlug, projectId));

      if (previousStates) {
        queryClient.setQueryData<IState[]>(
          queryKeys.states.all(workspaceSlug, projectId),
          previousStates.filter((state) => state.id !== stateId)
        );
      }

      return { previousStates, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousStates && context.workspaceSlug && context.projectId) {
        queryClient.setQueryData(
          queryKeys.states.all(context.workspaceSlug, context.projectId),
          context.previousStates
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.states.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.states.workspace(workspaceSlug) });
    },
  });
}

interface MarkDefaultParams {
  workspaceSlug: string;
  projectId: string;
  stateId: string;
}

/**
 * Hook to mark a state as default with optimistic updates.
 * Replaces MobX StateStore.markStateAsDefault for write operations.
 *
 * @example
 * const { mutate: markDefault, isPending } = useMarkStateAsDefault();
 * markDefault({ workspaceSlug, projectId, stateId });
 */
export function useMarkStateAsDefault() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, stateId }: MarkDefaultParams) =>
      stateService.markDefault(workspaceSlug, projectId, stateId),
    onMutate: async ({ workspaceSlug, projectId, stateId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.states.all(workspaceSlug, projectId) });

      const previousStates = queryClient.getQueryData<IState[]>(queryKeys.states.all(workspaceSlug, projectId));

      if (previousStates) {
        queryClient.setQueryData<IState[]>(
          queryKeys.states.all(workspaceSlug, projectId),
          previousStates.map((state) => ({
            ...state,
            default: state.id === stateId,
          }))
        );
      }

      return { previousStates, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousStates && context.workspaceSlug && context.projectId) {
        queryClient.setQueryData(
          queryKeys.states.all(context.workspaceSlug, context.projectId),
          context.previousStates
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.states.all(workspaceSlug, projectId) });
    },
  });
}

interface MoveStatePositionParams {
  workspaceSlug: string;
  projectId: string;
  stateId: string;
  data: Partial<IState>;
}

/**
 * Hook to move a state's position with optimistic updates.
 * Replaces MobX StateStore.moveStatePosition for write operations.
 *
 * @example
 * const { mutate: moveState, isPending } = useMoveStatePosition();
 * moveState({ workspaceSlug, projectId, stateId, data: { sequence: 3 } });
 */
export function useMoveStatePosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, stateId, data }: MoveStatePositionParams) =>
      stateService.patchState(workspaceSlug, projectId, stateId, data),
    onMutate: async ({ workspaceSlug, projectId, stateId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.states.all(workspaceSlug, projectId) });

      const previousStates = queryClient.getQueryData<IState[]>(queryKeys.states.all(workspaceSlug, projectId));

      if (previousStates) {
        queryClient.setQueryData<IState[]>(
          queryKeys.states.all(workspaceSlug, projectId),
          previousStates.map((state) => (state.id === stateId ? { ...state, ...data } : state))
        );
      }

      return { previousStates, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousStates && context.workspaceSlug && context.projectId) {
        queryClient.setQueryData(
          queryKeys.states.all(context.workspaceSlug, context.projectId),
          context.previousStates
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.states.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.states.workspace(workspaceSlug) });
    },
  });
}

// Utility hooks for derived data

/**
 * Hook to get states grouped by their state group.
 * Replaces MobX StateStore.groupedProjectStates computed property.
 *
 * @example
 * const { data: groupedStates } = useGroupedProjectStates(workspaceSlug, projectId);
 * // Returns: { backlog: [...], unstarted: [...], started: [...], completed: [...], cancelled: [...] }
 */
export function useGroupedProjectStates(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: [...queryKeys.states.all(workspaceSlug, projectId), "grouped"],
    queryFn: async () => {
      const states = await stateService.getStates(workspaceSlug, projectId);
      return groupStatesByGroup(states);
    },
    enabled: !!workspaceSlug && !!projectId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Group states by their state group.
 * Utility function that can be used independently.
 */
export function groupStatesByGroup(states: IState[]): Record<string, IState[]> {
  return states.reduce(
    (acc, state) => {
      const group = state.group;
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(state);
      return acc;
    },
    {} as Record<string, IState[]>
  );
}
