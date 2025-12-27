"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ISprint, TSprintMemberProject, TRemovalImpact, TBulkMoveIssuesPayload } from "@plane/types";
import { SprintService } from "@/services/sprint.service";
import { SprintArchiveService } from "@/services/sprint_archive.service";
import { queryKeys } from "./query-keys";

// Service instances
const sprintService = new SprintService();
const sprintArchiveService = new SprintArchiveService();

/**
 * Hook to fetch sprints assigned to a specific project.
 * Replaces MobX SprintStore.fetchAllSprints for read operations.
 *
 * Only returns sprints that have SprintMemberProject assignments for this project.
 * This is the source of truth for which sprints should appear in a project's sprint view.
 *
 * @example
 * const { data: sprints, isLoading } = useProjectSprints(workspaceSlug, projectId);
 */
export function useProjectSprints(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: queryKeys.sprints.all(workspaceSlug, projectId),
    queryFn: () => sprintService.getProjectSprints(workspaceSlug, projectId),
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
 * Uses the same data as useProjectSprints but provides a consistent interface
 * for components that specifically need the active sprint.
 *
 * Returns all sprints assigned to the project - use getActiveSprint() helper
 * to find the current sprint from the results.
 *
 * @example
 * const { data: sprints, isLoading } = useActiveSprint(workspaceSlug, projectId);
 * const activeSprint = getActiveSprint(sprints);
 */
export function useActiveSprint(workspaceSlug: string, projectId: string) {
  // Use the same query as useProjectSprints to avoid duplicate requests
  // and ensure consistency between the sprint list and active sprint views
  return useQuery({
    queryKey: queryKeys.sprints.all(workspaceSlug, projectId),
    queryFn: () => sprintService.getProjectSprints(workspaceSlug, projectId),
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
    mutationFn: ({ workspaceSlug: _workspaceSlug, projectId: _projectId, data: _data }: CreateSprintParams) => {
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
    mutationFn: ({ workspaceSlug, projectId: _projectId, sprintId, data }: UpdateSprintParams) =>
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
    mutationFn: ({ workspaceSlug: _workspaceSlug, projectId: _projectId, sprintId: _sprintId }: DeleteSprintParams) => {
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
    mutationFn: ({ workspaceSlug, projectId: _projectId, sprintId }: ArchiveSprintParams) =>
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
    mutationFn: ({ workspaceSlug, projectId: _projectId, sprintId }: ArchiveSprintParams) =>
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

// Sprint Member Project Assignment Hooks
// These control which sprints appear in each project's sprint view

/**
 * Hook to fetch all sprint-member-project assignments for a workspace.
 * This is the source of truth for sprint visibility in project views.
 *
 * @example
 * const { data: assignments, isLoading } = useSprintMemberProjects(workspaceSlug);
 */
export function useSprintMemberProjects(workspaceSlug: string) {
  return useQuery({
    queryKey: queryKeys.sprints.memberProjects(workspaceSlug),
    queryFn: () => sprintService.getSprintMemberProjects(workspaceSlug),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface SetSprintMemberProjectParams {
  workspaceSlug: string;
  sprintId: string;
  memberId: string;
  projectId: string;
}

/**
 * Hook to create or update a sprint-member-project assignment.
 * This determines which sprints appear in a project's sprint view.
 *
 * @example
 * const { mutate: setAssignment, isPending } = useSetSprintMemberProject();
 * setAssignment({ workspaceSlug, sprintId, memberId, projectId });
 */
export function useSetSprintMemberProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, sprintId, memberId, projectId }: SetSprintMemberProjectParams) =>
      sprintService.setSprintMemberProject(workspaceSlug, {
        sprint: sprintId,
        member: memberId,
        project: projectId,
      }),
    onMutate: async ({ workspaceSlug, sprintId, memberId, projectId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.sprints.memberProjects(workspaceSlug) });

      const previousAssignments = queryClient.getQueryData<TSprintMemberProject[]>(
        queryKeys.sprints.memberProjects(workspaceSlug)
      );

      // Optimistic update
      if (previousAssignments) {
        const existingIndex = previousAssignments.findIndex(
          (a) => a.sprint === sprintId && a.member === memberId
        );
        const optimisticAssignment: TSprintMemberProject = {
          id: `temp-${Date.now()}`,
          workspace: workspaceSlug,
          sprint: sprintId,
          member: memberId,
          project: projectId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (existingIndex >= 0) {
          // Update existing
          const updated = [...previousAssignments];
          updated[existingIndex] = { ...updated[existingIndex], project: projectId };
          queryClient.setQueryData(queryKeys.sprints.memberProjects(workspaceSlug), updated);
        } else {
          // Add new
          queryClient.setQueryData(queryKeys.sprints.memberProjects(workspaceSlug), [
            ...previousAssignments,
            optimisticAssignment,
          ]);
        }
      }

      return { previousAssignments, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousAssignments && context.workspaceSlug) {
        queryClient.setQueryData(
          queryKeys.sprints.memberProjects(context.workspaceSlug),
          context.previousAssignments
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sprints.memberProjects(workspaceSlug) });
      // Invalidate ALL project sprint queries for this workspace since visibility may have changed
      // Using partial match on ["sprints", workspaceSlug] to catch all projects
      void queryClient.invalidateQueries({ queryKey: ["sprints", workspaceSlug] });
    },
  });
}

interface DeleteSprintMemberProjectParams {
  workspaceSlug: string;
  sprintId: string;
  memberId: string;
}

/**
 * Hook to delete a sprint-member-project assignment.
 * This removes a sprint from a project's sprint view.
 *
 * @example
 * const { mutate: deleteAssignment, isPending } = useDeleteSprintMemberProject();
 * deleteAssignment({ workspaceSlug, sprintId, memberId });
 */
export function useDeleteSprintMemberProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, sprintId, memberId }: DeleteSprintMemberProjectParams) =>
      sprintService.deleteSprintMemberProject(workspaceSlug, sprintId, memberId),
    onMutate: async ({ workspaceSlug, sprintId, memberId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.sprints.memberProjects(workspaceSlug) });

      const previousAssignments = queryClient.getQueryData<TSprintMemberProject[]>(
        queryKeys.sprints.memberProjects(workspaceSlug)
      );

      // Optimistic update - remove the assignment
      if (previousAssignments) {
        queryClient.setQueryData(
          queryKeys.sprints.memberProjects(workspaceSlug),
          previousAssignments.filter((a) => !(a.sprint === sprintId && a.member === memberId))
        );
      }

      return { previousAssignments, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousAssignments && context.workspaceSlug) {
        queryClient.setQueryData(
          queryKeys.sprints.memberProjects(context.workspaceSlug),
          context.previousAssignments
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sprints.memberProjects(workspaceSlug) });
      // Also invalidate all project sprints since visibility may have changed
      void queryClient.invalidateQueries({ queryKey: ["sprints", workspaceSlug] });
    },
  });
}

/**
 * Get assignment for a specific member and sprint from assignments array.
 *
 * @example
 * const { data: assignments } = useSprintMemberProjects(workspaceSlug);
 * const projectId = getSprintMemberProjectAssignment(assignments, memberId, sprintId);
 */
export function getSprintMemberProjectAssignment(
  assignments: TSprintMemberProject[] | undefined,
  memberId: string,
  sprintId: string
): string | undefined {
  if (!assignments) return undefined;
  const assignment = assignments.find((a) => a.member === memberId && a.sprint === sprintId);
  return assignment?.project;
}

// Sprint Materialization

interface MaterializeSprintParams {
  workspaceSlug: string;
  sprintNumber: number;
}

/**
 * Hook to materialize a virtual sprint by creating it in the database.
 * Virtual sprints are calculated on the frontend but don't exist until they're needed.
 * Returns the created sprint with its UUID.
 *
 * @example
 * const { mutateAsync: materializeSprint, isPending } = useMaterializeSprint();
 * const sprint = await materializeSprint({ workspaceSlug, sprintNumber: 15 });
 * // Now use sprint.id for assignment
 */
export function useMaterializeSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, sprintNumber }: MaterializeSprintParams) =>
      sprintService.materializeSprint(workspaceSlug, sprintNumber),
    onSuccess: (_data, { workspaceSlug }) => {
      // Invalidate workspace sprints to include the newly materialized sprint
      void queryClient.invalidateQueries({
        queryKey: ["sprints", workspaceSlug],
      });
    },
  });
}

// Sprint Member Removal and Issue Management

/**
 * Hook to fetch removal impact when removing a team member from a sprint-project.
 * Determines if this is the last member and how many issues would be orphaned.
 *
 * TODO: Backend endpoint not yet implemented. This is a stub that returns empty data.
 * Backend should implement: GET /api/workspaces/{workspace}/sprint-member-projects/{assignment_id}/removal-impact/
 *
 * @example
 * const { data: impact, isLoading } = useRemovalImpact(workspaceSlug, assignmentId, isOpen);
 */
export function useRemovalImpact(
  workspaceSlug: string,
  assignmentId: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["sprint-removal-impact", workspaceSlug, assignmentId],
    queryFn: async (): Promise<TRemovalImpact> => {
      // TODO: Replace with actual API call when backend endpoint is implemented
      // return sprintService.getRemovalImpact(workspaceSlug, assignmentId);

      // Stub implementation - always returns no impact
      return {
        is_last_member: false,
        orphaned_issue_count: 0,
        next_sprint: null,
      };
    },
    enabled: !!workspaceSlug && !!assignmentId && enabled,
    staleTime: 0, // Always fetch fresh since this is checking current state
  });
}

interface BulkMoveIssuesParams {
  workspaceSlug: string;
  sprintId: string;
  data: TBulkMoveIssuesPayload;
}

/**
 * Hook to bulk move issues from one sprint to another (or to backlog).
 * Used when removing the last team member from a sprint-project to handle orphaned issues.
 *
 * TODO: Backend endpoint not yet implemented. This is a stub that does nothing.
 * Backend should implement: POST /api/workspaces/{workspace}/sprints/{sprint_id}/bulk-move-issues/
 *
 * @example
 * const { mutateAsync: bulkMove, isPending } = useBulkMoveIssues(workspaceSlug);
 * await bulkMove({ sprintId, data: { issue_ids: "all", target_sprint_id: null, project_id } });
 */
export function useBulkMoveIssues(workspaceSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sprintId: _sprintId, data: _data }: Omit<BulkMoveIssuesParams, "workspaceSlug">) => {
      // TODO: Replace with actual API call when backend endpoint is implemented
      // return sprintService.bulkMoveIssues(workspaceSlug, sprintId, data);

      // Stub implementation - does nothing but resolves successfully
      return Promise.resolve({ moved_count: 0 });
    },
    onSuccess: () => {
      // Invalidate sprint and issue queries after bulk move
      void queryClient.invalidateQueries({ queryKey: ["sprints", workspaceSlug] });
      void queryClient.invalidateQueries({ queryKey: ["issues"] });
    },
  });
}
