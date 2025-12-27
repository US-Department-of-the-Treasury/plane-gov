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
  TWikiDocumentPayload,
  // Unified page model types
  TPageComment,
  TPageCommentFormData,
  TPageRelationFormData,
  TPageLink,
  TPageLinkFormData,
  TPropertyDefinition,
  TPropertyDefinitionFormData,
  TPagePropertyValue,
  TPagePropertyValueFormData,
} from "@plane/types";
import {
  WikiPageService,
  WikiCollectionService,
  WikiShareService,
  WikiVersionService,
  // Unified page model services
  WikiCommentService,
  WikiRelationService,
  WikiLinkService,
  WikiPropertyDefinitionService,
  WikiPropertyValueService,
} from "@/services/wiki";
import { queryKeys } from "./query-keys";

// Service instances
const wikiPageService = new WikiPageService();
const wikiCollectionService = new WikiCollectionService();
const wikiShareService = new WikiShareService();
const wikiVersionService = new WikiVersionService();
// Unified page model services
const wikiCommentService = new WikiCommentService();
const wikiRelationService = new WikiRelationService();
const wikiLinkService = new WikiLinkService();
const wikiPropertyDefinitionService = new WikiPropertyDefinitionService();
const wikiPropertyValueService = new WikiPropertyValueService();

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
 * Hook to fetch wiki pages for a specific project.
 * These are wiki pages associated with a project (for project Pages view).
 *
 * @example
 * const { data: pages, isLoading } = useProjectWikiPages(workspaceSlug, projectId);
 */
export function useProjectWikiPages(workspaceSlug: string | undefined, projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.wiki.pages.project(workspaceSlug ?? "", projectId ?? ""),
    queryFn: () => wikiPageService.fetchByProject(workspaceSlug!, projectId!),
    enabled: !!workspaceSlug && !!projectId,
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
    mutationFn: ({ workspaceSlug, data }: CreateWikiPageParams) => wikiPageService.create(workspaceSlug, data),
    onSuccess: (_data, { workspaceSlug, data }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.pages.all(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.pages.private(workspaceSlug) });
      // Also invalidate project wiki pages cache if page was associated with a project
      if (data.project) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.pages.project(workspaceSlug, data.project) });
      }
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

      const previousPage = queryClient.getQueryData<TWikiPageDetail>(queryKeys.wiki.pages.detail(pageId));

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
        queryClient.setQueryData(queryKeys.wiki.pages.detail(context.pageId), context.previousPage);
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
    mutationFn: ({ workspaceSlug, pageId }: DeleteWikiPageParams) => wikiPageService.remove(workspaceSlug, pageId),
    onMutate: async ({ workspaceSlug, pageId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.wiki.pages.all(workspaceSlug) });

      const previousPages = queryClient.getQueryData<TWikiPage[]>(queryKeys.wiki.pages.all(workspaceSlug));

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
        queryClient.setQueryData(queryKeys.wiki.pages.all(context.workspaceSlug), context.previousPages);
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
    mutationFn: ({ workspaceSlug, pageId }: ArchiveWikiPageParams) => wikiPageService.archive(workspaceSlug, pageId),
    onMutate: async ({ workspaceSlug, pageId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.wiki.pages.all(workspaceSlug) });

      const previousPages = queryClient.getQueryData<TWikiPage[]>(queryKeys.wiki.pages.all(workspaceSlug));

      if (previousPages) {
        queryClient.setQueryData<TWikiPage[]>(
          queryKeys.wiki.pages.all(workspaceSlug),
          previousPages.map((page) => (page.id === pageId ? { ...page, archived_at: new Date().toISOString() } : page))
        );
      }

      return { previousPages, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousPages && context.workspaceSlug) {
        queryClient.setQueryData(queryKeys.wiki.pages.all(context.workspaceSlug), context.previousPages);
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
    mutationFn: ({ workspaceSlug, pageId }: ArchiveWikiPageParams) => wikiPageService.unarchive(workspaceSlug, pageId),
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
    mutationFn: ({ workspaceSlug, pageId }: LockWikiPageParams) => wikiPageService.lock(workspaceSlug, pageId),
    onMutate: async ({ pageId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.wiki.pages.detail(pageId) });

      const previousPage = queryClient.getQueryData<TWikiPageDetail>(queryKeys.wiki.pages.detail(pageId));

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
        queryClient.setQueryData(queryKeys.wiki.pages.detail(context.pageId), context.previousPage);
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
    mutationFn: ({ workspaceSlug, pageId }: LockWikiPageParams) => wikiPageService.unlock(workspaceSlug, pageId),
    onMutate: async ({ pageId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.wiki.pages.detail(pageId) });

      const previousPage = queryClient.getQueryData<TWikiPageDetail>(queryKeys.wiki.pages.detail(pageId));

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
        queryClient.setQueryData(queryKeys.wiki.pages.detail(context.pageId), context.previousPage);
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
        queryClient.setQueryData<TWikiCollection>(queryKeys.wiki.collections.detail(collectionId), {
          ...previousCollection,
          ...data,
        });
      }

      return { previousCollection, workspaceSlug, collectionId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousCollection && context.collectionId) {
        queryClient.setQueryData(queryKeys.wiki.collections.detail(context.collectionId), context.previousCollection);
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
        queryClient.setQueryData(queryKeys.wiki.collections.all(context.workspaceSlug), context.previousCollections);
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

      const previousShares = queryClient.getQueryData<TWikiPageShare[]>(queryKeys.wiki.shares.all(pageId));

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
        queryClient.setQueryData(queryKeys.wiki.shares.all(context.pageId), context.previousShares);
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
export function useWikiPageVersionDetails(workspaceSlug: string, pageId: string, versionId: string) {
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
export function getWikiPagesByCollection(pages: TWikiPage[] | undefined, collectionId: string | null): TWikiPage[] {
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
export function getChildWikiPages(pages: TWikiPage[] | undefined, parentId: string): TWikiPage[] {
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

export function buildWikiCollectionTree(collections: TWikiCollection[] | undefined): TWikiCollectionTreeNode[] {
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
  const sortByOrder = (a: TWikiCollectionTreeNode, b: TWikiCollectionTreeNode) => a.sort_order - b.sort_order;
  rootCollections.sort(sortByOrder);
  collectionMap.forEach((node) => node.children.sort(sortByOrder));

  return rootCollections;
}

// ==========================================
// PAGE COMMENT HOOKS (Unified Page Model)
// ==========================================

/**
 * Hook to fetch all comments for a wiki page.
 *
 * @example
 * const { data: comments, isLoading } = usePageComments(workspaceSlug, pageId);
 */
export function usePageComments(workspaceSlug: string, pageId: string) {
  return useQuery({
    queryKey: queryKeys.wiki.comments.all(pageId),
    queryFn: () => wikiCommentService.fetchAll(workspaceSlug, pageId),
    enabled: !!workspaceSlug && !!pageId,
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface CreatePageCommentParams {
  workspaceSlug: string;
  pageId: string;
  data: TPageCommentFormData;
}

/**
 * Hook to create a new comment on a wiki page.
 *
 * @example
 * const { mutate: createComment, isPending } = useCreatePageComment();
 * createComment({ workspaceSlug, pageId, data: { comment_html: "<p>Hello</p>" } });
 */
export function useCreatePageComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, data }: CreatePageCommentParams) =>
      wikiCommentService.create(workspaceSlug, pageId, data),
    onSuccess: (_data, { pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.comments.all(pageId) });
    },
  });
}

interface UpdatePageCommentParams {
  workspaceSlug: string;
  pageId: string;
  commentId: string;
  data: Partial<TPageCommentFormData>;
}

/**
 * Hook to update a comment on a wiki page.
 */
export function useUpdatePageComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, commentId, data }: UpdatePageCommentParams) =>
      wikiCommentService.update(workspaceSlug, pageId, commentId, data),
    onMutate: async ({ pageId, commentId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.wiki.comments.all(pageId) });

      const previousComments = queryClient.getQueryData<TPageComment[]>(queryKeys.wiki.comments.all(pageId));

      if (previousComments) {
        queryClient.setQueryData<TPageComment[]>(
          queryKeys.wiki.comments.all(pageId),
          previousComments.map((c) => (c.id === commentId ? { ...c, ...data } : c))
        );
      }

      return { previousComments, pageId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousComments && context.pageId) {
        queryClient.setQueryData(queryKeys.wiki.comments.all(context.pageId), context.previousComments);
      }
    },
    onSettled: (_data, _error, { pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.comments.all(pageId) });
    },
  });
}

interface DeletePageCommentParams {
  workspaceSlug: string;
  pageId: string;
  commentId: string;
}

/**
 * Hook to delete a comment from a wiki page.
 */
export function useDeletePageComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, commentId }: DeletePageCommentParams) =>
      wikiCommentService.remove(workspaceSlug, pageId, commentId),
    onMutate: async ({ pageId, commentId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.wiki.comments.all(pageId) });

      const previousComments = queryClient.getQueryData<TPageComment[]>(queryKeys.wiki.comments.all(pageId));

      if (previousComments) {
        queryClient.setQueryData<TPageComment[]>(
          queryKeys.wiki.comments.all(pageId),
          previousComments.filter((c) => c.id !== commentId)
        );
      }

      return { previousComments, pageId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousComments && context.pageId) {
        queryClient.setQueryData(queryKeys.wiki.comments.all(context.pageId), context.previousComments);
      }
    },
    onSettled: (_data, _error, { pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.comments.all(pageId) });
    },
  });
}

// Comment Reactions

/**
 * Hook to fetch reactions for a comment.
 */
export function useCommentReactions(workspaceSlug: string, pageId: string, commentId: string) {
  return useQuery({
    queryKey: queryKeys.wiki.comments.reactions(commentId),
    queryFn: () => wikiCommentService.fetchReactions(workspaceSlug, pageId, commentId),
    enabled: !!workspaceSlug && !!pageId && !!commentId,
    staleTime: 2 * 60 * 1000,
  });
}

interface CreateCommentReactionParams {
  workspaceSlug: string;
  pageId: string;
  commentId: string;
  reaction: string;
}

/**
 * Hook to add a reaction to a comment.
 */
export function useCreateCommentReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, commentId, reaction }: CreateCommentReactionParams) =>
      wikiCommentService.createReaction(workspaceSlug, pageId, commentId, reaction),
    onSuccess: (_data, { commentId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.comments.reactions(commentId) });
    },
  });
}

interface DeleteCommentReactionParams {
  workspaceSlug: string;
  pageId: string;
  commentId: string;
  reactionId: string;
}

/**
 * Hook to remove a reaction from a comment.
 */
export function useDeleteCommentReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, commentId, reactionId }: DeleteCommentReactionParams) =>
      wikiCommentService.removeReaction(workspaceSlug, pageId, commentId, reactionId),
    onSuccess: (_data, { commentId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.comments.reactions(commentId) });
    },
  });
}

// ==========================================
// PAGE RELATION HOOKS (Unified Page Model)
// ==========================================

/**
 * Hook to fetch all relations for a wiki page (grouped by relation type).
 *
 * @example
 * const { data: relations, isLoading } = usePageRelations(workspaceSlug, pageId);
 * // relations = { blocks: [...], blocked_by: [...], relates_to: [...] }
 */
export function usePageRelations(workspaceSlug: string, pageId: string) {
  return useQuery({
    queryKey: queryKeys.wiki.relations.all(pageId),
    queryFn: () => wikiRelationService.fetchAll(workspaceSlug, pageId),
    enabled: !!workspaceSlug && !!pageId,
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface CreatePageRelationParams {
  workspaceSlug: string;
  pageId: string;
  data: TPageRelationFormData;
}

/**
 * Hook to create a relation between pages.
 *
 * @example
 * const { mutate: createRelation } = useCreatePageRelation();
 * createRelation({ workspaceSlug, pageId, data: { target_page: otherId, relation_type: "blocks" } });
 */
export function useCreatePageRelation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, data }: CreatePageRelationParams) =>
      wikiRelationService.create(workspaceSlug, pageId, data),
    onSuccess: (_data, { pageId, data }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.relations.all(pageId) });
      // Also invalidate the target page's relations
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.relations.all(data.target_page) });
    },
  });
}

interface DeletePageRelationParams {
  workspaceSlug: string;
  pageId: string;
  relationId: string;
  targetPageId?: string;
}

/**
 * Hook to remove a relation between pages.
 */
export function useDeletePageRelation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, relationId }: DeletePageRelationParams) =>
      wikiRelationService.remove(workspaceSlug, pageId, relationId),
    onSuccess: (_data, { pageId, targetPageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.relations.all(pageId) });
      if (targetPageId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.relations.all(targetPageId) });
      }
    },
  });
}

// ==========================================
// PAGE LINK HOOKS (Unified Page Model)
// ==========================================

/**
 * Hook to fetch all external links for a wiki page.
 *
 * @example
 * const { data: links, isLoading } = usePageLinks(workspaceSlug, pageId);
 */
export function usePageLinks(workspaceSlug: string, pageId: string) {
  return useQuery({
    queryKey: queryKeys.wiki.links.all(pageId),
    queryFn: () => wikiLinkService.fetchAll(workspaceSlug, pageId),
    enabled: !!workspaceSlug && !!pageId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface CreatePageLinkParams {
  workspaceSlug: string;
  pageId: string;
  data: TPageLinkFormData;
}

/**
 * Hook to add an external link to a wiki page.
 */
export function useCreatePageLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, data }: CreatePageLinkParams) =>
      wikiLinkService.create(workspaceSlug, pageId, data),
    onSuccess: (_data, { pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.links.all(pageId) });
    },
  });
}

interface UpdatePageLinkParams {
  workspaceSlug: string;
  pageId: string;
  linkId: string;
  data: Partial<TPageLinkFormData>;
}

/**
 * Hook to update an external link on a wiki page.
 */
export function useUpdatePageLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, linkId, data }: UpdatePageLinkParams) =>
      wikiLinkService.update(workspaceSlug, pageId, linkId, data),
    onMutate: async ({ pageId, linkId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.wiki.links.all(pageId) });

      const previousLinks = queryClient.getQueryData<TPageLink[]>(queryKeys.wiki.links.all(pageId));

      if (previousLinks) {
        queryClient.setQueryData<TPageLink[]>(
          queryKeys.wiki.links.all(pageId),
          previousLinks.map((l) => (l.id === linkId ? { ...l, ...data } : l))
        );
      }

      return { previousLinks, pageId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousLinks && context.pageId) {
        queryClient.setQueryData(queryKeys.wiki.links.all(context.pageId), context.previousLinks);
      }
    },
    onSettled: (_data, _error, { pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.links.all(pageId) });
    },
  });
}

interface DeletePageLinkParams {
  workspaceSlug: string;
  pageId: string;
  linkId: string;
}

/**
 * Hook to remove an external link from a wiki page.
 */
export function useDeletePageLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, linkId }: DeletePageLinkParams) =>
      wikiLinkService.remove(workspaceSlug, pageId, linkId),
    onMutate: async ({ pageId, linkId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.wiki.links.all(pageId) });

      const previousLinks = queryClient.getQueryData<TPageLink[]>(queryKeys.wiki.links.all(pageId));

      if (previousLinks) {
        queryClient.setQueryData<TPageLink[]>(
          queryKeys.wiki.links.all(pageId),
          previousLinks.filter((l) => l.id !== linkId)
        );
      }

      return { previousLinks, pageId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousLinks && context.pageId) {
        queryClient.setQueryData(queryKeys.wiki.links.all(context.pageId), context.previousLinks);
      }
    },
    onSettled: (_data, _error, { pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.links.all(pageId) });
    },
  });
}

// ==========================================
// PROPERTY DEFINITION HOOKS (Unified Page Model)
// ==========================================

/**
 * Hook to fetch all property definitions for a workspace.
 *
 * @example
 * const { data: definitions, isLoading } = usePropertyDefinitions(workspaceSlug);
 */
export function usePropertyDefinitions(workspaceSlug: string, params?: { page_type?: string; is_system?: boolean }) {
  return useQuery({
    queryKey: queryKeys.wiki.propertyDefinitions.all(workspaceSlug),
    queryFn: () => wikiPropertyDefinitionService.fetchAll(workspaceSlug, params),
    enabled: !!workspaceSlug,
    staleTime: 10 * 60 * 1000, // Property definitions change infrequently
    gcTime: 60 * 60 * 1000,
  });
}

/**
 * Hook to fetch a single property definition.
 */
export function usePropertyDefinitionDetails(workspaceSlug: string, propertyId: string) {
  return useQuery({
    queryKey: queryKeys.wiki.propertyDefinitions.detail(propertyId),
    queryFn: () => wikiPropertyDefinitionService.fetchById(workspaceSlug, propertyId),
    enabled: !!workspaceSlug && !!propertyId,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

interface CreatePropertyDefinitionParams {
  workspaceSlug: string;
  data: TPropertyDefinitionFormData;
}

/**
 * Hook to create a new property definition.
 */
export function useCreatePropertyDefinition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, data }: CreatePropertyDefinitionParams) =>
      wikiPropertyDefinitionService.create(workspaceSlug, data),
    onSuccess: (_data, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.propertyDefinitions.all(workspaceSlug) });
    },
  });
}

interface UpdatePropertyDefinitionParams {
  workspaceSlug: string;
  propertyId: string;
  data: Partial<TPropertyDefinitionFormData>;
}

/**
 * Hook to update a property definition.
 */
export function useUpdatePropertyDefinition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, propertyId, data }: UpdatePropertyDefinitionParams) =>
      wikiPropertyDefinitionService.update(workspaceSlug, propertyId, data),
    onSettled: (_data, _error, { workspaceSlug, propertyId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.propertyDefinitions.all(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.propertyDefinitions.detail(propertyId) });
    },
  });
}

interface DeletePropertyDefinitionParams {
  workspaceSlug: string;
  propertyId: string;
}

/**
 * Hook to delete a property definition.
 */
export function useDeletePropertyDefinition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, propertyId }: DeletePropertyDefinitionParams) =>
      wikiPropertyDefinitionService.remove(workspaceSlug, propertyId),
    onMutate: async ({ workspaceSlug, propertyId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.wiki.propertyDefinitions.all(workspaceSlug) });

      const previousDefinitions = queryClient.getQueryData<TPropertyDefinition[]>(
        queryKeys.wiki.propertyDefinitions.all(workspaceSlug)
      );

      if (previousDefinitions) {
        queryClient.setQueryData<TPropertyDefinition[]>(
          queryKeys.wiki.propertyDefinitions.all(workspaceSlug),
          previousDefinitions.filter((d) => d.id !== propertyId)
        );
      }

      return { previousDefinitions, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousDefinitions && context.workspaceSlug) {
        queryClient.setQueryData(
          queryKeys.wiki.propertyDefinitions.all(context.workspaceSlug),
          context.previousDefinitions
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, propertyId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.propertyDefinitions.all(workspaceSlug) });
      void queryClient.removeQueries({ queryKey: queryKeys.wiki.propertyDefinitions.detail(propertyId) });
    },
  });
}

// ==========================================
// PAGE PROPERTY VALUE HOOKS (Unified Page Model)
// ==========================================

/**
 * Hook to fetch all property values for a wiki page.
 *
 * @example
 * const { data: properties, isLoading } = usePageProperties(workspaceSlug, pageId);
 */
export function usePageProperties(workspaceSlug: string, pageId: string) {
  return useQuery({
    queryKey: queryKeys.wiki.properties.all(pageId),
    queryFn: () => wikiPropertyValueService.fetchAll(workspaceSlug, pageId),
    enabled: !!workspaceSlug && !!pageId,
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface CreatePagePropertyParams {
  workspaceSlug: string;
  pageId: string;
  data: TPagePropertyValueFormData;
}

/**
 * Hook to set a property value on a wiki page.
 */
export function useCreatePageProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, data }: CreatePagePropertyParams) =>
      wikiPropertyValueService.create(workspaceSlug, pageId, data),
    onSuccess: (_data, { pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.properties.all(pageId) });
    },
  });
}

interface UpdatePagePropertyParams {
  workspaceSlug: string;
  pageId: string;
  propertyValueId: string;
  data: Partial<TPagePropertyValueFormData>;
}

/**
 * Hook to update a property value on a wiki page.
 */
export function useUpdatePageProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, propertyValueId, data }: UpdatePagePropertyParams) =>
      wikiPropertyValueService.update(workspaceSlug, pageId, propertyValueId, data),
    onMutate: async ({ pageId, propertyValueId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.wiki.properties.all(pageId) });

      const previousProperties = queryClient.getQueryData<TPagePropertyValue[]>(queryKeys.wiki.properties.all(pageId));

      if (previousProperties) {
        queryClient.setQueryData<TPagePropertyValue[]>(
          queryKeys.wiki.properties.all(pageId),
          previousProperties.map((p) => (p.id === propertyValueId ? { ...p, ...data } : p))
        );
      }

      return { previousProperties, pageId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousProperties && context.pageId) {
        queryClient.setQueryData(queryKeys.wiki.properties.all(context.pageId), context.previousProperties);
      }
    },
    onSettled: (_data, _error, { pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.properties.all(pageId) });
    },
  });
}

interface DeletePagePropertyParams {
  workspaceSlug: string;
  pageId: string;
  propertyValueId: string;
}

/**
 * Hook to remove a property value from a wiki page.
 */
export function useDeletePageProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, propertyValueId }: DeletePagePropertyParams) =>
      wikiPropertyValueService.remove(workspaceSlug, pageId, propertyValueId),
    onMutate: async ({ pageId, propertyValueId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.wiki.properties.all(pageId) });

      const previousProperties = queryClient.getQueryData<TPagePropertyValue[]>(queryKeys.wiki.properties.all(pageId));

      if (previousProperties) {
        queryClient.setQueryData<TPagePropertyValue[]>(
          queryKeys.wiki.properties.all(pageId),
          previousProperties.filter((p) => p.id !== propertyValueId)
        );
      }

      return { previousProperties, pageId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousProperties && context.pageId) {
        queryClient.setQueryData(queryKeys.wiki.properties.all(context.pageId), context.previousProperties);
      }
    },
    onSettled: (_data, _error, { pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.properties.all(pageId) });
    },
  });
}

interface BulkUpdatePagePropertiesParams {
  workspaceSlug: string;
  pageId: string;
  properties: Record<string, unknown>;
}

/**
 * Hook to bulk update multiple property values on a wiki page.
 *
 * @example
 * const { mutate: bulkUpdate } = useBulkUpdatePageProperties();
 * bulkUpdate({
 *   workspaceSlug,
 *   pageId,
 *   properties: { status: "done", priority: "high", assignee: userId }
 * });
 */
export function useBulkUpdatePageProperties() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, properties }: BulkUpdatePagePropertiesParams) =>
      wikiPropertyValueService.bulkUpdate(workspaceSlug, pageId, properties),
    onSuccess: (_data, { pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wiki.properties.all(pageId) });
    },
  });
}
