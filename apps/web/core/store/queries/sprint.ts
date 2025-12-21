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
 * @example
 * const { data: sprints, isLoading } = useProjectSprints(workspaceSlug, projectId);
 */
export function useProjectSprints(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: queryKeys.sprints.all(workspaceSlug, projectId),
    queryFn: () => sprintService.getSprintsWithParams(workspaceSlug, projectId),
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
 * @example
 * const { data: activeSprints, isLoading } = useActiveSprint(workspaceSlug, projectId);
 */
export function useActiveSprint(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: queryKeys.sprints.active(workspaceSlug, projectId),
    queryFn: () => sprintService.getSprintsWithParams(workspaceSlug, projectId, "current"),
    enabled: !!workspaceSlug && !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes - active sprint changes more frequently
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch sprint details by ID.
 * Replaces MobX SprintStore.fetchSprintDetails for read operations.
 *
 * @example
 * const { data: sprint, isLoading } = useSprintDetails(workspaceSlug, projectId, sprintId);
 */
export function useSprintDetails(workspaceSlug: string, projectId: string, sprintId: string) {
  return useQuery({
    queryKey: queryKeys.sprints.detail(sprintId),
    queryFn: () => sprintService.getSprintDetails(workspaceSlug, projectId, sprintId),
    enabled: !!workspaceSlug && !!projectId && !!sprintId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch archived sprints for a project.
 * Replaces MobX SprintStore.fetchArchivedSprints for read operations.
 *
 * @example
 * const { data: archivedSprints, isLoading } = useArchivedSprints(workspaceSlug, projectId);
 */
export function useArchivedSprints(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: [...queryKeys.sprints.all(workspaceSlug, projectId), "archived"],
    queryFn: () => sprintArchiveService.getArchivedSprints(workspaceSlug, projectId),
    enabled: !!workspaceSlug && !!projectId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch sprint progress.
 *
 * @example
 * const { data: progress, isLoading } = useSprintProgress(workspaceSlug, projectId, sprintId);
 */
export function useSprintProgress(workspaceSlug: string, projectId: string, sprintId: string) {
  return useQuery({
    queryKey: [...queryKeys.sprints.detail(sprintId), "progress"],
    queryFn: () => sprintService.workspaceActiveSprintsProgress(workspaceSlug, projectId, sprintId),
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
 * @example
 * const { mutate: createSprint, isPending } = useCreateSprint();
 * createSprint({ workspaceSlug, projectId, data: { name: "Sprint 1", start_date: "2024-01-01" } });
 */
export function useCreateSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, data }: CreateSprintParams) =>
      sprintService.createSprint(workspaceSlug, projectId, data),
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
          project_id: projectId,
          workspace_id: "",
          owned_by_id: "",
          sort_order: previousSprints.length + 1,
          archived_at: null,
          view_props: { filters: {} },
          project_detail: { id: projectId },
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
 * @example
 * const { mutate: updateSprint, isPending } = useUpdateSprint();
 * updateSprint({ workspaceSlug, projectId, sprintId, data: { name: "Updated Sprint" } });
 */
export function useUpdateSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, sprintId, data }: UpdateSprintParams) =>
      sprintService.patchSprint(workspaceSlug, projectId, sprintId, data),
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
 * @example
 * const { mutate: deleteSprint, isPending } = useDeleteSprint();
 * deleteSprint({ workspaceSlug, projectId, sprintId });
 */
export function useDeleteSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, sprintId }: DeleteSprintParams) =>
      sprintService.deleteSprint(workspaceSlug, projectId, sprintId),
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
      sprintArchiveService.archiveSprint(workspaceSlug, projectId, sprintId),
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
      sprintArchiveService.restoreSprint(workspaceSlug, projectId, sprintId),
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
