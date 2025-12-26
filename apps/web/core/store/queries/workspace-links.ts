"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TLink } from "@plane/types";
import { WorkspaceService } from "@/plane-web/services";
import { queryKeys } from "./query-keys";

// Service instance
const workspaceService = new WorkspaceService();

/**
 * Hook to fetch all workspace links (home quick links).
 * Replaces MobX WorkspaceLinkStore.fetchLinks for read operations.
 *
 * @example
 * const { data: links, isLoading } = useWorkspaceLinks(workspaceSlug);
 */
export function useWorkspaceLinks(workspaceSlug: string) {
  return useQuery({
    queryKey: queryKeys.workspaceLinks.all(workspaceSlug),
    queryFn: () => workspaceService.fetchWorkspaceLinks(workspaceSlug),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch workspace link details by ID.
 *
 * @example
 * const { data: link, isLoading } = useWorkspaceLinkDetails(workspaceSlug, linkId);
 */
export function useWorkspaceLinkDetails(workspaceSlug: string, linkId: string) {
  return useQuery({
    queryKey: queryKeys.workspaceLinks.detail(linkId),
    queryFn: async () => {
      const links = await workspaceService.fetchWorkspaceLinks(workspaceSlug);
      return links.find((link) => link.id === linkId);
    },
    enabled: !!workspaceSlug && !!linkId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export interface CreateWorkspaceLinkParams {
  workspaceSlug: string;
  data: Partial<TLink>;
}

/**
 * Hook to create a new workspace link with optimistic updates.
 * Replaces MobX WorkspaceLinkStore.createLink for write operations.
 *
 * @example
 * const { mutate: createLink, isPending } = useCreateWorkspaceLink();
 * createLink({ workspaceSlug, data: { title: "My Link", url: "https://example.com" } });
 */
export function useCreateWorkspaceLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, data }: CreateWorkspaceLinkParams) =>
      workspaceService.createWorkspaceLink(workspaceSlug, data),
    onMutate: async ({ workspaceSlug, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.workspaceLinks.all(workspaceSlug) });

      const previousLinks = queryClient.getQueryData<TLink[]>(queryKeys.workspaceLinks.all(workspaceSlug));

      // Optimistic update with temporary ID
      if (previousLinks) {
        const optimisticLink: TLink = {
          id: `temp-${Date.now()}`,
          title: data.title ?? "",
          url: data.url ?? "",
          metadata: null,
          created_at: new Date(),
          created_by_id: "",
          workspace_slug: workspaceSlug,
        };
        queryClient.setQueryData<TLink[]>(queryKeys.workspaceLinks.all(workspaceSlug), [
          optimisticLink,
          ...previousLinks,
        ]);
      }

      return { previousLinks, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousLinks && context.workspaceSlug) {
        queryClient.setQueryData(queryKeys.workspaceLinks.all(context.workspaceSlug), context.previousLinks);
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceLinks.all(workspaceSlug) });
    },
  });
}

export interface UpdateWorkspaceLinkParams {
  workspaceSlug: string;
  linkId: string;
  data: Partial<TLink>;
}

/**
 * Hook to update a workspace link with optimistic updates.
 * Replaces MobX WorkspaceLinkStore.updateLink for write operations.
 *
 * @example
 * const { mutate: updateLink, isPending } = useUpdateWorkspaceLink();
 * updateLink({ workspaceSlug, linkId, data: { title: "Updated Title" } });
 */
export function useUpdateWorkspaceLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, linkId, data }: UpdateWorkspaceLinkParams) =>
      workspaceService.updateWorkspaceLink(workspaceSlug, linkId, data),
    onMutate: async ({ workspaceSlug, linkId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.workspaceLinks.all(workspaceSlug) });
      await queryClient.cancelQueries({ queryKey: queryKeys.workspaceLinks.detail(linkId) });

      const previousLinks = queryClient.getQueryData<TLink[]>(queryKeys.workspaceLinks.all(workspaceSlug));
      const previousLinkDetail = queryClient.getQueryData<TLink>(queryKeys.workspaceLinks.detail(linkId));

      if (previousLinks) {
        queryClient.setQueryData<TLink[]>(
          queryKeys.workspaceLinks.all(workspaceSlug),
          previousLinks.map((link) => (link.id === linkId ? { ...link, ...data } : link))
        );
      }

      if (previousLinkDetail) {
        queryClient.setQueryData<TLink>(queryKeys.workspaceLinks.detail(linkId), {
          ...previousLinkDetail,
          ...data,
        });
      }

      return { previousLinks, previousLinkDetail, workspaceSlug, linkId };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        if (context.previousLinks) {
          queryClient.setQueryData(queryKeys.workspaceLinks.all(context.workspaceSlug), context.previousLinks);
        }
        if (context.previousLinkDetail) {
          queryClient.setQueryData(queryKeys.workspaceLinks.detail(context.linkId), context.previousLinkDetail);
        }
      }
    },
    onSettled: (_data, _error, { workspaceSlug, linkId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceLinks.all(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceLinks.detail(linkId) });
    },
  });
}

export interface DeleteWorkspaceLinkParams {
  workspaceSlug: string;
  linkId: string;
}

/**
 * Hook to delete a workspace link with optimistic updates.
 * Replaces MobX WorkspaceLinkStore.removeLink for write operations.
 *
 * @example
 * const { mutate: deleteLink, isPending } = useDeleteWorkspaceLink();
 * deleteLink({ workspaceSlug, linkId });
 */
export function useDeleteWorkspaceLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, linkId }: DeleteWorkspaceLinkParams) =>
      workspaceService.deleteWorkspaceLink(workspaceSlug, linkId),
    onMutate: async ({ workspaceSlug, linkId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.workspaceLinks.all(workspaceSlug) });

      const previousLinks = queryClient.getQueryData<TLink[]>(queryKeys.workspaceLinks.all(workspaceSlug));

      if (previousLinks) {
        queryClient.setQueryData<TLink[]>(
          queryKeys.workspaceLinks.all(workspaceSlug),
          previousLinks.filter((link) => link.id !== linkId)
        );
      }

      return { previousLinks, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousLinks && context.workspaceSlug) {
        queryClient.setQueryData(queryKeys.workspaceLinks.all(context.workspaceSlug), context.previousLinks);
      }
    },
    onSettled: (_data, _error, { workspaceSlug, linkId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceLinks.all(workspaceSlug) });
      void queryClient.removeQueries({ queryKey: queryKeys.workspaceLinks.detail(linkId) });
    },
  });
}

// Utility functions for derived data

/**
 * Get workspace link by ID from links array.
 *
 * @example
 * const { data: links } = useWorkspaceLinks(workspaceSlug);
 * const link = getWorkspaceLinkById(links, linkId);
 */
export function getWorkspaceLinkById(
  links: TLink[] | undefined,
  linkId: string | null | undefined
): TLink | undefined {
  if (!links || !linkId) return undefined;
  return links.find((link) => link.id === linkId);
}
