"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TProjectPublishSettings } from "@plane/types";
import { ProjectPublishService } from "@/services/project";
import { queryKeys } from "./query-keys";

// Service instance
const projectPublishService = new ProjectPublishService();

/**
 * Hook to fetch project publish settings.
 * Replaces MobX ProjectPublishStore.fetchPublishSettings for read operations.
 *
 * @example
 * const { data: settings, isLoading } = useProjectPublishSettings(workspaceSlug, projectId);
 */
export function useProjectPublishSettings(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: queryKeys.projectPublish.settings(projectId),
    queryFn: () => projectPublishService.fetchPublishSettings(workspaceSlug, projectId),
    enabled: !!workspaceSlug && !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 404 - project is not published
      if (error?.status === 404) return false;
      return failureCount < 3;
    },
  });
}

interface PublishProjectParams {
  workspaceSlug: string;
  projectId: string;
  data: Partial<TProjectPublishSettings>;
}

/**
 * Hook to publish a project with optimistic updates.
 * Replaces MobX ProjectPublishStore.publishProject for write operations.
 *
 * @example
 * const { mutate: publishProject, isPending } = usePublishProject();
 * publishProject({ workspaceSlug, projectId, data: { views: ["kanban"] } });
 */
export function usePublishProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, data }: PublishProjectParams) =>
      projectPublishService.publishProject(workspaceSlug, projectId, data),
    onMutate: async ({ projectId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projectPublish.settings(projectId) });

      const previousSettings = queryClient.getQueryData<TProjectPublishSettings>(
        queryKeys.projectPublish.settings(projectId)
      );

      // Optimistic update
      if (data) {
        queryClient.setQueryData<TProjectPublishSettings>(queryKeys.projectPublish.settings(projectId), (old) => ({
          ...(old || {}),
          ...data,
        }) as TProjectPublishSettings);
      }

      return { previousSettings, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousSettings && context.projectId) {
        queryClient.setQueryData(queryKeys.projectPublish.settings(context.projectId), context.previousSettings);
      }
    },
    onSuccess: (response, { projectId, workspaceSlug }) => {
      // Update the settings cache with server response
      queryClient.setQueryData(queryKeys.projectPublish.settings(projectId), response);

      // Update project anchor in projects cache if available
      const projects = queryClient.getQueryData<any[]>(queryKeys.projects.all(workspaceSlug));
      if (projects && response.anchor) {
        queryClient.setQueryData(
          queryKeys.projects.all(workspaceSlug),
          projects.map((proj) => (proj.id === projectId ? { ...proj, anchor: response.anchor } : proj))
        );
      }

      // Update project detail anchor if available
      const projectDetail = queryClient.getQueryData<any>(queryKeys.projects.detail(projectId));
      if (projectDetail && response.anchor) {
        queryClient.setQueryData(queryKeys.projects.detail(projectId), {
          ...projectDetail,
          anchor: response.anchor,
        });
      }
    },
    onSettled: (_data, _error, { projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projectPublish.settings(projectId) });
    },
  });
}

interface UpdatePublishSettingsParams {
  workspaceSlug: string;
  projectId: string;
  projectPublishId: string;
  data: Partial<TProjectPublishSettings>;
}

/**
 * Hook to update project publish settings with optimistic updates.
 * Replaces MobX ProjectPublishStore.updatePublishSettings for write operations.
 *
 * @example
 * const { mutate: updateSettings, isPending } = useUpdatePublishSettings();
 * updateSettings({ workspaceSlug, projectId, projectPublishId, data: { views: ["list"] } });
 */
export function useUpdatePublishSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, projectPublishId, data }: UpdatePublishSettingsParams) =>
      projectPublishService.updatePublishSettings(workspaceSlug, projectId, projectPublishId, data),
    onMutate: async ({ projectId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projectPublish.settings(projectId) });

      const previousSettings = queryClient.getQueryData<TProjectPublishSettings>(
        queryKeys.projectPublish.settings(projectId)
      );

      // Optimistic update
      if (previousSettings) {
        queryClient.setQueryData<TProjectPublishSettings>(queryKeys.projectPublish.settings(projectId), {
          ...previousSettings,
          ...data,
        });
      }

      return { previousSettings, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousSettings && context.projectId) {
        queryClient.setQueryData(queryKeys.projectPublish.settings(context.projectId), context.previousSettings);
      }
    },
    onSuccess: (response, { projectId }) => {
      queryClient.setQueryData(queryKeys.projectPublish.settings(projectId), response);
    },
    onSettled: (_data, _error, { projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projectPublish.settings(projectId) });
    },
  });
}

interface UnpublishProjectParams {
  workspaceSlug: string;
  projectId: string;
  projectPublishId: string;
}

/**
 * Hook to unpublish a project with optimistic updates.
 * Replaces MobX ProjectPublishStore.unPublishProject for write operations.
 *
 * @example
 * const { mutate: unpublishProject, isPending } = useUnpublishProject();
 * unpublishProject({ workspaceSlug, projectId, projectPublishId });
 */
export function useUnpublishProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, projectPublishId }: UnpublishProjectParams) =>
      projectPublishService.unpublishProject(workspaceSlug, projectId, projectPublishId),
    onMutate: async ({ projectId, workspaceSlug }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projectPublish.settings(projectId) });

      const previousSettings = queryClient.getQueryData<TProjectPublishSettings>(
        queryKeys.projectPublish.settings(projectId)
      );

      // Optimistically remove settings
      queryClient.setQueryData(queryKeys.projectPublish.settings(projectId), undefined);

      // Update project anchor in projects cache if available
      const projects = queryClient.getQueryData<any[]>(queryKeys.projects.all(workspaceSlug));
      if (projects) {
        queryClient.setQueryData(
          queryKeys.projects.all(workspaceSlug),
          projects.map((proj) => (proj.id === projectId ? { ...proj, anchor: null } : proj))
        );
      }

      // Update project detail anchor if available
      const projectDetail = queryClient.getQueryData<any>(queryKeys.projects.detail(projectId));
      if (projectDetail) {
        queryClient.setQueryData(queryKeys.projects.detail(projectId), {
          ...projectDetail,
          anchor: null,
        });
      }

      return { previousSettings, projectId, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousSettings && context.projectId) {
        queryClient.setQueryData(queryKeys.projectPublish.settings(context.projectId), context.previousSettings);
      }
    },
    onSettled: (_data, _error, { projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projectPublish.settings(projectId) });
    },
  });
}

/**
 * Get publish settings by project ID from cache.
 * Utility function to access cached data.
 *
 * @example
 * const settings = getPublishSettingsByProjectId(queryClient, projectId);
 */
export function getPublishSettingsByProjectId(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string
): TProjectPublishSettings | undefined {
  return queryClient.getQueryData<TProjectPublishSettings>(queryKeys.projectPublish.settings(projectId));
}
