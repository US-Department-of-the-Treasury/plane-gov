"use client";

import { useParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TProject } from "@/plane-web/types/projects";
import { ProjectService } from "@/services/project/project.service";
import { queryKeys } from "@/store/queries/query-keys";

/**
 * Project hooks using TanStack Query.
 * Replaces MobX ProjectStore with individual query hooks.
 *
 * Migration from MobX:
 * - Instead of: const projectStore = useProject()
 * - Use individual hooks like: const { data: projects } = useProjects(workspaceSlug)
 *
 * Re-exports all project-related hooks from the queries layer.
 */
export {
  usePartialProjects,
  useProjects,
  useProjectDetails,
  useProjectAnalyticsCount,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useArchiveProject,
  useRestoreProject,
  useUpdateProjectView,
  useCheckProjectIdentifier,
  getProjectById as getProjectByIdUtil,
  getProjectByIdentifier,
  getProjectIds,
  getActiveProjects,
  getArchivedProjects,
  getJoinedProjects,
  getJoinedProjectIds,
  getFavoriteProjects,
  getProjectsMap,
  getProjectIdentifiersMap,
} from "@/store/queries/project";

import {
  useProjects,
  useProjectDetails,
  getProjectById as getProjectByIdUtil,
  getProjectIds,
} from "@/store/queries/project";

// Service instance
const projectService = new ProjectService();

/**
 * Hook to add a project to favorites with optimistic updates.
 *
 * @example
 * const { mutate: addToFavorites } = useAddProjectToFavorites();
 * addToFavorites({ workspaceSlug, projectId });
 */
export function useAddProjectToFavorites() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId }: { workspaceSlug: string; projectId: string }) =>
      projectService.addProjectToFavorites(workspaceSlug, projectId),
    onMutate: async ({ workspaceSlug, projectId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.all(workspaceSlug) });

      const previousProjects = queryClient.getQueryData<TProject[]>(queryKeys.projects.all(workspaceSlug));

      if (previousProjects) {
        queryClient.setQueryData<TProject[]>(
          queryKeys.projects.all(workspaceSlug),
          previousProjects.map((proj) => (proj.id === projectId ? { ...proj, is_favorite: true } : proj))
        );
      }

      return { previousProjects, workspaceSlug, projectId };
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
 * Backward-compatible hook that mimics the old MobX ProjectStore API.
 * Uses TanStack Query hooks internally but provides the same interface.
 *
 * @deprecated Prefer using individual hooks (useProjects, useProjectDetails) directly.
 * This hook exists for backward compatibility during migration.
 *
 * @example
 * const { currentProjectDetails, getProjectById, workspaceProjectIds } = useProject();
 */
export function useProject() {
  const params = useParams<{ workspaceSlug?: string; projectId?: string }>();
  const workspaceSlug = params?.workspaceSlug ?? "";
  const projectId = params?.projectId ?? "";

  // Fetch projects and project details using TanStack Query hooks
  const { data: projects } = useProjects(workspaceSlug);
  const { data: currentProjectDetails } = useProjectDetails(workspaceSlug, projectId);
  const { mutateAsync: addToFavoritesAsync } = useAddProjectToFavorites();

  // Helper functions matching the old MobX API
  const getPartialProjectById = (id: string | null | undefined) => {
    return getProjectByIdUtil(projects, id);
  };

  const getProjectById = (id: string | null | undefined) => {
    return getProjectByIdUtil(projects, id);
  };

  const workspaceProjectIds = getProjectIds(projects);

  const addProjectToFavorites = async (wsSlug: string, projId: string) => {
    return addToFavoritesAsync({ workspaceSlug: wsSlug, projectId: projId });
  };

  return {
    currentProjectDetails,
    getPartialProjectById,
    getProjectById,
    workspaceProjectIds,
    addProjectToFavorites,
  };
}
