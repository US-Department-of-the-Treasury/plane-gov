"use client";

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import type {
  TWikiPage,
  TWikiPageDetail,
  TWikiPageFormData,
  TWikiCollection,
  TWikiCollectionFormData,
  TWikiPageShare,
  TWikiPageShareFormData,
  TWikiPageVersion,
  TWikiPageVersionDetail,
  TWikiDocumentPayload,
  EWikiPageAccess,
} from "@plane/types";
import {
  WikiPageService,
  WikiCollectionService,
  WikiShareService,
  WikiVersionService,
} from "@/services/wiki";
import { queryKeys } from "./query-keys";

// Service instances
const wikiPageService = new WikiPageService();
const wikiCollectionService = new WikiCollectionService();
const wikiShareService = new WikiShareService();
const wikiVersionService = new WikiVersionService();

// ==========================================
// WIKI PAGE HOOKS
// ==========================================

/**
 * Hook to fetch all wiki pages for a workspace.
 *
 * @example
 * const { data: pages, isLoading } = useWikiPages(workspaceSlug);
 */
export function useWikiPages(workspaceSlug: string) {
  return useQuery({
    queryKey: queryKeys.wiki.pages.all(workspaceSlug),
    queryFn: () => wikiPageService.fetchAll(workspaceSlug),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch archived wiki pages for a workspace.
 *
 * @example
 * const { data: archivedPages, isLoading } = useArchivedWikiPages(workspaceSlug);
 */
export function useArchivedWikiPages(workspaceSlug: string) {
  return useQuery({
    queryKey: queryKeys.wiki.pages.archived(workspaceSlug),
    queryFn: () => wikiPageService.fetchArchived(workspaceSlug),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch shared wiki pages for a workspace.
 *
 * @example
 * const { data: sharedPages, isLoading } = useSharedWikiPages(workspaceSlug);
 */
export function useSharedWikiPages(workspaceSlug: string) {
  return useQuery({
    queryKey: queryKeys.wiki.pages.shared(workspaceSlug),
    queryFn: () => wikiPageService.fetchShared(workspaceSlug),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch private wiki pages for a workspace.
 *
 * @example
 * const { data: privatePages, isLoading } = usePrivateWikiPages(workspaceSlug);
 */
export function usePrivateWikiPages(workspaceSlug: string) {
  return useQuery({
    queryKey: queryKeys.wiki.pages.private(workspaceSlug),
    queryFn: () => wikiPageService.fetchPrivate(workspaceSlug),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch wiki page details by ID.
 *
 * @example
 * const { data: page, isLoading } = useWikiPageDetails(workspaceSlug, pageId);
 */
export function useWikiPageDetails(workspaceSlug: string, pageId: string) {
  return useQuery({
    queryKey: queryKeys.wiki.pages.detail(pageId),
    queryFn: () => wikiPageService.fetchById(workspaceSlug, pageId),
    enabled: !!workspaceSlug && !!pageId,
    staleTime: 2 * 60 * 1000, // 2 minutes - page content may change frequently
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to search wiki pages using PostgreSQL full-text search.
 *
 * @example
 * const { data: results, isLoading } = useSearchWikiPages(workspaceSlug, "search query");
 */
export function useSearchWikiPages(workspaceSlug: string, query: string) {
  return useQuery({
    queryKey: queryKeys.wiki.pages.search(workspaceSlug, query),
    queryFn: () => wikiPageService.search(workspaceSlug, query),
    enabled: !!workspaceSlug && !!query && query.length >= 2,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
  });
}

interface CreateWikiPageParams {
  workspaceSlug: string;
  data: TWikiPageFormData;
}

/**
 * Hook to create a new wiki page with optimistic updates.
 *
 * @example
 * const { mutate: createPage, isPending } = useCreateWikiPage();
 * createPage({ workspaceSlug, data: { name: "New Page" } });
 */
export function useCreateWikiPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, data }: CreateWikiPageParams) =>
      wikiPageService.create(workspaceSlug, data),
    onSuccess: (_data, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.pages.all(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.pages.private(workspaceSlug) });
    },
  });
}

interface UpdateWikiPageParams {
  workspaceSlug: string;
  pageId: string;
  data: TWikiPageFormData;
}

/**
 * Hook to update a wiki page with optimistic updates.
 *
 * @example
 * const { mutate: updatePage, isPending } = useUpdateWikiPage();
 * updatePage({ workspaceSlug, pageId, data: { name: "Updated Name" } });
 */
export function useUpdateWikiPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, data }: UpdateWikiPageParams) =>
      wikiPageService.update(workspaceSlug, pageId, data),
    onMutate: async ({ workspaceSlug, pageId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.wiki.pages.detail(pageId) });

      const previousPage = queryClient.getQueryData<TWikiPageDetail>(
        queryKeys.wiki.pages.detail(pageId)
      );

      if (previousPage) {
        queryClient.setQueryData<TWikiPageDetail>(queryKeys.wiki.pages.detail(pageId), {
          ...previousPage,
          ...data,
        });
      }

      return { previousPage, workspaceSlug, pageId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousPage && context.pageId) {
        queryClient.setQueryData(
          queryKeys.wiki.pages.detail(context.pageId),
          context.previousPage
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.pages.all(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.pages.detail(pageId) });
    },
  });
}

interface DeleteWikiPageParams {
  workspaceSlug: string;
  pageId: string;
}

/**
 * Hook to delete a wiki page with optimistic updates.
 *
 * @example
 * const { mutate: deletePage, isPending } = useDeleteWikiPage();
 * deletePage({ workspaceSlug, pageId });
 */
export function useDeleteWikiPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId }: DeleteWikiPageParams) =>
      wikiPageService.remove(workspaceSlug, pageId),
    onMutate: async ({ workspaceSlug, pageId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.wiki.pages.all(workspaceSlug) });

      const previousPages = queryClient.getQueryData<TWikiPage[]>(
        queryKeys.wiki.pages.all(workspaceSlug)
      );

      if (previousPages) {
        queryClient.setQueryData<TWikiPage[]>(
          queryKeys.wiki.pages.all(workspaceSlug),
          previousPages.filter((page) => page.id !== pageId)
        );
      }

      return { previousPages, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousPages && context.workspaceSlug) {
        queryClient.setQueryData(
          queryKeys.wiki.pages.all(context.workspaceSlug),
          context.previousPages
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.pages.all(workspaceSlug) });
      void queryClient.removeQueries({ queryKey: queryKeys.wiki.pages.detail(pageId) });
    },
  });
}

interface ArchiveWikiPageParams {
  workspaceSlug: string;
  pageId: string;
}

/**
 * Hook to archive a wiki page.
 *
 * @example
 * const { mutate: archivePage, isPending } = useArchiveWikiPage();
 * archivePage({ workspaceSlug, pageId });
 */
export function useArchiveWikiPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId }: ArchiveWikiPageParams) =>
      wikiPageService.archive(workspaceSlug, pageId),
    onMutate: async ({ workspaceSlug, pageId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.wiki.pages.all(workspaceSlug) });

      const previousPages = queryClient.getQueryData<TWikiPage[]>(
        queryKeys.wiki.pages.all(workspaceSlug)
      );

      if (previousPages) {
        queryClient.setQueryData<TWikiPage[]>(
          queryKeys.wiki.pages.all(workspaceSlug),
          previousPages.map((page) =>
            page.id === pageId ? { ...page, archived_at: new Date().toISOString() } : page
          )
        );
      }

      return { previousPages, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousPages && context.workspaceSlug) {
        queryClient.setQueryData(
          queryKeys.wiki.pages.all(context.workspaceSlug),
          context.previousPages
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.pages.all(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.pages.archived(workspaceSlug) });
    },
  });
}

/**
 * Hook to unarchive/restore a wiki page.
 *
 * @example
 * const { mutate: unarchivePage, isPending } = useUnarchiveWikiPage();
 * unarchivePage({ workspaceSlug, pageId });
 */
export function useUnarchiveWikiPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId }: ArchiveWikiPageParams) =>
      wikiPageService.unarchive(workspaceSlug, pageId),
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.pages.all(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.pages.archived(workspaceSlug) });
    },
  });
}

interface LockWikiPageParams {
  workspaceSlug: string;
  pageId: string;
}

/**
 * Hook to lock a wiki page.
 *
 * @example
 * const { mutate: lockPage, isPending } = useLockWikiPage();
 * lockPage({ workspaceSlug, pageId });
 */
export function useLockWikiPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId }: LockWikiPageParams) =>
      wikiPageService.lock(workspaceSlug, pageId),
    onMutate: async ({ pageId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.wiki.pages.detail(pageId) });

      const previousPage = queryClient.getQueryData<TWikiPageDetail>(
        queryKeys.wiki.pages.detail(pageId)
      );

      if (previousPage) {
        queryClient.setQueryData<TWikiPageDetail>(queryKeys.wiki.pages.detail(pageId), {
          ...previousPage,
          is_locked: true,
        });
      }

      return { previousPage, pageId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousPage && context.pageId) {
        queryClient.setQueryData(
          queryKeys.wiki.pages.detail(context.pageId),
          context.previousPage
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.pages.all(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.pages.detail(pageId) });
    },
  });
}

/**
 * Hook to unlock a wiki page.
 *
 * @example
 * const { mutate: unlockPage, isPending } = useUnlockWikiPage();
 * unlockPage({ workspaceSlug, pageId });
 */
export function useUnlockWikiPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId }: LockWikiPageParams) =>
      wikiPageService.unlock(workspaceSlug, pageId),
    onMutate: async ({ pageId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.wiki.pages.detail(pageId) });

      const previousPage = queryClient.getQueryData<TWikiPageDetail>(
        queryKeys.wiki.pages.detail(pageId)
      );

      if (previousPage) {
        queryClient.setQueryData<TWikiPageDetail>(queryKeys.wiki.pages.detail(pageId), {
          ...previousPage,
          is_locked: false,
          locked_by: null,
        });
      }

      return { previousPage, pageId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousPage && context.pageId) {
        queryClient.setQueryData(
          queryKeys.wiki.pages.detail(context.pageId),
          context.previousPage
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.pages.all(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.pages.detail(pageId) });
    },
  });
}

interface DuplicateWikiPageParams {
  workspaceSlug: string;
  pageId: string;
}

/**
 * Hook to duplicate a wiki page.
 *
 * @example
 * const { mutate: duplicatePage, isPending } = useDuplicateWikiPage();
 * duplicatePage({ workspaceSlug, pageId });
 */
export function useDuplicateWikiPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId }: DuplicateWikiPageParams) =>
      wikiPageService.duplicate(workspaceSlug, pageId),
    onSuccess: (_data, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.pages.all(workspaceSlug) });
    },
  });
}

interface UpdateWikiPageDescriptionParams {
  workspaceSlug: string;
  pageId: string;
  data: TWikiDocumentPayload;
}

/**
 * Hook to update wiki page description/content.
 *
 * @example
 * const { mutate: updateDescription, isPending } = useUpdateWikiPageDescription();
 * updateDescription({ workspaceSlug, pageId, data: { description_binary, description_html, description } });
 */
export function useUpdateWikiPageDescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, data }: UpdateWikiPageDescriptionParams) =>
      wikiPageService.updateDescription(workspaceSlug, pageId, data),
    onSettled: (_data, _error, { pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.pages.detail(pageId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.versions.all(pageId) });
    },
  });
}

// ==========================================
// WIKI COLLECTION HOOKS
// ==========================================

/**
 * Hook to fetch all wiki collections for a workspace.
 *
 * @example
 * const { data: collections, isLoading } = useWikiCollections(workspaceSlug);
 */
export function useWikiCollections(workspaceSlug: string) {
  return useQuery({
    queryKey: queryKeys.wiki.collections.all(workspaceSlug),
    queryFn: () => wikiCollectionService.fetchAll(workspaceSlug),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch wiki collection details by ID.
 *
 * @example
 * const { data: collection, isLoading } = useWikiCollectionDetails(workspaceSlug, collectionId);
 */
export function useWikiCollectionDetails(workspaceSlug: string, collectionId: string) {
  return useQuery({
    queryKey: queryKeys.wiki.collections.detail(collectionId),
    queryFn: () => wikiCollectionService.fetchById(workspaceSlug, collectionId),
    enabled: !!workspaceSlug && !!collectionId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface CreateWikiCollectionParams {
  workspaceSlug: string;
  data: TWikiCollectionFormData;
}

/**
 * Hook to create a new wiki collection.
 *
 * @example
 * const { mutate: createCollection, isPending } = useCreateWikiCollection();
 * createCollection({ workspaceSlug, data: { name: "Engineering", description: "", icon: "folder" } });
 */
export function useCreateWikiCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, data }: CreateWikiCollectionParams) =>
      wikiCollectionService.create(workspaceSlug, data),
    onSuccess: (_data, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.collections.all(workspaceSlug) });
    },
  });
}

interface UpdateWikiCollectionParams {
  workspaceSlug: string;
  collectionId: string;
  data: Partial<TWikiCollectionFormData>;
}

/**
 * Hook to update a wiki collection.
 *
 * @example
 * const { mutate: updateCollection, isPending } = useUpdateWikiCollection();
 * updateCollection({ workspaceSlug, collectionId, data: { name: "Updated Name" } });
 */
export function useUpdateWikiCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, collectionId, data }: UpdateWikiCollectionParams) =>
      wikiCollectionService.update(workspaceSlug, collectionId, data),
    onMutate: async ({ workspaceSlug, collectionId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.wiki.collections.detail(collectionId) });

      const previousCollection = queryClient.getQueryData<TWikiCollection>(
        queryKeys.wiki.collections.detail(collectionId)
      );

      if (previousCollection) {
        queryClient.setQueryData<TWikiCollection>(
          queryKeys.wiki.collections.detail(collectionId),
          { ...previousCollection, ...data }
        );
      }

      return { previousCollection, workspaceSlug, collectionId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousCollection && context.collectionId) {
        queryClient.setQueryData(
          queryKeys.wiki.collections.detail(context.collectionId),
          context.previousCollection
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, collectionId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.collections.all(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.collections.detail(collectionId) });
    },
  });
}

interface DeleteWikiCollectionParams {
  workspaceSlug: string;
  collectionId: string;
}

/**
 * Hook to delete a wiki collection.
 *
 * @example
 * const { mutate: deleteCollection, isPending } = useDeleteWikiCollection();
 * deleteCollection({ workspaceSlug, collectionId });
 */
export function useDeleteWikiCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, collectionId }: DeleteWikiCollectionParams) =>
      wikiCollectionService.remove(workspaceSlug, collectionId),
    onMutate: async ({ workspaceSlug, collectionId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.wiki.collections.all(workspaceSlug) });

      const previousCollections = queryClient.getQueryData<TWikiCollection[]>(
        queryKeys.wiki.collections.all(workspaceSlug)
      );

      if (previousCollections) {
        queryClient.setQueryData<TWikiCollection[]>(
          queryKeys.wiki.collections.all(workspaceSlug),
          previousCollections.filter((c) => c.id !== collectionId)
        );
      }

      return { previousCollections, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousCollections && context.workspaceSlug) {
        queryClient.setQueryData(
          queryKeys.wiki.collections.all(context.workspaceSlug),
          context.previousCollections
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, collectionId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.collections.all(workspaceSlug) });
      void queryClient.removeQueries({ queryKey: queryKeys.wiki.collections.detail(collectionId) });
    },
  });
}

// ==========================================
// WIKI SHARE HOOKS
// ==========================================

/**
 * Hook to fetch all shares for a wiki page.
 *
 * @example
 * const { data: shares, isLoading } = useWikiPageShares(workspaceSlug, pageId);
 */
export function useWikiPageShares(workspaceSlug: string, pageId: string) {
  return useQuery({
    queryKey: queryKeys.wiki.shares.all(pageId),
    queryFn: () => wikiShareService.fetchAll(workspaceSlug, pageId),
    enabled: !!workspaceSlug && !!pageId,
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface CreateWikiPageShareParams {
  workspaceSlug: string;
  pageId: string;
  data: TWikiPageShareFormData;
}

/**
 * Hook to share a wiki page with a user.
 *
 * @example
 * const { mutate: sharePage, isPending } = useCreateWikiPageShare();
 * sharePage({ workspaceSlug, pageId, data: { user: userId, permission: EWikiSharePermission.EDIT } });
 */
export function useCreateWikiPageShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, data }: CreateWikiPageShareParams) =>
      wikiShareService.create(workspaceSlug, pageId, data),
    onSuccess: (_data, { workspaceSlug, pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.shares.all(pageId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.pages.detail(pageId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.pages.all(workspaceSlug) });
    },
  });
}

interface UpdateWikiPageShareParams {
  workspaceSlug: string;
  pageId: string;
  shareId: string;
  data: Partial<TWikiPageShareFormData>;
}

/**
 * Hook to update a wiki page share permission.
 *
 * @example
 * const { mutate: updateShare, isPending } = useUpdateWikiPageShare();
 * updateShare({ workspaceSlug, pageId, shareId, data: { permission: EWikiSharePermission.VIEW } });
 */
export function useUpdateWikiPageShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, shareId, data }: UpdateWikiPageShareParams) =>
      wikiShareService.update(workspaceSlug, pageId, shareId, data),
    onSettled: (_data, _error, { pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.shares.all(pageId) });
    },
  });
}

interface DeleteWikiPageShareParams {
  workspaceSlug: string;
  pageId: string;
  shareId: string;
}

/**
 * Hook to remove a share from a wiki page.
 *
 * @example
 * const { mutate: removeShare, isPending } = useDeleteWikiPageShare();
 * removeShare({ workspaceSlug, pageId, shareId });
 */
export function useDeleteWikiPageShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, shareId }: DeleteWikiPageShareParams) =>
      wikiShareService.remove(workspaceSlug, pageId, shareId),
    onMutate: async ({ pageId, shareId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.wiki.shares.all(pageId) });

      const previousShares = queryClient.getQueryData<TWikiPageShare[]>(
        queryKeys.wiki.shares.all(pageId)
      );

      if (previousShares) {
        queryClient.setQueryData<TWikiPageShare[]>(
          queryKeys.wiki.shares.all(pageId),
          previousShares.filter((s) => s.id !== shareId)
        );
      }

      return { previousShares, pageId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousShares && context.pageId) {
        queryClient.setQueryData(
          queryKeys.wiki.shares.all(context.pageId),
          context.previousShares
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.shares.all(pageId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.pages.detail(pageId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.pages.all(workspaceSlug) });
    },
  });
}

// ==========================================
// WIKI VERSION HOOKS
// ==========================================

/**
 * Hook to fetch all versions for a wiki page with pagination.
 *
 * @example
 * const { data: versions, isLoading, fetchNextPage, hasNextPage } = useWikiPageVersions(workspaceSlug, pageId);
 */
export function useWikiPageVersions(workspaceSlug: string, pageId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.wiki.versions.all(pageId),
    queryFn: ({ pageParam = 0 }) => wikiVersionService.fetchAll(workspaceSlug, pageId, pageParam),
    getNextPageParam: (lastPage) => lastPage.next_offset,
    initialPageParam: 0,
    enabled: !!workspaceSlug && !!pageId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch a specific wiki page version.
 *
 * @example
 * const { data: version, isLoading } = useWikiPageVersionDetails(workspaceSlug, pageId, versionId);
 */
export function useWikiPageVersionDetails(
  workspaceSlug: string,
  pageId: string,
  versionId: string
) {
  return useQuery({
    queryKey: queryKeys.wiki.versions.detail(versionId),
    queryFn: () => wikiVersionService.fetchById(workspaceSlug, pageId, versionId),
    enabled: !!workspaceSlug && !!pageId && !!versionId,
    staleTime: 30 * 60 * 1000, // Versions are immutable, can be cached longer
    gcTime: 60 * 60 * 1000,
  });
}

interface RestoreWikiPageVersionParams {
  workspaceSlug: string;
  pageId: string;
  versionId: string;
}

/**
 * Hook to restore a wiki page to a specific version.
 *
 * @example
 * const { mutate: restoreVersion, isPending } = useRestoreWikiPageVersion();
 * restoreVersion({ workspaceSlug, pageId, versionId });
 */
export function useRestoreWikiPageVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, versionId }: RestoreWikiPageVersionParams) =>
      wikiVersionService.restore(workspaceSlug, pageId, versionId),
    onSuccess: (_data, { workspaceSlug, pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.pages.detail(pageId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.pages.all(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.versions.all(pageId) });
    },
  });
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Get wiki page by ID from a pages array.
 */
export function getWikiPageById(
  pages: TWikiPage[] | undefined,
  pageId: string | null | undefined
): TWikiPage | undefined {
  if (!pages || !pageId) return undefined;
  return pages.find((page) => page.id === pageId);
}

/**
 * Get wiki collection by ID from a collections array.
 */
export function getWikiCollectionById(
  collections: TWikiCollection[] | undefined,
  collectionId: string | null | undefined
): TWikiCollection | undefined {
  if (!collections || !collectionId) return undefined;
  return collections.find((collection) => collection.id === collectionId);
}

/**
 * Filter wiki pages by collection.
 */
export function getWikiPagesByCollection(
  pages: TWikiPage[] | undefined,
  collectionId: string | null
): TWikiPage[] {
  if (!pages) return [];
  return pages.filter((page) => page.collection === collectionId);
}

/**
 * Get root-level wiki pages (no parent).
 */
export function getRootWikiPages(pages: TWikiPage[] | undefined): TWikiPage[] {
  if (!pages) return [];
  return pages.filter((page) => page.parent === null);
}

/**
 * Get child pages of a parent page.
 */
export function getChildWikiPages(
  pages: TWikiPage[] | undefined,
  parentId: string
): TWikiPage[] {
  if (!pages) return [];
  return pages.filter((page) => page.parent === parentId);
}

/**
 * Build wiki page tree structure.
 */
export interface TWikiPageTreeNode extends TWikiPage {
  children: TWikiPageTreeNode[];
}

export function buildWikiPageTree(pages: TWikiPage[] | undefined): TWikiPageTreeNode[] {
  if (!pages) return [];

  const pageMap = new Map<string, TWikiPageTreeNode>();
  const rootPages: TWikiPageTreeNode[] = [];

  // Create tree nodes
  pages.forEach((page) => {
    pageMap.set(page.id, { ...page, children: [] });
  });

  // Build tree
  pages.forEach((page) => {
    const node = pageMap.get(page.id)!;
    if (page.parent && pageMap.has(page.parent)) {
      pageMap.get(page.parent)!.children.push(node);
    } else {
      rootPages.push(node);
    }
  });

  // Sort by sort_order
  const sortByOrder = (a: TWikiPageTreeNode, b: TWikiPageTreeNode) => a.sort_order - b.sort_order;
  rootPages.sort(sortByOrder);
  pageMap.forEach((node) => node.children.sort(sortByOrder));

  return rootPages;
}

/**
 * Build wiki collection tree structure.
 */
export interface TWikiCollectionTreeNode extends TWikiCollection {
  children: TWikiCollectionTreeNode[];
}

export function buildWikiCollectionTree(
  collections: TWikiCollection[] | undefined
): TWikiCollectionTreeNode[] {
  if (!collections) return [];

  const collectionMap = new Map<string, TWikiCollectionTreeNode>();
  const rootCollections: TWikiCollectionTreeNode[] = [];

  // Create tree nodes
  collections.forEach((collection) => {
    collectionMap.set(collection.id, { ...collection, children: [] });
  });

  // Build tree
  collections.forEach((collection) => {
    const node = collectionMap.get(collection.id)!;
    if (collection.parent && collectionMap.has(collection.parent)) {
      collectionMap.get(collection.parent)!.children.push(node);
    } else {
      rootCollections.push(node);
    }
  });

  // Sort by sort_order
  const sortByOrder = (a: TWikiCollectionTreeNode, b: TWikiCollectionTreeNode) =>
    a.sort_order - b.sort_order;
  rootCollections.sort(sortByOrder);
  collectionMap.forEach((node) => node.children.sort(sortByOrder));

  return rootCollections;
}
