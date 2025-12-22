"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ISprint } from "@plane/types";
import { SprintService } from "@/services/sprint.service";
import { SprintArchiveService } from "@/services/sprint_archive.service";
import { queryKeys } from "./query-keys";

// Service instances
const sprintService = new SprintService();
const sprintArchiveService = new SprintArchiveService();

/**
 * Hook to fetch all sprints for a project.
 * Replaces MobX SprintStore.fetchAllSprints for read operations.
 *
 * Note: Sprints are now workspace-wide, so this fetches all workspace sprints.
 * Filter by projectId on the client side if needed.
 *
 * @example
 * const { data: sprints, isLoading } = useProjectSprints(workspaceSlug, projectId);
 */
export function useProjectSprints(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: queryKeys.sprints.all(workspaceSlug, projectId),
    queryFn: () => sprintService.getWorkspaceSprints(workspaceSlug),
    enabled: !!workspaceSlug && !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch workspace sprints.
 * Replaces MobX SprintStore.fetchWorkspaceSprints for read operations.
 *
 * @example
 * const { data: sprints, isLoading } = useWorkspaceSprints(workspaceSlug);
 */
export function useWorkspaceSprints(workspaceSlug: string) {
  return useQuery({
    queryKey: [...queryKeys.sprints.all(workspaceSlug, ""), "workspace"],
    queryFn: () => sprintService.getWorkspaceSprints(workspaceSlug),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch active sprint for a project.
 * Replaces MobX SprintStore.fetchActiveSprint for read operations.
 *
 * Note: Uses deprecated workspaceActiveSprints method for backward compatibility.
 * This will be replaced with a proper active sprints endpoint in the future.
 *
 * @example
 * const { data: activeSprints, isLoading } = useActiveSprint(workspaceSlug, projectId);
 */
export function useActiveSprint(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: queryKeys.sprints.active(workspaceSlug, projectId),
    queryFn: async () => {
      const response = await sprintService.workspaceActiveSprints(workspaceSlug, "0", 100);
      // Extract results array from paginated response
      return response.results;
    },
    enabled: !!workspaceSlug && !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes - active sprint changes more frequently
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch sprint details by ID.
 * Replaces MobX SprintStore.fetchSprintDetails for read operations.
 *
 * Note: Sprints are workspace-wide, projectId is kept for query key consistency.
 *
 * @example
 * const { data: sprint, isLoading } = useSprintDetails(workspaceSlug, projectId, sprintId);
 */
export function useSprintDetails(workspaceSlug: string, projectId: string, sprintId: string) {
  return useQuery({
    queryKey: queryKeys.sprints.detail(sprintId),
    queryFn: () => sprintService.getSprintDetails(workspaceSlug, sprintId),
    enabled: !!workspaceSlug && !!projectId && !!sprintId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch archived sprints for a project.
 * Replaces MobX SprintStore.fetchArchivedSprints for read operations.
 *
 * Note: Sprints are workspace-wide, projectId is kept for query key consistency.
 *
 * @example
 * const { data: archivedSprints, isLoading } = useArchivedSprints(workspaceSlug, projectId);
 */
export function useArchivedSprints(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: [...queryKeys.sprints.all(workspaceSlug, projectId), "archived"],
    queryFn: () => sprintArchiveService.getArchivedSprints(workspaceSlug),
    enabled: !!workspaceSlug && !!projectId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch sprint progress.
 *
 * TODO: This hook is currently disabled as the sprint service no longer has a
 * dedicated progress endpoint. Sprint progress is included in getSprintDetails.
 * Consider removing this hook or updating it to derive progress from sprint details.
 *
 * @example
 * const { data: progress, isLoading } = useSprintProgress(workspaceSlug, projectId, sprintId);
 */
export function useSprintProgress(workspaceSlug: string, projectId: string, sprintId: string) {
  return useQuery({
    queryKey: [...queryKeys.sprints.detail(sprintId), "progress"],
    queryFn: async () => {
      // Sprint progress is included in sprint details
      const sprint = await sprintService.getSprintDetails(workspaceSlug, sprintId);
      return sprint.progress_snapshot;
    },
    enabled: !!workspaceSlug && !!projectId && !!sprintId,
    staleTime: 2 * 60 * 1000, // Progress changes frequently
    gcTime: 30 * 60 * 1000,
  });
}

interface CreateSprintParams {
  workspaceSlug: string;
  projectId: string;
  data: Partial<ISprint>;
}

/**
 * Hook to create a new sprint with optimistic updates.
 * Replaces MobX SprintStore.createSprint for write operations.
 *
 * DEPRECATED: Sprints are now workspace-wide and auto-generated.
 * This mutation will throw an error if called. Remove usage of this hook.
 *
 * @example
 * const { mutate: createSprint, isPending } = useCreateSprint();
 * createSprint({ workspaceSlug, projectId, data: { name: "Sprint 1", start_date: "2024-01-01" } });
 */
export function useCreateSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, data }: CreateSprintParams) => {
      throw new Error(
        "Sprint creation is disabled. Sprints are now workspace-wide and auto-generated. " +
          "Configure workspace.sprint_start_date to enable automatic sprint generation."
      );
    },
    onMutate: async ({ workspaceSlug, projectId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.sprints.all(workspaceSlug, projectId) });

      const previousSprints = queryClient.getQueryData<ISprint[]>(queryKeys.sprints.all(workspaceSlug, projectId));

      // Optimistic update with temporary ID
      if (previousSprints) {
        const optimisticSprint: ISprint = {
          id: `temp-${Date.now()}`,
          name: data.name ?? "",
          description: data.description ?? "",
          start_date: data.start_date ?? null,
          end_date: data.end_date ?? null,
          workspace_id: "",
          number: previousSprints.length + 1,
          sort_order: previousSprints.length + 1,
          archived_at: null,
          view_props: { filters: {} },
          progress: [],
          progress_snapshot: undefined,
          version: 0,
          // TProgressSnapshot required properties
          total_issues: 0,
          completed_issues: 0,
          backlog_issues: 0,
          started_issues: 0,
          unstarted_issues: 0,
          cancelled_issues: 0,
          backlog_estimate_points: 0,
          started_estimate_points: 0,
          unstarted_estimate_points: 0,
          cancelled_estimate_points: 0,
        };
        queryClient.setQueryData<ISprint[]>(queryKeys.sprints.all(workspaceSlug, projectId), [
          ...previousSprints,
          optimisticSprint,
        ]);
      }

      return { previousSprints, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousSprints && context.workspaceSlug && context.projectId) {
        queryClient.setQueryData(
          queryKeys.sprints.all(context.workspaceSlug, context.projectId),
          context.previousSprints
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sprints.all(workspaceSlug, projectId) });
    },
  });
}

interface UpdateSprintParams {
  workspaceSlug: string;
  projectId: string;
  sprintId: string;
  data: Partial<ISprint>;
}

/**
 * Hook to update a sprint with optimistic updates.
 * Replaces MobX SprintStore.updateSprintDetails for write operations.
 *
 * Note: Only name, description, logo_props, view_props, and sort_order can be updated.
 * Sprint dates are auto-calculated and cannot be changed.
 *
 * @example
 * const { mutate: updateSprint, isPending } = useUpdateSprint();
 * updateSprint({ workspaceSlug, projectId, sprintId, data: { name: "Updated Sprint" } });
 */
export function useUpdateSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, sprintId, data }: UpdateSprintParams) =>
      sprintService.patchSprint(workspaceSlug, sprintId, data),
    onMutate: async ({ workspaceSlug, projectId, sprintId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.sprints.all(workspaceSlug, projectId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.sprints.detail(sprintId) });

      const previousSprints = queryClient.getQueryData<ISprint[]>(queryKeys.sprints.all(workspaceSlug, projectId));
      const previousSprintDetail = queryClient.getQueryData<ISprint>(queryKeys.sprints.detail(sprintId));

      if (previousSprints) {
        queryClient.setQueryData<ISprint[]>(
          queryKeys.sprints.all(workspaceSlug, projectId),
          previousSprints.map((sprint) => (sprint.id === sprintId ? { ...sprint, ...data } : sprint))
        );
      }

      if (previousSprintDetail) {
        queryClient.setQueryData<ISprint>(queryKeys.sprints.detail(sprintId), {
          ...previousSprintDetail,
          ...data,
        });
      }

      return { previousSprints, previousSprintDetail, workspaceSlug, projectId, sprintId };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        if (context.previousSprints) {
          queryClient.setQueryData(
            queryKeys.sprints.all(context.workspaceSlug, context.projectId),
            context.previousSprints
          );
        }
        if (context.previousSprintDetail) {
          queryClient.setQueryData(queryKeys.sprints.detail(context.sprintId), context.previousSprintDetail);
        }
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId, sprintId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sprints.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.sprints.detail(sprintId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.sprints.active(workspaceSlug, projectId) });
    },
  });
}

interface DeleteSprintParams {
  workspaceSlug: string;
  projectId: string;
  sprintId: string;
}

/**
 * Hook to delete a sprint with optimistic updates.
 * Replaces MobX SprintStore.deleteSprint for write operations.
 *
 * DEPRECATED: Sprints are now workspace-wide and auto-generated.
 * Sprints cannot be deleted manually. Use useArchiveSprint instead.
 * This mutation will throw an error if called.
 *
 * @example
 * const { mutate: deleteSprint, isPending } = useDeleteSprint();
 * deleteSprint({ workspaceSlug, projectId, sprintId });
 */
export function useDeleteSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, sprintId }: DeleteSprintParams) => {
      throw new Error(
        "Sprint deletion is disabled. Sprints are workspace-wide and auto-generated. " +
          "Use archiveSprint instead to archive a sprint."
      );
    },
    onMutate: async ({ workspaceSlug, projectId, sprintId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.sprints.all(workspaceSlug, projectId) });

      const previousSprints = queryClient.getQueryData<ISprint[]>(queryKeys.sprints.all(workspaceSlug, projectId));

      if (previousSprints) {
        queryClient.setQueryData<ISprint[]>(
          queryKeys.sprints.all(workspaceSlug, projectId),
          previousSprints.filter((sprint) => sprint.id !== sprintId)
        );
      }

      return { previousSprints, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousSprints && context.workspaceSlug && context.projectId) {
        queryClient.setQueryData(
          queryKeys.sprints.all(context.workspaceSlug, context.projectId),
          context.previousSprints
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId, sprintId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sprints.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.sprints.active(workspaceSlug, projectId) });
      void queryClient.removeQueries({ queryKey: queryKeys.sprints.detail(sprintId) });
    },
  });
}

interface ArchiveSprintParams {
  workspaceSlug: string;
  projectId: string;
  sprintId: string;
}

/**
 * Hook to archive a sprint with optimistic updates.
 * Replaces MobX SprintStore.archiveSprint for write operations.
 *
 * @example
 * const { mutate: archiveSprint, isPending } = useArchiveSprint();
 * archiveSprint({ workspaceSlug, projectId, sprintId });
 */
export function useArchiveSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, sprintId }: ArchiveSprintParams) =>
      sprintArchiveService.archiveSprint(workspaceSlug, sprintId),
    onMutate: async ({ workspaceSlug, projectId, sprintId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.sprints.all(workspaceSlug, projectId) });

      const previousSprints = queryClient.getQueryData<ISprint[]>(queryKeys.sprints.all(workspaceSlug, projectId));

      if (previousSprints) {
        queryClient.setQueryData<ISprint[]>(
          queryKeys.sprints.all(workspaceSlug, projectId),
          previousSprints.map((sprint) =>
            sprint.id === sprintId ? { ...sprint, archived_at: new Date().toISOString() } : sprint
          )
        );
      }

      return { previousSprints, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousSprints && context.workspaceSlug && context.projectId) {
        queryClient.setQueryData(
          queryKeys.sprints.all(context.workspaceSlug, context.projectId),
          context.previousSprints
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sprints.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.sprints.all(workspaceSlug, projectId), "archived"],
      });
    },
  });
}

/**
 * Hook to restore an archived sprint with optimistic updates.
 * Replaces MobX SprintStore.restoreSprint for write operations.
 *
 * @example
 * const { mutate: restoreSprint, isPending } = useRestoreSprint();
 * restoreSprint({ workspaceSlug, projectId, sprintId });
 */
export function useRestoreSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, sprintId }: ArchiveSprintParams) =>
      sprintArchiveService.restoreSprint(workspaceSlug, sprintId),
    onMutate: async ({ workspaceSlug, projectId, sprintId }) => {
      const archivedKey = [...queryKeys.sprints.all(workspaceSlug, projectId), "archived"];
      await queryClient.cancelQueries({ queryKey: archivedKey });

      const previousArchivedSprints = queryClient.getQueryData<ISprint[]>(archivedKey);

      if (previousArchivedSprints) {
        queryClient.setQueryData<ISprint[]>(
          archivedKey,
          previousArchivedSprints.map((sprint) => (sprint.id === sprintId ? { ...sprint, archived_at: null } : sprint))
        );
      }

      return { previousArchivedSprints, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousArchivedSprints && context.workspaceSlug && context.projectId) {
        const archivedKey = [...queryKeys.sprints.all(context.workspaceSlug, context.projectId), "archived"];
        queryClient.setQueryData(archivedKey, context.previousArchivedSprints);
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sprints.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.sprints.all(workspaceSlug, projectId), "archived"],
      });
    },
  });
}

// Utility functions for derived data

/**
 * Get sprint by ID from a sprints array.
 *
 * @example
 * const { data: sprints } = useProjectSprints(workspaceSlug, projectId);
 * const sprint = getSprintById(sprints, sprintId);
 */
export function getSprintById(
  sprints: ISprint[] | undefined,
  sprintId: string | null | undefined
): ISprint | undefined {
  if (!sprints || !sprintId) return undefined;
  return sprints.find((sprint) => sprint.id === sprintId);
}

/**
 * Get sprint name by ID from a sprints array.
 *
 * @example
 * const { data: sprints } = useProjectSprints(workspaceSlug, projectId);
 * const name = getSprintNameById(sprints, sprintId);
 */
export function getSprintNameById(
  sprints: ISprint[] | undefined,
  sprintId: string | null | undefined
): string | undefined {
  if (!sprints || !sprintId) return undefined;
  return sprints.find((sprint) => sprint.id === sprintId)?.name;
}

/**
 * Get sprint IDs from sprints array.
 *
 * @example
 * const { data: sprints } = useProjectSprints(workspaceSlug, projectId);
 * const sprintIds = getSprintIds(sprints);
 */
export function getSprintIds(sprints: ISprint[] | undefined): string[] {
  if (!sprints) return [];
  return sprints.map((sprint) => sprint.id);
}

/**
 * Get active/current sprint from sprints array.
 *
 * @example
 * const { data: sprints } = useProjectSprints(workspaceSlug, projectId);
 * const activeSprint = getActiveSprint(sprints);
 */
export function getActiveSprint(sprints: ISprint[] | undefined): ISprint | undefined {
  if (!sprints) return undefined;
  const now = new Date();
  return sprints.find((sprint) => {
    if (!sprint.start_date || !sprint.end_date) return false;
    const startDate = new Date(sprint.start_date);
    const endDate = new Date(sprint.end_date);
    return startDate <= now && now <= endDate;
  });
}

/**
 * Get completed sprints from sprints array.
 *
 * @example
 * const { data: sprints } = useProjectSprints(workspaceSlug, projectId);
 * const completedSprints = getCompletedSprints(sprints);
 */
export function getCompletedSprints(sprints: ISprint[] | undefined): ISprint[] {
  if (!sprints) return [];
  const now = new Date();
  return sprints.filter((sprint) => {
    if (!sprint.end_date) return false;
    const endDate = new Date(sprint.end_date);
    return endDate < now;
  });
}

/**
 * Get upcoming sprints from sprints array.
 *
 * @example
 * const { data: sprints } = useProjectSprints(workspaceSlug, projectId);
 * const upcomingSprints = getUpcomingSprints(sprints);
 */
export function getUpcomingSprints(sprints: ISprint[] | undefined): ISprint[] {
  if (!sprints) return [];
  const now = new Date();
  return sprints.filter((sprint) => {
    if (!sprint.start_date) return false;
    const startDate = new Date(sprint.start_date);
    return startDate > now;
  });
}
