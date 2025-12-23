"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TPage, TDocumentPayload, TChangeHandlerProps, TLogoProps } from "@plane/types";
import { ProjectPageService } from "@/services/page";
import { queryKeys } from "./query-keys";

// Service instance
const projectPageService = new ProjectPageService();

/**
 * Hook to fetch all pages for a project.
 * Replaces MobX ProjectPageStore.fetchPagesList for read operations.
 *
 * @example
 * const { data: pages, isLoading } = useProjectPages(workspaceSlug, projectId);
 */
export function useProjectPages(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: queryKeys.pages.all(workspaceSlug, projectId),
    queryFn: () => projectPageService.fetchAll(workspaceSlug, projectId),
    enabled: !!workspaceSlug && !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes - pages don't change frequently
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch page details by ID.
 * Replaces MobX ProjectPageStore.fetchPageDetails for read operations.
 *
 * @example
 * const { data: page, isLoading } = usePageDetails(workspaceSlug, projectId, pageId, { trackVisit: true });
 */
export function usePageDetails(
  workspaceSlug: string,
  projectId: string,
  pageId: string,
  options?: { trackVisit?: boolean }
) {
  const { trackVisit = true } = options || {};
  return useQuery({
    queryKey: queryKeys.pages.detail(pageId),
    queryFn: () => projectPageService.fetchById(workspaceSlug, projectId, pageId, trackVisit),
    enabled: !!workspaceSlug && !!projectId && !!pageId,
    staleTime: 30 * 1000, // 30 seconds - page details may change
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch archived pages for a project.
 * Replaces MobX ProjectPageStore.fetchArchivedPages for read operations.
 *
 * @example
 * const { data: archivedPages, isLoading } = useArchivedPages(workspaceSlug, projectId);
 */
export function useArchivedPages(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: queryKeys.pages.archived(workspaceSlug, projectId),
    queryFn: () => projectPageService.fetchArchived(workspaceSlug, projectId),
    enabled: !!workspaceSlug && !!projectId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch favorite pages for a project.
 * Replaces MobX ProjectPageStore.fetchFavoritePages for read operations.
 *
 * @example
 * const { data: favoritePages, isLoading } = useFavoritePages(workspaceSlug, projectId);
 */
export function useFavoritePages(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: queryKeys.pages.favorites(workspaceSlug, projectId),
    queryFn: () => projectPageService.fetchFavorites(workspaceSlug, projectId),
    enabled: !!workspaceSlug && !!projectId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export interface CreatePageParams {
  workspaceSlug: string;
  projectId: string;
  data: Partial<TPage>;
}

/**
 * Hook to create a new page with optimistic updates.
 * Replaces MobX ProjectPageStore.createPage for write operations.
 *
 * @example
 * const { mutate: createPage, isPending } = useCreatePage();
 * createPage({ workspaceSlug, projectId, data: { name: "New Page" } });
 */
export function useCreatePage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, data }: CreatePageParams) =>
      projectPageService.create(workspaceSlug, projectId, data),
    onMutate: async ({ workspaceSlug, projectId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.pages.all(workspaceSlug, projectId) });

      const previousPages = queryClient.getQueryData<TPage[]>(queryKeys.pages.all(workspaceSlug, projectId));

      // Optimistic update with temporary ID
      if (previousPages) {
        const optimisticPage: TPage = {
          id: `temp-${Date.now()}`,
          name: data.name ?? "Untitled",
          description: data.description ?? undefined,
          description_html: data.description_html ?? undefined,
          color: data.color ?? undefined,
          label_ids: data.label_ids ?? undefined,
          owned_by: "",
          access: data.access ?? 0,
          logo_props: data.logo_props ?? undefined,
          is_favorite: false,
          is_locked: false,
          archived_at: null,
          workspace: "",
          project_ids: [projectId],
          created_by: "",
          updated_by: "",
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: undefined,
        };
        queryClient.setQueryData<TPage[]>(queryKeys.pages.all(workspaceSlug, projectId), [
          ...previousPages,
          optimisticPage,
        ]);
      }

      return { previousPages, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousPages && context.workspaceSlug && context.projectId) {
        queryClient.setQueryData(queryKeys.pages.all(context.workspaceSlug, context.projectId), context.previousPages);
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.pages.all(workspaceSlug, projectId) });
    },
  });
}

export interface UpdatePageParams {
  workspaceSlug: string;
  projectId: string;
  pageId: string;
  data: Partial<TPage>;
}

/**
 * Hook to update a page with optimistic updates.
 * Replaces MobX BasePage.update for write operations.
 *
 * @example
 * const { mutate: updatePage, isPending } = useUpdatePage();
 * updatePage({ workspaceSlug, projectId, pageId, data: { name: "Updated Name" } });
 */
export function useUpdatePage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, pageId, data }: UpdatePageParams) =>
      projectPageService.update(workspaceSlug, projectId, pageId, data),
    onMutate: async ({ workspaceSlug, projectId, pageId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.pages.all(workspaceSlug, projectId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.pages.detail(pageId) });

      const previousPages = queryClient.getQueryData<TPage[]>(queryKeys.pages.all(workspaceSlug, projectId));
      const previousPageDetail = queryClient.getQueryData<TPage>(queryKeys.pages.detail(pageId));

      if (previousPages) {
        queryClient.setQueryData<TPage[]>(
          queryKeys.pages.all(workspaceSlug, projectId),
          previousPages.map((page) => (page.id === pageId ? { ...page, ...data } : page))
        );
      }

      if (previousPageDetail) {
        queryClient.setQueryData<TPage>(queryKeys.pages.detail(pageId), {
          ...previousPageDetail,
          ...data,
        });
      }

      return { previousPages, previousPageDetail, workspaceSlug, projectId, pageId };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        if (context.previousPages) {
          queryClient.setQueryData(
            queryKeys.pages.all(context.workspaceSlug, context.projectId),
            context.previousPages
          );
        }
        if (context.previousPageDetail) {
          queryClient.setQueryData(queryKeys.pages.detail(context.pageId), context.previousPageDetail);
        }
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId, pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.pages.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.pages.detail(pageId) });
    },
  });
}

export interface UpdatePageDescriptionParams {
  workspaceSlug: string;
  projectId: string;
  pageId: string;
  document: TDocumentPayload;
}

/**
 * Hook to update page description with optimistic updates.
 * Replaces MobX BasePage.updateDescription for write operations.
 *
 * @example
 * const { mutate: updateDescription, isPending } = useUpdatePageDescription();
 * updateDescription({ workspaceSlug, projectId, pageId, document });
 */
export function useUpdatePageDescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, pageId, document }: UpdatePageDescriptionParams) =>
      projectPageService.updateDescription(workspaceSlug, projectId, pageId, document),
    onMutate: async ({ workspaceSlug, projectId, pageId, document }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.pages.detail(pageId) });

      const previousPageDetail = queryClient.getQueryData<TPage>(queryKeys.pages.detail(pageId));

      if (previousPageDetail) {
        queryClient.setQueryData<TPage>(queryKeys.pages.detail(pageId), {
          ...previousPageDetail,
          description_html: document.description_html,
        });
      }

      return { previousPageDetail, workspaceSlug, projectId, pageId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousPageDetail) {
        queryClient.setQueryData(queryKeys.pages.detail(context.pageId), context.previousPageDetail);
      }
    },
    onSettled: (_data, _error, { pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.pages.detail(pageId) });
    },
  });
}

export interface UpdatePageAccessParams {
  workspaceSlug: string;
  projectId: string;
  pageId: string;
  access: number;
}

/**
 * Hook to update page access (public/private) with optimistic updates.
 * Replaces MobX BasePage.makePublic/makePrivate for write operations.
 *
 * @example
 * const { mutate: updateAccess, isPending } = useUpdatePageAccess();
 * updateAccess({ workspaceSlug, projectId, pageId, access: 1 });
 */
export function useUpdatePageAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, pageId, access }: UpdatePageAccessParams) =>
      projectPageService.updateAccess(workspaceSlug, projectId, pageId, { access }),
    onMutate: async ({ workspaceSlug, projectId, pageId, access }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.pages.all(workspaceSlug, projectId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.pages.detail(pageId) });

      const previousPages = queryClient.getQueryData<TPage[]>(queryKeys.pages.all(workspaceSlug, projectId));
      const previousPageDetail = queryClient.getQueryData<TPage>(queryKeys.pages.detail(pageId));

      if (previousPages) {
        queryClient.setQueryData<TPage[]>(
          queryKeys.pages.all(workspaceSlug, projectId),
          previousPages.map((page) => (page.id === pageId ? { ...page, access } : page))
        );
      }

      if (previousPageDetail) {
        queryClient.setQueryData<TPage>(queryKeys.pages.detail(pageId), {
          ...previousPageDetail,
          access,
        });
      }

      return { previousPages, previousPageDetail, workspaceSlug, projectId, pageId };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        if (context.previousPages) {
          queryClient.setQueryData(
            queryKeys.pages.all(context.workspaceSlug, context.projectId),
            context.previousPages
          );
        }
        if (context.previousPageDetail) {
          queryClient.setQueryData(queryKeys.pages.detail(context.pageId), context.previousPageDetail);
        }
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId, pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.pages.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.pages.detail(pageId) });
    },
  });
}

export interface LockPageParams {
  workspaceSlug: string;
  projectId: string;
  pageId: string;
}

/**
 * Hook to lock a page with optimistic updates.
 * Replaces MobX BasePage.lock for write operations.
 *
 * @example
 * const { mutate: lockPage, isPending } = useLockPage();
 * lockPage({ workspaceSlug, projectId, pageId });
 */
export function useLockPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, pageId }: LockPageParams) =>
      projectPageService.lock(workspaceSlug, projectId, pageId),
    onMutate: async ({ workspaceSlug, projectId, pageId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.pages.all(workspaceSlug, projectId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.pages.detail(pageId) });

      const previousPages = queryClient.getQueryData<TPage[]>(queryKeys.pages.all(workspaceSlug, projectId));
      const previousPageDetail = queryClient.getQueryData<TPage>(queryKeys.pages.detail(pageId));

      if (previousPages) {
        queryClient.setQueryData<TPage[]>(
          queryKeys.pages.all(workspaceSlug, projectId),
          previousPages.map((page) => (page.id === pageId ? { ...page, is_locked: true } : page))
        );
      }

      if (previousPageDetail) {
        queryClient.setQueryData<TPage>(queryKeys.pages.detail(pageId), {
          ...previousPageDetail,
          is_locked: true,
        });
      }

      return { previousPages, previousPageDetail, workspaceSlug, projectId, pageId };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        if (context.previousPages) {
          queryClient.setQueryData(
            queryKeys.pages.all(context.workspaceSlug, context.projectId),
            context.previousPages
          );
        }
        if (context.previousPageDetail) {
          queryClient.setQueryData(queryKeys.pages.detail(context.pageId), context.previousPageDetail);
        }
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId, pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.pages.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.pages.detail(pageId) });
    },
  });
}

/**
 * Hook to unlock a page with optimistic updates.
 * Replaces MobX BasePage.unlock for write operations.
 *
 * @example
 * const { mutate: unlockPage, isPending } = useUnlockPage();
 * unlockPage({ workspaceSlug, projectId, pageId });
 */
export function useUnlockPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, pageId }: LockPageParams) =>
      projectPageService.unlock(workspaceSlug, projectId, pageId),
    onMutate: async ({ workspaceSlug, projectId, pageId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.pages.all(workspaceSlug, projectId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.pages.detail(pageId) });

      const previousPages = queryClient.getQueryData<TPage[]>(queryKeys.pages.all(workspaceSlug, projectId));
      const previousPageDetail = queryClient.getQueryData<TPage>(queryKeys.pages.detail(pageId));

      if (previousPages) {
        queryClient.setQueryData<TPage[]>(
          queryKeys.pages.all(workspaceSlug, projectId),
          previousPages.map((page) => (page.id === pageId ? { ...page, is_locked: false } : page))
        );
      }

      if (previousPageDetail) {
        queryClient.setQueryData<TPage>(queryKeys.pages.detail(pageId), {
          ...previousPageDetail,
          is_locked: false,
        });
      }

      return { previousPages, previousPageDetail, workspaceSlug, projectId, pageId };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        if (context.previousPages) {
          queryClient.setQueryData(
            queryKeys.pages.all(context.workspaceSlug, context.projectId),
            context.previousPages
          );
        }
        if (context.previousPageDetail) {
          queryClient.setQueryData(queryKeys.pages.detail(context.pageId), context.previousPageDetail);
        }
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId, pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.pages.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.pages.detail(pageId) });
    },
  });
}

export interface ArchivePageParams {
  workspaceSlug: string;
  projectId: string;
  pageId: string;
}

/**
 * Hook to archive a page with optimistic updates.
 * Replaces MobX BasePage.archive for write operations.
 *
 * @example
 * const { mutate: archivePage, isPending } = useArchivePage();
 * archivePage({ workspaceSlug, projectId, pageId });
 */
export function useArchivePage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, pageId }: ArchivePageParams) =>
      projectPageService.archive(workspaceSlug, projectId, pageId),
    onMutate: async ({ workspaceSlug, projectId, pageId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.pages.all(workspaceSlug, projectId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.pages.detail(pageId) });

      const previousPages = queryClient.getQueryData<TPage[]>(queryKeys.pages.all(workspaceSlug, projectId));
      const previousPageDetail = queryClient.getQueryData<TPage>(queryKeys.pages.detail(pageId));

      if (previousPages) {
        queryClient.setQueryData<TPage[]>(
          queryKeys.pages.all(workspaceSlug, projectId),
          previousPages.map((page) => (page.id === pageId ? { ...page, archived_at: new Date().toISOString() } : page))
        );
      }

      if (previousPageDetail) {
        queryClient.setQueryData<TPage>(queryKeys.pages.detail(pageId), {
          ...previousPageDetail,
          archived_at: new Date().toISOString(),
        });
      }

      return { previousPages, previousPageDetail, workspaceSlug, projectId, pageId };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        if (context.previousPages) {
          queryClient.setQueryData(
            queryKeys.pages.all(context.workspaceSlug, context.projectId),
            context.previousPages
          );
        }
        if (context.previousPageDetail) {
          queryClient.setQueryData(queryKeys.pages.detail(context.pageId), context.previousPageDetail);
        }
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId, pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.pages.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.pages.archived(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.pages.detail(pageId) });
    },
  });
}

/**
 * Hook to restore an archived page with optimistic updates.
 * Replaces MobX BasePage.restore for write operations.
 *
 * @example
 * const { mutate: restorePage, isPending } = useRestorePage();
 * restorePage({ workspaceSlug, projectId, pageId });
 */
export function useRestorePage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, pageId }: ArchivePageParams) =>
      projectPageService.restore(workspaceSlug, projectId, pageId),
    onMutate: async ({ workspaceSlug, projectId, pageId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.pages.archived(workspaceSlug, projectId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.pages.detail(pageId) });

      const previousArchivedPages = queryClient.getQueryData<TPage[]>(
        queryKeys.pages.archived(workspaceSlug, projectId)
      );
      const previousPageDetail = queryClient.getQueryData<TPage>(queryKeys.pages.detail(pageId));

      if (previousArchivedPages) {
        queryClient.setQueryData<TPage[]>(
          queryKeys.pages.archived(workspaceSlug, projectId),
          previousArchivedPages.map((page) => (page.id === pageId ? { ...page, archived_at: null } : page))
        );
      }

      if (previousPageDetail) {
        queryClient.setQueryData<TPage>(queryKeys.pages.detail(pageId), {
          ...previousPageDetail,
          archived_at: null,
        });
      }

      return { previousArchivedPages, previousPageDetail, workspaceSlug, projectId, pageId };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        if (context.previousArchivedPages) {
          queryClient.setQueryData(
            queryKeys.pages.archived(context.workspaceSlug, context.projectId),
            context.previousArchivedPages
          );
        }
        if (context.previousPageDetail) {
          queryClient.setQueryData(queryKeys.pages.detail(context.pageId), context.previousPageDetail);
        }
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId, pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.pages.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.pages.archived(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.pages.detail(pageId) });
    },
  });
}

export interface DeletePageParams {
  workspaceSlug: string;
  projectId: string;
  pageId: string;
}

/**
 * Hook to delete a page with optimistic updates.
 * Replaces MobX ProjectPageStore.removePage for write operations.
 *
 * @example
 * const { mutate: deletePage, isPending } = useDeletePage();
 * deletePage({ workspaceSlug, projectId, pageId });
 */
export function useDeletePage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, pageId }: DeletePageParams) =>
      projectPageService.remove(workspaceSlug, projectId, pageId),
    onMutate: async ({ workspaceSlug, projectId, pageId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.pages.all(workspaceSlug, projectId) });

      const previousPages = queryClient.getQueryData<TPage[]>(queryKeys.pages.all(workspaceSlug, projectId));

      if (previousPages) {
        queryClient.setQueryData<TPage[]>(
          queryKeys.pages.all(workspaceSlug, projectId),
          previousPages.filter((page) => page.id !== pageId)
        );
      }

      return { previousPages, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousPages && context.workspaceSlug && context.projectId) {
        queryClient.setQueryData(queryKeys.pages.all(context.workspaceSlug, context.projectId), context.previousPages);
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId, pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.pages.all(workspaceSlug, projectId) });
      void queryClient.removeQueries({ queryKey: queryKeys.pages.detail(pageId) });
    },
  });
}

export interface DuplicatePageParams {
  workspaceSlug: string;
  projectId: string;
  pageId: string;
}

/**
 * Hook to duplicate a page.
 * Replaces MobX BasePage.duplicate for write operations.
 *
 * @example
 * const { mutate: duplicatePage, isPending } = useDuplicatePage();
 * duplicatePage({ workspaceSlug, projectId, pageId });
 */
export function useDuplicatePage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, pageId }: DuplicatePageParams) =>
      projectPageService.duplicate(workspaceSlug, projectId, pageId),
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.pages.all(workspaceSlug, projectId) });
    },
  });
}

export interface MovePageParams {
  workspaceSlug: string;
  projectId: string;
  pageId: string;
  newProjectId: string;
}

/**
 * Hook to move a page to a different project.
 * Replaces MobX ProjectPageStore.movePage for write operations.
 *
 * @example
 * const { mutate: movePage, isPending } = useMovePage();
 * movePage({ workspaceSlug, projectId, pageId, newProjectId });
 */
export function useMovePage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, pageId, newProjectId }: MovePageParams) =>
      projectPageService.move(workspaceSlug, projectId, pageId, newProjectId),
    onMutate: async ({ workspaceSlug, projectId, pageId, newProjectId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.pages.all(workspaceSlug, projectId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.pages.all(workspaceSlug, newProjectId) });

      const previousSourcePages = queryClient.getQueryData<TPage[]>(queryKeys.pages.all(workspaceSlug, projectId));
      const previousDestPages = queryClient.getQueryData<TPage[]>(queryKeys.pages.all(workspaceSlug, newProjectId));

      if (previousSourcePages) {
        const movedPage = previousSourcePages.find((page) => page.id === pageId);
        if (movedPage) {
          // Remove from source
          queryClient.setQueryData<TPage[]>(
            queryKeys.pages.all(workspaceSlug, projectId),
            previousSourcePages.filter((page) => page.id !== pageId)
          );

          // Add to destination
          if (previousDestPages) {
            queryClient.setQueryData<TPage[]>(queryKeys.pages.all(workspaceSlug, newProjectId), [
              ...previousDestPages,
              { ...movedPage, project_ids: [newProjectId] },
            ]);
          }
        }
      }

      return { previousSourcePages, previousDestPages, workspaceSlug, projectId, newProjectId };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        if (context.previousSourcePages) {
          queryClient.setQueryData(
            queryKeys.pages.all(context.workspaceSlug, context.projectId),
            context.previousSourcePages
          );
        }
        if (context.previousDestPages) {
          queryClient.setQueryData(
            queryKeys.pages.all(context.workspaceSlug, context.newProjectId),
            context.previousDestPages
          );
        }
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId, pageId, newProjectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.pages.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.pages.all(workspaceSlug, newProjectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.pages.detail(pageId) });
    },
  });
}

export interface AddPageToFavoritesParams {
  workspaceSlug: string;
  projectId: string;
  pageId: string;
}

/**
 * Hook to add a page to favorites with optimistic updates.
 * Replaces MobX BasePage.addToFavorites for write operations.
 *
 * @example
 * const { mutate: addToFavorites, isPending } = useAddPageToFavorites();
 * addToFavorites({ workspaceSlug, projectId, pageId });
 */
export function useAddPageToFavorites() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, pageId }: AddPageToFavoritesParams) =>
      projectPageService.addToFavorites(workspaceSlug, projectId, pageId),
    onMutate: async ({ workspaceSlug, projectId, pageId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.pages.all(workspaceSlug, projectId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.pages.detail(pageId) });

      const previousPages = queryClient.getQueryData<TPage[]>(queryKeys.pages.all(workspaceSlug, projectId));
      const previousPageDetail = queryClient.getQueryData<TPage>(queryKeys.pages.detail(pageId));

      if (previousPages) {
        queryClient.setQueryData<TPage[]>(
          queryKeys.pages.all(workspaceSlug, projectId),
          previousPages.map((page) => (page.id === pageId ? { ...page, is_favorite: true } : page))
        );
      }

      if (previousPageDetail) {
        queryClient.setQueryData<TPage>(queryKeys.pages.detail(pageId), {
          ...previousPageDetail,
          is_favorite: true,
        });
      }

      return { previousPages, previousPageDetail, workspaceSlug, projectId, pageId };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        if (context.previousPages) {
          queryClient.setQueryData(
            queryKeys.pages.all(context.workspaceSlug, context.projectId),
            context.previousPages
          );
        }
        if (context.previousPageDetail) {
          queryClient.setQueryData(queryKeys.pages.detail(context.pageId), context.previousPageDetail);
        }
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId, pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.pages.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.pages.favorites(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.pages.detail(pageId) });
    },
  });
}

export interface RemovePageFromFavoritesParams {
  workspaceSlug: string;
  projectId: string;
  pageId: string;
}

/**
 * Hook to remove a page from favorites with optimistic updates.
 * Replaces MobX BasePage.removePageFromFavorites for write operations.
 *
 * @example
 * const { mutate: removeFromFavorites, isPending } = useRemovePageFromFavorites();
 * removeFromFavorites({ workspaceSlug, projectId, pageId });
 */
export function useRemovePageFromFavorites() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, pageId }: RemovePageFromFavoritesParams) =>
      projectPageService.removeFromFavorites(workspaceSlug, projectId, pageId),
    onMutate: async ({ workspaceSlug, projectId, pageId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.pages.all(workspaceSlug, projectId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.pages.detail(pageId) });

      const previousPages = queryClient.getQueryData<TPage[]>(queryKeys.pages.all(workspaceSlug, projectId));
      const previousPageDetail = queryClient.getQueryData<TPage>(queryKeys.pages.detail(pageId));

      if (previousPages) {
        queryClient.setQueryData<TPage[]>(
          queryKeys.pages.all(workspaceSlug, projectId),
          previousPages.map((page) => (page.id === pageId ? { ...page, is_favorite: false } : page))
        );
      }

      if (previousPageDetail) {
        queryClient.setQueryData<TPage>(queryKeys.pages.detail(pageId), {
          ...previousPageDetail,
          is_favorite: false,
        });
      }

      return { previousPages, previousPageDetail, workspaceSlug, projectId, pageId };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        if (context.previousPages) {
          queryClient.setQueryData(
            queryKeys.pages.all(context.workspaceSlug, context.projectId),
            context.previousPages
          );
        }
        if (context.previousPageDetail) {
          queryClient.setQueryData(queryKeys.pages.detail(context.pageId), context.previousPageDetail);
        }
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId, pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.pages.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.pages.favorites(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.pages.detail(pageId) });
    },
  });
}

// Utility functions for derived data

/**
 * Get page by ID from pages array.
 *
 * @example
 * const { data: pages } = useProjectPages(workspaceSlug, projectId);
 * const page = getPageById(pages, pageId);
 */
export function getPageById(pages: TPage[] | undefined, pageId: string | null | undefined): TPage | undefined {
  if (!pages || !pageId) return undefined;
  return pages.find((page) => page.id === pageId);
}

/**
 * Get page name by ID from pages array.
 *
 * @example
 * const { data: pages } = useProjectPages(workspaceSlug, projectId);
 * const name = getPageNameById(pages, pageId);
 */
export function getPageNameById(pages: TPage[] | undefined, pageId: string | null | undefined): string | undefined {
  if (!pages || !pageId) return undefined;
  return pages.find((page) => page.id === pageId)?.name;
}

/**
 * Get page IDs from pages array.
 *
 * @example
 * const { data: pages } = useProjectPages(workspaceSlug, projectId);
 * const pageIds = getPageIds(pages);
 */
export function getPageIds(pages: TPage[] | undefined): string[] {
  if (!pages) return [];
  return pages.map((page) => page.id);
}

/**
 * Get active pages (not archived) from pages array.
 *
 * @example
 * const { data: pages } = useProjectPages(workspaceSlug, projectId);
 * const activePages = getActivePages(pages);
 */
export function getActivePages(pages: TPage[] | undefined): TPage[] {
  if (!pages) return [];
  return pages.filter((page) => !page.archived_at);
}

/**
 * Get favorite pages from pages array.
 *
 * @example
 * const { data: pages } = useProjectPages(workspaceSlug, projectId);
 * const favoritePages = getFavoritePages(pages);
 */
export function getFavoritePages(pages: TPage[] | undefined): TPage[] {
  if (!pages) return [];
  return pages.filter((page) => page.is_favorite);
}

/**
 * Get locked pages from pages array.
 *
 * @example
 * const { data: pages } = useProjectPages(workspaceSlug, projectId);
 * const lockedPages = getLockedPages(pages);
 */
export function getLockedPages(pages: TPage[] | undefined): TPage[] {
  if (!pages) return [];
  return pages.filter((page) => page.is_locked);
}

/**
 * Filter pages by access level.
 *
 * @example
 * const { data: pages } = useProjectPages(workspaceSlug, projectId);
 * const publicPages = filterPagesByAccess(pages, 0); // EPageAccess.PUBLIC = 0
 */
export function filterPagesByAccess(pages: TPage[] | undefined, access: number): TPage[] {
  if (!pages) return [];
  return pages.filter((page) => page.access === access);
}
