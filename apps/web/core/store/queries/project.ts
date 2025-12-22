"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TProjectAnalyticsCountParams } from "@plane/types";
import type { TProject } from "@/plane-web/types/projects";
import { ProjectService } from "@/services/project/project.service";
import { ProjectArchiveService } from "@/services/project/project-archive.service";
import { queryKeys } from "./query-keys";

// Service instances
const projectService = new ProjectService();
const projectArchiveService = new ProjectArchiveService();

/**
 * Hook to fetch partial/lite project data for a workspace.
 * Replaces MobX ProjectStore.fetchPartialProjects for read operations.
 *
 * @example
 * const { data: projects, isLoading } = usePartialProjects(workspaceSlug);
 */
export function usePartialProjects(workspaceSlug: string) {
  return useQuery({
    queryKey: queryKeys.projects.lite(workspaceSlug),
    queryFn: () => projectService.getProjectsLite(workspaceSlug),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch all projects for a workspace.
 * Replaces MobX ProjectStore.fetchProjects for read operations.
 *
 * @example
 * const { data: projects, isLoading } = useProjects(workspaceSlug);
 */
export function useProjects(workspaceSlug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.all(workspaceSlug ?? ""),
    queryFn: () => projectService.getProjects(workspaceSlug!),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch project details by ID.
 * Replaces MobX ProjectStore.fetchProjectDetails for read operations.
 *
 * @example
 * const { data: project, isLoading } = useProjectDetails(workspaceSlug, projectId);
 */
export function useProjectDetails(workspaceSlug: string | undefined, projectId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.detail(projectId ?? ""),
    queryFn: () => projectService.getProject(workspaceSlug!, projectId!),
    enabled: !!workspaceSlug && !!projectId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch project analytics count for a workspace.
 * Replaces MobX ProjectStore.fetchProjectAnalyticsCount for read operations.
 *
 * @example
 * const { data: analytics, isLoading } = useProjectAnalyticsCount(workspaceSlug);
 * const { data: analytics } = useProjectAnalyticsCount(workspaceSlug, { project_ids: "id1,id2" });
 */
export function useProjectAnalyticsCount(workspaceSlug: string, params?: TProjectAnalyticsCountParams) {
  return useQuery({
    queryKey: [...queryKeys.projects.analytics(workspaceSlug), params],
    queryFn: () => projectService.getProjectAnalyticsCount(workspaceSlug, params),
    enabled: !!workspaceSlug,
    staleTime: 2 * 60 * 1000, // Analytics refresh more frequently
    gcTime: 30 * 60 * 1000,
  });
}

interface CreateProjectParams {
  workspaceSlug: string;
  data: Partial<TProject>;
}

/**
 * Hook to create a new project with optimistic updates.
 * Replaces MobX ProjectStore.createProject for write operations.
 *
 * @example
 * const { mutate: createProject, isPending } = useCreateProject();
 * createProject({ workspaceSlug, data: { name: "Project Name", identifier: "PRJ" } });
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, data }: CreateProjectParams) => projectService.createProject(workspaceSlug, data),
    onMutate: async ({ workspaceSlug, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.all(workspaceSlug) });

      const previousProjects = queryClient.getQueryData<TProject[]>(queryKeys.projects.all(workspaceSlug));

      // Optimistic update with temporary ID
      if (previousProjects) {
        const optimisticProject: TProject = {
          id: `temp-${Date.now()}`,
          name: data.name ?? "",
          identifier: data.identifier ?? "",
          description: data.description ?? "",
          workspace: "",
          network: data.network ?? 2,
          logo_props: data.logo_props ?? { in_use: "emoji" },
          cover_image: data.cover_image ?? undefined,
          is_favorite: false,
          member_role: data.member_role ?? null,
          archived_at: null,
          sort_order: previousProjects.length + 1,
          sprint_view: true,
          issue_views_view: true,
          epic_view: true,
          page_view: true,
          inbox_view: false,
        };
        queryClient.setQueryData<TProject[]>(queryKeys.projects.all(workspaceSlug), [
          ...previousProjects,
          optimisticProject,
        ]);
      }

      return { previousProjects, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousProjects && context.workspaceSlug) {
        queryClient.setQueryData(queryKeys.projects.all(context.workspaceSlug), context.previousProjects);
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.lite(workspaceSlug) });
    },
  });
}

interface UpdateProjectParams {
  workspaceSlug: string;
  projectId: string;
  data: Partial<TProject>;
}

/**
 * Hook to update a project with optimistic updates.
 * Replaces MobX ProjectStore.updateProject for write operations.
 *
 * @example
 * const { mutate: updateProject, isPending } = useUpdateProject();
 * updateProject({ workspaceSlug, projectId, data: { name: "Updated Name" } });
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, data }: UpdateProjectParams) =>
      projectService.updateProject(workspaceSlug, projectId, data),
    onMutate: async ({ workspaceSlug, projectId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.all(workspaceSlug) });
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.detail(projectId) });

      const previousProjects = queryClient.getQueryData<TProject[]>(queryKeys.projects.all(workspaceSlug));
      const previousProjectDetail = queryClient.getQueryData<TProject>(queryKeys.projects.detail(projectId));

      if (previousProjects) {
        queryClient.setQueryData<TProject[]>(
          queryKeys.projects.all(workspaceSlug),
          previousProjects.map((proj) => (proj.id === projectId ? { ...proj, ...data } : proj))
        );
      }

      if (previousProjectDetail) {
        queryClient.setQueryData<TProject>(queryKeys.projects.detail(projectId), {
          ...previousProjectDetail,
          ...data,
        });
      }

      return { previousProjects, previousProjectDetail, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        if (context.previousProjects) {
          queryClient.setQueryData(queryKeys.projects.all(context.workspaceSlug), context.previousProjects);
        }
        if (context.previousProjectDetail) {
          queryClient.setQueryData(queryKeys.projects.detail(context.projectId), context.previousProjectDetail);
        }
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.lite(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

interface DeleteProjectParams {
  workspaceSlug: string;
  projectId: string;
}

/**
 * Hook to delete a project with optimistic updates.
 * Replaces MobX ProjectStore.deleteProject for write operations.
 *
 * @example
 * const { mutate: deleteProject, isPending } = useDeleteProject();
 * deleteProject({ workspaceSlug, projectId });
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId }: DeleteProjectParams) =>
      projectService.deleteProject(workspaceSlug, projectId),
    onMutate: async ({ workspaceSlug, projectId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.all(workspaceSlug) });

      const previousProjects = queryClient.getQueryData<TProject[]>(queryKeys.projects.all(workspaceSlug));

      if (previousProjects) {
        queryClient.setQueryData<TProject[]>(
          queryKeys.projects.all(workspaceSlug),
          previousProjects.filter((proj) => proj.id !== projectId)
        );
      }

      return { previousProjects, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousProjects && context.workspaceSlug) {
        queryClient.setQueryData(queryKeys.projects.all(context.workspaceSlug), context.previousProjects);
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.lite(workspaceSlug) });
      void queryClient.removeQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

interface ArchiveProjectParams {
  workspaceSlug: string;
  projectId: string;
}

/**
 * Hook to archive a project with optimistic updates.
 * Replaces MobX ProjectStore.archiveProject for write operations.
 *
 * @example
 * const { mutate: archiveProject, isPending } = useArchiveProject();
 * archiveProject({ workspaceSlug, projectId });
 */
export function useArchiveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId }: ArchiveProjectParams) =>
      projectArchiveService.archiveProject(workspaceSlug, projectId),
    onMutate: async ({ workspaceSlug, projectId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.all(workspaceSlug) });

      const previousProjects = queryClient.getQueryData<TProject[]>(queryKeys.projects.all(workspaceSlug));

      if (previousProjects) {
        queryClient.setQueryData<TProject[]>(
          queryKeys.projects.all(workspaceSlug),
          previousProjects.map((proj) =>
            proj.id === projectId ? { ...proj, archived_at: new Date().toISOString() } : proj
          )
        );
      }

      return { previousProjects, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousProjects && context.workspaceSlug) {
        queryClient.setQueryData(queryKeys.projects.all(context.workspaceSlug), context.previousProjects);
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.lite(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

/**
 * Hook to restore an archived project with optimistic updates.
 * Replaces MobX ProjectStore.restoreProject for write operations.
 *
 * @example
 * const { mutate: restoreProject, isPending } = useRestoreProject();
 * restoreProject({ workspaceSlug, projectId });
 */
export function useRestoreProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId }: ArchiveProjectParams) =>
      projectArchiveService.restoreProject(workspaceSlug, projectId),
    onMutate: async ({ workspaceSlug, projectId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.all(workspaceSlug) });

      const previousProjects = queryClient.getQueryData<TProject[]>(queryKeys.projects.all(workspaceSlug));

      if (previousProjects) {
        queryClient.setQueryData<TProject[]>(
          queryKeys.projects.all(workspaceSlug),
          previousProjects.map((proj) => (proj.id === projectId ? { ...proj, archived_at: null } : proj))
        );
      }

      return { previousProjects, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousProjects && context.workspaceSlug) {
        queryClient.setQueryData(queryKeys.projects.all(context.workspaceSlug), context.previousProjects);
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.lite(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

interface UpdateProjectViewParams {
  workspaceSlug: string;
  projectId: string;
  data: { sort_order: number };
}

/**
 * Hook to update project view settings (like sort order) with optimistic updates.
 * Replaces MobX ProjectStore.updateProjectView for write operations.
 *
 * @example
 * const { mutate: updateProjectView, isPending } = useUpdateProjectView();
 * updateProjectView({ workspaceSlug, projectId, data: { sort_order: 1 } });
 */
export function useUpdateProjectView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, data }: UpdateProjectViewParams) =>
      projectService.setProjectView(workspaceSlug, projectId, data),
    onMutate: async ({ workspaceSlug, projectId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.all(workspaceSlug) });

      const previousProjects = queryClient.getQueryData<TProject[]>(queryKeys.projects.all(workspaceSlug));

      if (previousProjects) {
        queryClient.setQueryData<TProject[]>(
          queryKeys.projects.all(workspaceSlug),
          previousProjects.map((proj) => (proj.id === projectId ? { ...proj, sort_order: data.sort_order } : proj))
        );
      }

      return { previousProjects, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousProjects && context.workspaceSlug) {
        queryClient.setQueryData(queryKeys.projects.all(context.workspaceSlug), context.previousProjects);
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all(workspaceSlug) });
    },
  });
}

/**
 * Hook to check if a project identifier is available.
 *
 * @example
 * const { mutate: checkIdentifier, isPending } = useCheckProjectIdentifier();
 * checkIdentifier({ workspaceSlug, identifier: "PRJ" });
 */
export function useCheckProjectIdentifier() {
  return useMutation({
    mutationFn: ({ workspaceSlug, identifier }: { workspaceSlug: string; identifier: string }) =>
      projectService.checkProjectIdentifierAvailability(workspaceSlug, identifier),
  });
}

// ===========================
// UTILITY FUNCTIONS
// ===========================

/**
 * Get project by ID from projects array.
 *
 * @example
 * const { data: projects } = useProjects(workspaceSlug);
 * const project = getProjectById(projects, projectId);
 */
export function getProjectById(
  projects: TProject[] | undefined,
  projectId: string | null | undefined
): TProject | undefined {
  if (!projects || !projectId) return undefined;
  return projects.find((p) => p.id === projectId);
}

/**
 * Get project by identifier from projects array.
 *
 * @example
 * const { data: projects } = useProjects(workspaceSlug);
 * const project = getProjectByIdentifier(projects, "PRJ");
 */
export function getProjectByIdentifier(
  projects: TProject[] | undefined,
  identifier: string | null | undefined
): TProject | undefined {
  if (!projects || !identifier) return undefined;
  return projects.find((p) => p.identifier === identifier);
}

/**
 * Get project IDs from projects array.
 *
 * @example
 * const { data: projects } = useProjects(workspaceSlug);
 * const projectIds = getProjectIds(projects);
 */
export function getProjectIds(projects: TProject[] | undefined): string[] {
  if (!projects) return [];
  return projects.map((p) => p.id);
}

/**
 * Get active (non-archived) projects.
 *
 * @example
 * const { data: projects } = useProjects(workspaceSlug);
 * const activeProjects = getActiveProjects(projects);
 */
export function getActiveProjects(projects: TProject[] | undefined): TProject[] {
  if (!projects) return [];
  return projects.filter((p) => !p.archived_at);
}

/**
 * Get archived projects.
 *
 * @example
 * const { data: projects } = useProjects(workspaceSlug);
 * const archivedProjects = getArchivedProjects(projects);
 */
export function getArchivedProjects(projects: TProject[] | undefined): TProject[] {
  if (!projects) return [];
  return projects.filter((p) => p.archived_at);
}

/**
 * Get joined projects (where member_role is not null).
 *
 * @example
 * const { data: projects } = useProjects(workspaceSlug);
 * const joinedProjects = getJoinedProjects(projects);
 */
export function getJoinedProjects(projects: TProject[] | undefined): TProject[] {
  if (!projects) return [];
  return projects.filter((p) => p.member_role !== null && !p.archived_at);
}

/**
 * Get joined project IDs.
 *
 * @example
 * const { data: projects } = useProjects(workspaceSlug);
 * const joinedProjectIds = getJoinedProjectIds(projects);
 */
export function getJoinedProjectIds(projects: TProject[] | undefined): string[] {
  return getJoinedProjects(projects).map((p) => p.id);
}

/**
 * Get favorite projects.
 *
 * @example
 * const { data: projects } = useProjects(workspaceSlug);
 * const favoriteProjects = getFavoriteProjects(projects);
 */
export function getFavoriteProjects(projects: TProject[] | undefined): TProject[] {
  if (!projects) return [];
  return projects.filter((p) => p.is_favorite && !p.archived_at);
}

/**
 * Get projects map keyed by project ID for fast lookups.
 *
 * @example
 * const { data: projects } = useProjects(workspaceSlug);
 * const projectMap = getProjectsMap(projects);
 * const project = projectMap.get(projectId);
 */
export function getProjectsMap(projects: TProject[] | undefined): Map<string, TProject> {
  const map = new Map<string, TProject>();
  if (!projects) return map;
  projects.forEach((p) => map.set(p.id, p));
  return map;
}

/**
 * Get project identifiers map keyed by project ID.
 *
 * @example
 * const { data: projects } = useProjects(workspaceSlug);
 * const identifiersMap = getProjectIdentifiersMap(projects);
 * const identifier = identifiersMap.get(projectId);
 */
export function getProjectIdentifiersMap(projects: TProject[] | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!projects) return map;
  projects.forEach((p) => map.set(p.id, p.identifier));
  return map;
}
