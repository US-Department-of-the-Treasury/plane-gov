"use client";

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import type {
  TDocument,
  TDocumentDetail,
  TDocumentFormData,
  TDocumentCollection,
  TDocumentCollectionFormData,
  TDocumentShare,
  TDocumentShareFormData,
  TDocumentUpdatePayload,
  // Unified page model types
  TDocumentComment,
  TDocumentCommentFormData,
  TDocumentRelationFormData,
  TDocumentLink,
  TDocumentLinkFormData,
  TPropertyDefinition,
  TPropertyDefinitionFormData,
  TDocumentPropertyValue,
  TDocumentPropertyValueFormData,
} from "@plane/types";
import {
  DocumentService,
  DocumentCollectionService,
  DocumentShareService,
  DocumentVersionService,
  // Unified page model services
  DocumentCommentService,
  DocumentRelationService,
  DocumentLinkService,
  DocumentPropertyDefinitionService,
  DocumentPropertyValueService,
} from "@/services/documents";
import { queryKeys } from "./query-keys";

// Service instances
const documentService = new DocumentService();
const documentCollectionService = new DocumentCollectionService();
const documentShareService = new DocumentShareService();
const documentVersionService = new DocumentVersionService();
// Unified page model services
const documentCommentService = new DocumentCommentService();
const documentRelationService = new DocumentRelationService();
const documentLinkService = new DocumentLinkService();
const documentPropertyDefinitionService = new DocumentPropertyDefinitionService();
const documentPropertyValueService = new DocumentPropertyValueService();

// ==========================================
// DOCUMENT PAGE HOOKS
// ==========================================

/**
 * Hook to fetch all documents for a workspace.
 *
 * @example
 * const { data: pages, isLoading } = useDocuments(workspaceSlug);
 */
export function useDocuments(workspaceSlug: string) {
  return useQuery({
    queryKey: queryKeys.document.pages.all(workspaceSlug),
    queryFn: () => documentService.fetchAll(workspaceSlug),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch documents for a specific project.
 * These are documents associated with a project (for project Pages view).
 *
 * @example
 * const { data: pages, isLoading } = useProjectDocuments(workspaceSlug, projectId);
 */
export function useProjectDocuments(workspaceSlug: string | undefined, projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.document.pages.project(workspaceSlug ?? "", projectId ?? ""),
    queryFn: () => documentService.fetchByProject(workspaceSlug!, projectId!),
    enabled: !!workspaceSlug && !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch archived documents for a workspace.
 *
 * @example
 * const { data: archivedPages, isLoading } = useArchivedDocuments(workspaceSlug);
 */
export function useArchivedDocuments(workspaceSlug: string) {
  return useQuery({
    queryKey: queryKeys.document.pages.archived(workspaceSlug),
    queryFn: () => documentService.fetchArchived(workspaceSlug),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch shared documents for a workspace.
 *
 * @example
 * const { data: sharedPages, isLoading } = useSharedDocuments(workspaceSlug);
 */
export function useSharedDocuments(workspaceSlug: string) {
  return useQuery({
    queryKey: queryKeys.document.pages.shared(workspaceSlug),
    queryFn: () => documentService.fetchShared(workspaceSlug),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch private documents for a workspace.
 *
 * @example
 * const { data: privatePages, isLoading } = usePrivateDocuments(workspaceSlug);
 */
export function usePrivateDocuments(workspaceSlug: string) {
  return useQuery({
    queryKey: queryKeys.document.pages.private(workspaceSlug),
    queryFn: () => documentService.fetchPrivate(workspaceSlug),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch document details by ID.
 *
 * @example
 * const { data: page, isLoading } = useDocumentDetails(workspaceSlug, pageId);
 */
export function useDocumentDetails(workspaceSlug: string, pageId: string) {
  return useQuery({
    queryKey: queryKeys.document.pages.detail(pageId),
    queryFn: () => documentService.fetchById(workspaceSlug, pageId),
    enabled: !!workspaceSlug && !!pageId,
    staleTime: 2 * 60 * 1000, // 2 minutes - page content may change frequently
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to search documents using PostgreSQL full-text search.
 *
 * @example
 * const { data: results, isLoading } = useSearchDocuments(workspaceSlug, "search query");
 */
export function useSearchDocuments(workspaceSlug: string, query: string) {
  return useQuery({
    queryKey: queryKeys.document.pages.search(workspaceSlug, query),
    queryFn: () => documentService.search(workspaceSlug, query),
    enabled: !!workspaceSlug && !!query && query.length >= 2,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
  });
}

interface CreateDocumentParams {
  workspaceSlug: string;
  data: TDocumentFormData;
}

/**
 * Hook to create a new document with optimistic updates.
 *
 * @example
 * const { mutate: createPage, isPending } = useCreateDocument();
 * createPage({ workspaceSlug, data: { name: "New Page" } });
 */
export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, data }: CreateDocumentParams) => documentService.create(workspaceSlug, data),
    onSuccess: (_data, { workspaceSlug, data }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.pages.all(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.pages.private(workspaceSlug) });
      // Also invalidate project documents cache if page was associated with a project
      if (data.project) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.document.pages.project(workspaceSlug, data.project) });
      }
    },
  });
}

interface UpdateDocumentParams {
  workspaceSlug: string;
  pageId: string;
  data: TDocumentFormData;
}

/**
 * Hook to update a document with optimistic updates.
 *
 * @example
 * const { mutate: updatePage, isPending } = useUpdateDocument();
 * updatePage({ workspaceSlug, pageId, data: { name: "Updated Name" } });
 */
export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, data }: UpdateDocumentParams) =>
      documentService.update(workspaceSlug, pageId, data),
    onMutate: async ({ workspaceSlug, pageId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.document.pages.detail(pageId) });

      const previousPage = queryClient.getQueryData<TDocumentDetail>(queryKeys.document.pages.detail(pageId));

      if (previousPage) {
        queryClient.setQueryData<TDocumentDetail>(queryKeys.document.pages.detail(pageId), {
          ...previousPage,
          ...data,
        });
      }

      return { previousPage, workspaceSlug, pageId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousPage && context.pageId) {
        queryClient.setQueryData(queryKeys.document.pages.detail(context.pageId), context.previousPage);
      }
    },
    onSettled: (_data, _error, { workspaceSlug, pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.pages.all(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.pages.detail(pageId) });
    },
  });
}

interface DeleteDocumentParams {
  workspaceSlug: string;
  pageId: string;
}

/**
 * Hook to delete a document with optimistic updates.
 *
 * @example
 * const { mutate: deletePage, isPending } = useDeleteDocument();
 * deletePage({ workspaceSlug, pageId });
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId }: DeleteDocumentParams) => documentService.remove(workspaceSlug, pageId),
    onMutate: async ({ workspaceSlug, pageId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.document.pages.all(workspaceSlug) });

      const previousPages = queryClient.getQueryData<TDocument[]>(queryKeys.document.pages.all(workspaceSlug));

      if (previousPages) {
        queryClient.setQueryData<TDocument[]>(
          queryKeys.document.pages.all(workspaceSlug),
          previousPages.filter((page) => page.id !== pageId)
        );
      }

      return { previousPages, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousPages && context.workspaceSlug) {
        queryClient.setQueryData(queryKeys.document.pages.all(context.workspaceSlug), context.previousPages);
      }
    },
    onSettled: (_data, _error, { workspaceSlug, pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.pages.all(workspaceSlug) });
      void queryClient.removeQueries({ queryKey: queryKeys.document.pages.detail(pageId) });
    },
  });
}

interface ArchiveDocumentParams {
  workspaceSlug: string;
  pageId: string;
}

/**
 * Hook to archive a document.
 *
 * @example
 * const { mutate: archivePage, isPending } = useArchiveDocument();
 * archivePage({ workspaceSlug, pageId });
 */
export function useArchiveDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId }: ArchiveDocumentParams) => documentService.archive(workspaceSlug, pageId),
    onMutate: async ({ workspaceSlug, pageId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.document.pages.all(workspaceSlug) });

      const previousPages = queryClient.getQueryData<TDocument[]>(queryKeys.document.pages.all(workspaceSlug));

      if (previousPages) {
        queryClient.setQueryData<TDocument[]>(
          queryKeys.document.pages.all(workspaceSlug),
          previousPages.map((page) => (page.id === pageId ? { ...page, archived_at: new Date().toISOString() } : page))
        );
      }

      return { previousPages, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousPages && context.workspaceSlug) {
        queryClient.setQueryData(queryKeys.document.pages.all(context.workspaceSlug), context.previousPages);
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.pages.all(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.pages.archived(workspaceSlug) });
    },
  });
}

/**
 * Hook to unarchive/restore a document.
 *
 * @example
 * const { mutate: unarchivePage, isPending } = useUnarchiveDocument();
 * unarchivePage({ workspaceSlug, pageId });
 */
export function useUnarchiveDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId }: ArchiveDocumentParams) => documentService.unarchive(workspaceSlug, pageId),
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.pages.all(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.pages.archived(workspaceSlug) });
    },
  });
}

interface LockDocumentParams {
  workspaceSlug: string;
  pageId: string;
}

/**
 * Hook to lock a document.
 *
 * @example
 * const { mutate: lockPage, isPending } = useLockDocument();
 * lockPage({ workspaceSlug, pageId });
 */
export function useLockDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId }: LockDocumentParams) => documentService.lock(workspaceSlug, pageId),
    onMutate: async ({ pageId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.document.pages.detail(pageId) });

      const previousPage = queryClient.getQueryData<TDocumentDetail>(queryKeys.document.pages.detail(pageId));

      if (previousPage) {
        queryClient.setQueryData<TDocumentDetail>(queryKeys.document.pages.detail(pageId), {
          ...previousPage,
          is_locked: true,
        });
      }

      return { previousPage, pageId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousPage && context.pageId) {
        queryClient.setQueryData(queryKeys.document.pages.detail(context.pageId), context.previousPage);
      }
    },
    onSettled: (_data, _error, { workspaceSlug, pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.pages.all(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.pages.detail(pageId) });
    },
  });
}

/**
 * Hook to unlock a document.
 *
 * @example
 * const { mutate: unlockPage, isPending } = useUnlockDocument();
 * unlockPage({ workspaceSlug, pageId });
 */
export function useUnlockDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId }: LockDocumentParams) => documentService.unlock(workspaceSlug, pageId),
    onMutate: async ({ pageId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.document.pages.detail(pageId) });

      const previousPage = queryClient.getQueryData<TDocumentDetail>(queryKeys.document.pages.detail(pageId));

      if (previousPage) {
        queryClient.setQueryData<TDocumentDetail>(queryKeys.document.pages.detail(pageId), {
          ...previousPage,
          is_locked: false,
          locked_by: null,
        });
      }

      return { previousPage, pageId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousPage && context.pageId) {
        queryClient.setQueryData(queryKeys.document.pages.detail(context.pageId), context.previousPage);
      }
    },
    onSettled: (_data, _error, { workspaceSlug, pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.pages.all(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.pages.detail(pageId) });
    },
  });
}

interface DuplicateDocumentParams {
  workspaceSlug: string;
  pageId: string;
}

/**
 * Hook to duplicate a document.
 *
 * @example
 * const { mutate: duplicatePage, isPending } = useDuplicateDocument();
 * duplicatePage({ workspaceSlug, pageId });
 */
export function useDuplicateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId }: DuplicateDocumentParams) =>
      documentService.duplicate(workspaceSlug, pageId),
    onSuccess: (_data, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.pages.all(workspaceSlug) });
    },
  });
}

interface UpdateDocumentDescriptionParams {
  workspaceSlug: string;
  pageId: string;
  data: TDocumentUpdatePayload;
}

/**
 * Hook to update document description/content.
 *
 * @example
 * const { mutate: updateDescription, isPending } = useUpdateDocumentDescription();
 * updateDescription({ workspaceSlug, pageId, data: { description_binary, description_html, description } });
 */
export function useUpdateDocumentDescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, data }: UpdateDocumentDescriptionParams) =>
      documentService.updateDescription(workspaceSlug, pageId, data),
    onSettled: (_data, _error, { pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.pages.detail(pageId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.versions.all(pageId) });
    },
  });
}

// ==========================================
// DOCUMENT COLLECTION HOOKS
// ==========================================

/**
 * Hook to fetch all document collections for a workspace.
 *
 * @example
 * const { data: collections, isLoading } = useDocumentCollections(workspaceSlug);
 */
export function useDocumentCollections(workspaceSlug: string) {
  return useQuery({
    queryKey: queryKeys.document.collections.all(workspaceSlug),
    queryFn: () => documentCollectionService.fetchAll(workspaceSlug),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch document collection details by ID.
 *
 * @example
 * const { data: collection, isLoading } = useDocumentCollectionDetails(workspaceSlug, collectionId);
 */
export function useDocumentCollectionDetails(workspaceSlug: string, collectionId: string) {
  return useQuery({
    queryKey: queryKeys.document.collections.detail(collectionId),
    queryFn: () => documentCollectionService.fetchById(workspaceSlug, collectionId),
    enabled: !!workspaceSlug && !!collectionId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface CreateDocumentCollectionParams {
  workspaceSlug: string;
  data: TDocumentCollectionFormData;
}

/**
 * Hook to create a new document collection.
 *
 * @example
 * const { mutate: createCollection, isPending } = useCreateDocumentCollection();
 * createCollection({ workspaceSlug, data: { name: "Engineering", description: "", icon: "folder" } });
 */
export function useCreateDocumentCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, data }: CreateDocumentCollectionParams) =>
      documentCollectionService.create(workspaceSlug, data),
    onSuccess: (_data, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.collections.all(workspaceSlug) });
    },
  });
}

interface UpdateDocumentCollectionParams {
  workspaceSlug: string;
  collectionId: string;
  data: Partial<TDocumentCollectionFormData>;
}

/**
 * Hook to update a document collection.
 *
 * @example
 * const { mutate: updateCollection, isPending } = useUpdateDocumentCollection();
 * updateCollection({ workspaceSlug, collectionId, data: { name: "Updated Name" } });
 */
export function useUpdateDocumentCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, collectionId, data }: UpdateDocumentCollectionParams) =>
      documentCollectionService.update(workspaceSlug, collectionId, data),
    onMutate: async ({ workspaceSlug, collectionId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.document.collections.detail(collectionId) });

      const previousCollection = queryClient.getQueryData<TDocumentCollection>(
        queryKeys.document.collections.detail(collectionId)
      );

      if (previousCollection) {
        queryClient.setQueryData<TDocumentCollection>(queryKeys.document.collections.detail(collectionId), {
          ...previousCollection,
          ...data,
        });
      }

      return { previousCollection, workspaceSlug, collectionId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousCollection && context.collectionId) {
        queryClient.setQueryData(
          queryKeys.document.collections.detail(context.collectionId),
          context.previousCollection
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, collectionId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.collections.all(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.collections.detail(collectionId) });
    },
  });
}

interface DeleteDocumentCollectionParams {
  workspaceSlug: string;
  collectionId: string;
}

/**
 * Hook to delete a document collection.
 *
 * @example
 * const { mutate: deleteCollection, isPending } = useDeleteDocumentCollection();
 * deleteCollection({ workspaceSlug, collectionId });
 */
export function useDeleteDocumentCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, collectionId }: DeleteDocumentCollectionParams) =>
      documentCollectionService.remove(workspaceSlug, collectionId),
    onMutate: async ({ workspaceSlug, collectionId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.document.collections.all(workspaceSlug) });

      const previousCollections = queryClient.getQueryData<TDocumentCollection[]>(
        queryKeys.document.collections.all(workspaceSlug)
      );

      if (previousCollections) {
        queryClient.setQueryData<TDocumentCollection[]>(
          queryKeys.document.collections.all(workspaceSlug),
          previousCollections.filter((c) => c.id !== collectionId)
        );
      }

      return { previousCollections, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousCollections && context.workspaceSlug) {
        queryClient.setQueryData(
          queryKeys.document.collections.all(context.workspaceSlug),
          context.previousCollections
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, collectionId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.collections.all(workspaceSlug) });
      void queryClient.removeQueries({ queryKey: queryKeys.document.collections.detail(collectionId) });
    },
  });
}

// ==========================================
// DOCUMENT SHARE HOOKS
// ==========================================

/**
 * Hook to fetch all shares for a document.
 *
 * @example
 * const { data: shares, isLoading } = useDocumentShares(workspaceSlug, pageId);
 */
export function useDocumentShares(workspaceSlug: string, pageId: string) {
  return useQuery({
    queryKey: queryKeys.document.shares.all(pageId),
    queryFn: () => documentShareService.fetchAll(workspaceSlug, pageId),
    enabled: !!workspaceSlug && !!pageId,
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface CreateDocumentShareParams {
  workspaceSlug: string;
  pageId: string;
  data: TDocumentShareFormData;
}

/**
 * Hook to share a document with a user.
 *
 * @example
 * const { mutate: sharePage, isPending } = useCreateDocumentShare();
 * sharePage({ workspaceSlug, pageId, data: { user: userId, permission: EDocumentSharePermission.EDIT } });
 */
export function useCreateDocumentShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, data }: CreateDocumentShareParams) =>
      documentShareService.create(workspaceSlug, pageId, data),
    onSuccess: (_data, { workspaceSlug, pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.shares.all(pageId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.pages.detail(pageId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.pages.all(workspaceSlug) });
    },
  });
}

interface UpdateDocumentShareParams {
  workspaceSlug: string;
  pageId: string;
  shareId: string;
  data: Partial<TDocumentShareFormData>;
}

/**
 * Hook to update a document share permission.
 *
 * @example
 * const { mutate: updateShare, isPending } = useUpdateDocumentShare();
 * updateShare({ workspaceSlug, pageId, shareId, data: { permission: EDocumentSharePermission.VIEW } });
 */
export function useUpdateDocumentShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, shareId, data }: UpdateDocumentShareParams) =>
      documentShareService.update(workspaceSlug, pageId, shareId, data),
    onSettled: (_data, _error, { pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.shares.all(pageId) });
    },
  });
}

interface DeleteDocumentShareParams {
  workspaceSlug: string;
  pageId: string;
  shareId: string;
}

/**
 * Hook to remove a share from a document.
 *
 * @example
 * const { mutate: removeShare, isPending } = useDeleteDocumentShare();
 * removeShare({ workspaceSlug, pageId, shareId });
 */
export function useDeleteDocumentShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, shareId }: DeleteDocumentShareParams) =>
      documentShareService.remove(workspaceSlug, pageId, shareId),
    onMutate: async ({ pageId, shareId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.document.shares.all(pageId) });

      const previousShares = queryClient.getQueryData<TDocumentShare[]>(queryKeys.document.shares.all(pageId));

      if (previousShares) {
        queryClient.setQueryData<TDocumentShare[]>(
          queryKeys.document.shares.all(pageId),
          previousShares.filter((s) => s.id !== shareId)
        );
      }

      return { previousShares, pageId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousShares && context.pageId) {
        queryClient.setQueryData(queryKeys.document.shares.all(context.pageId), context.previousShares);
      }
    },
    onSettled: (_data, _error, { workspaceSlug, pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.shares.all(pageId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.pages.detail(pageId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.pages.all(workspaceSlug) });
    },
  });
}

// ==========================================
// DOCUMENT VERSION HOOKS
// ==========================================

/**
 * Hook to fetch all versions for a document with pagination.
 *
 * @example
 * const { data: versions, isLoading, fetchNextPage, hasNextPage } = useDocumentVersions(workspaceSlug, pageId);
 */
export function useDocumentVersions(workspaceSlug: string, pageId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.document.versions.all(pageId),
    queryFn: ({ pageParam = 0 }) => documentVersionService.fetchAll(workspaceSlug, pageId, pageParam),
    getNextPageParam: (lastPage) => lastPage.next_offset,
    initialPageParam: 0,
    enabled: !!workspaceSlug && !!pageId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch a specific document version.
 *
 * @example
 * const { data: version, isLoading } = useDocumentVersionDetails(workspaceSlug, pageId, versionId);
 */
export function useDocumentVersionDetails(workspaceSlug: string, pageId: string, versionId: string) {
  return useQuery({
    queryKey: queryKeys.document.versions.detail(versionId),
    queryFn: () => documentVersionService.fetchById(workspaceSlug, pageId, versionId),
    enabled: !!workspaceSlug && !!pageId && !!versionId,
    staleTime: 30 * 60 * 1000, // Versions are immutable, can be cached longer
    gcTime: 60 * 60 * 1000,
  });
}

interface RestoreDocumentVersionParams {
  workspaceSlug: string;
  pageId: string;
  versionId: string;
}

/**
 * Hook to restore a document to a specific version.
 *
 * @example
 * const { mutate: restoreVersion, isPending } = useRestoreDocumentVersion();
 * restoreVersion({ workspaceSlug, pageId, versionId });
 */
export function useRestoreDocumentVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, versionId }: RestoreDocumentVersionParams) =>
      documentVersionService.restore(workspaceSlug, pageId, versionId),
    onSuccess: (_data, { workspaceSlug, pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.pages.detail(pageId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.pages.all(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.versions.all(pageId) });
    },
  });
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Get document by ID from a pages array.
 */
export function getDocumentById(
  pages: TDocument[] | undefined,
  pageId: string | null | undefined
): TDocument | undefined {
  if (!pages || !pageId) return undefined;
  return pages.find((page) => page.id === pageId);
}

/**
 * Get document collection by ID from a collections array.
 */
export function getDocumentCollectionById(
  collections: TDocumentCollection[] | undefined,
  collectionId: string | null | undefined
): TDocumentCollection | undefined {
  if (!collections || !collectionId) return undefined;
  return collections.find((collection) => collection.id === collectionId);
}

/**
 * Filter documents by collection.
 */
export function getDocumentsByCollection(pages: TDocument[] | undefined, collectionId: string | null): TDocument[] {
  if (!pages) return [];
  return pages.filter((page) => page.collection === collectionId);
}

/**
 * Get root-level documents (no parent).
 */
export function getRootDocuments(pages: TDocument[] | undefined): TDocument[] {
  if (!pages) return [];
  return pages.filter((page) => page.parent === null);
}

/**
 * Get child pages of a parent page.
 */
export function getChildDocuments(pages: TDocument[] | undefined, parentId: string): TDocument[] {
  if (!pages) return [];
  return pages.filter((page) => page.parent === parentId);
}

/**
 * Build document tree structure.
 */
export interface TDocumentTreeNode extends TDocument {
  children: TDocumentTreeNode[];
}

export function buildDocumentTree(pages: TDocument[] | undefined): TDocumentTreeNode[] {
  if (!pages) return [];

  const pageMap = new Map<string, TDocumentTreeNode>();
  const rootPages: TDocumentTreeNode[] = [];

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
  const sortByOrder = (a: TDocumentTreeNode, b: TDocumentTreeNode) => a.sort_order - b.sort_order;
  rootPages.sort(sortByOrder);
  pageMap.forEach((node) => node.children.sort(sortByOrder));

  return rootPages;
}

/**
 * Build document collection tree structure.
 */
export interface TDocumentCollectionTreeNode extends TDocumentCollection {
  children: TDocumentCollectionTreeNode[];
}

export function buildDocumentCollectionTree(
  collections: TDocumentCollection[] | undefined
): TDocumentCollectionTreeNode[] {
  if (!collections) return [];

  const collectionMap = new Map<string, TDocumentCollectionTreeNode>();
  const rootCollections: TDocumentCollectionTreeNode[] = [];

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
  const sortByOrder = (a: TDocumentCollectionTreeNode, b: TDocumentCollectionTreeNode) => a.sort_order - b.sort_order;
  rootCollections.sort(sortByOrder);
  collectionMap.forEach((node) => node.children.sort(sortByOrder));

  return rootCollections;
}

// ==========================================
// PAGE COMMENT HOOKS (Unified Page Model)
// ==========================================

/**
 * Hook to fetch all comments for a document.
 *
 * @example
 * const { data: comments, isLoading } = usePageComments(workspaceSlug, pageId);
 */
export function usePageComments(workspaceSlug: string, pageId: string) {
  return useQuery({
    queryKey: queryKeys.document.comments.all(pageId),
    queryFn: () => documentCommentService.fetchAll(workspaceSlug, pageId),
    enabled: !!workspaceSlug && !!pageId,
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface CreatePageCommentParams {
  workspaceSlug: string;
  pageId: string;
  data: TDocumentCommentFormData;
}

/**
 * Hook to create a new comment on a document.
 *
 * @example
 * const { mutate: createComment, isPending } = useCreatePageComment();
 * createComment({ workspaceSlug, pageId, data: { comment_html: "<p>Hello</p>" } });
 */
export function useCreatePageComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, data }: CreatePageCommentParams) =>
      documentCommentService.create(workspaceSlug, pageId, data),
    onSuccess: (_data, { pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.comments.all(pageId) });
    },
  });
}

interface UpdatePageCommentParams {
  workspaceSlug: string;
  pageId: string;
  commentId: string;
  data: Partial<TDocumentCommentFormData>;
}

/**
 * Hook to update a comment on a document.
 */
export function useUpdatePageComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, commentId, data }: UpdatePageCommentParams) =>
      documentCommentService.update(workspaceSlug, pageId, commentId, data),
    onMutate: async ({ pageId, commentId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.document.comments.all(pageId) });

      const previousComments = queryClient.getQueryData<TDocumentComment[]>(queryKeys.document.comments.all(pageId));

      if (previousComments) {
        queryClient.setQueryData<TDocumentComment[]>(
          queryKeys.document.comments.all(pageId),
          previousComments.map((c) => (c.id === commentId ? { ...c, ...data } : c))
        );
      }

      return { previousComments, pageId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousComments && context.pageId) {
        queryClient.setQueryData(queryKeys.document.comments.all(context.pageId), context.previousComments);
      }
    },
    onSettled: (_data, _error, { pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.comments.all(pageId) });
    },
  });
}

interface DeletePageCommentParams {
  workspaceSlug: string;
  pageId: string;
  commentId: string;
}

/**
 * Hook to delete a comment from a document.
 */
export function useDeletePageComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, commentId }: DeletePageCommentParams) =>
      documentCommentService.remove(workspaceSlug, pageId, commentId),
    onMutate: async ({ pageId, commentId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.document.comments.all(pageId) });

      const previousComments = queryClient.getQueryData<TDocumentComment[]>(queryKeys.document.comments.all(pageId));

      if (previousComments) {
        queryClient.setQueryData<TDocumentComment[]>(
          queryKeys.document.comments.all(pageId),
          previousComments.filter((c) => c.id !== commentId)
        );
      }

      return { previousComments, pageId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousComments && context.pageId) {
        queryClient.setQueryData(queryKeys.document.comments.all(context.pageId), context.previousComments);
      }
    },
    onSettled: (_data, _error, { pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.comments.all(pageId) });
    },
  });
}

// Comment Reactions

/**
 * Hook to fetch reactions for a comment.
 */
export function useCommentReactions(workspaceSlug: string, pageId: string, commentId: string) {
  return useQuery({
    queryKey: queryKeys.document.comments.reactions(commentId),
    queryFn: () => documentCommentService.fetchReactions(workspaceSlug, pageId, commentId),
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
      documentCommentService.createReaction(workspaceSlug, pageId, commentId, reaction),
    onSuccess: (_data, { commentId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.comments.reactions(commentId) });
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
      documentCommentService.removeReaction(workspaceSlug, pageId, commentId, reactionId),
    onSuccess: (_data, { commentId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.comments.reactions(commentId) });
    },
  });
}

// ==========================================
// PAGE RELATION HOOKS (Unified Page Model)
// ==========================================

/**
 * Hook to fetch all relations for a document (grouped by relation type).
 *
 * @example
 * const { data: relations, isLoading } = usePageRelations(workspaceSlug, pageId);
 * // relations = { blocks: [...], blocked_by: [...], relates_to: [...] }
 */
export function usePageRelations(workspaceSlug: string, pageId: string) {
  return useQuery({
    queryKey: queryKeys.document.relations.all(pageId),
    queryFn: () => documentRelationService.fetchAll(workspaceSlug, pageId),
    enabled: !!workspaceSlug && !!pageId,
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface CreatePageRelationParams {
  workspaceSlug: string;
  pageId: string;
  data: TDocumentRelationFormData;
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
      documentRelationService.create(workspaceSlug, pageId, data),
    onSuccess: (_data, { pageId, data }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.relations.all(pageId) });
      // Also invalidate the target page's relations
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.relations.all(data.target_page) });
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
      documentRelationService.remove(workspaceSlug, pageId, relationId),
    onSuccess: (_data, { pageId, targetPageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.relations.all(pageId) });
      if (targetPageId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.document.relations.all(targetPageId) });
      }
    },
  });
}

// ==========================================
// PAGE LINK HOOKS (Unified Page Model)
// ==========================================

/**
 * Hook to fetch all external links for a document.
 *
 * @example
 * const { data: links, isLoading } = usePageLinks(workspaceSlug, pageId);
 */
export function usePageLinks(workspaceSlug: string, pageId: string) {
  return useQuery({
    queryKey: queryKeys.document.links.all(pageId),
    queryFn: () => documentLinkService.fetchAll(workspaceSlug, pageId),
    enabled: !!workspaceSlug && !!pageId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface CreatePageLinkParams {
  workspaceSlug: string;
  pageId: string;
  data: TDocumentLinkFormData;
}

/**
 * Hook to add an external link to a document.
 */
export function useCreatePageLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, data }: CreatePageLinkParams) =>
      documentLinkService.create(workspaceSlug, pageId, data),
    onSuccess: (_data, { pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.links.all(pageId) });
    },
  });
}

interface UpdatePageLinkParams {
  workspaceSlug: string;
  pageId: string;
  linkId: string;
  data: Partial<TDocumentLinkFormData>;
}

/**
 * Hook to update an external link on a document.
 */
export function useUpdatePageLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, linkId, data }: UpdatePageLinkParams) =>
      documentLinkService.update(workspaceSlug, pageId, linkId, data),
    onMutate: async ({ pageId, linkId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.document.links.all(pageId) });

      const previousLinks = queryClient.getQueryData<TDocumentLink[]>(queryKeys.document.links.all(pageId));

      if (previousLinks) {
        queryClient.setQueryData<TDocumentLink[]>(
          queryKeys.document.links.all(pageId),
          previousLinks.map((l) => (l.id === linkId ? { ...l, ...data } : l))
        );
      }

      return { previousLinks, pageId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousLinks && context.pageId) {
        queryClient.setQueryData(queryKeys.document.links.all(context.pageId), context.previousLinks);
      }
    },
    onSettled: (_data, _error, { pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.links.all(pageId) });
    },
  });
}

interface DeletePageLinkParams {
  workspaceSlug: string;
  pageId: string;
  linkId: string;
}

/**
 * Hook to remove an external link from a document.
 */
export function useDeletePageLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, linkId }: DeletePageLinkParams) =>
      documentLinkService.remove(workspaceSlug, pageId, linkId),
    onMutate: async ({ pageId, linkId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.document.links.all(pageId) });

      const previousLinks = queryClient.getQueryData<TDocumentLink[]>(queryKeys.document.links.all(pageId));

      if (previousLinks) {
        queryClient.setQueryData<TDocumentLink[]>(
          queryKeys.document.links.all(pageId),
          previousLinks.filter((l) => l.id !== linkId)
        );
      }

      return { previousLinks, pageId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousLinks && context.pageId) {
        queryClient.setQueryData(queryKeys.document.links.all(context.pageId), context.previousLinks);
      }
    },
    onSettled: (_data, _error, { pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.links.all(pageId) });
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
export function usePropertyDefinitions(
  workspaceSlug: string,
  params?: { document_type?: string; is_system?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.document.propertyDefinitions.all(workspaceSlug),
    queryFn: () => documentPropertyDefinitionService.fetchAll(workspaceSlug, params),
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
    queryKey: queryKeys.document.propertyDefinitions.detail(propertyId),
    queryFn: () => documentPropertyDefinitionService.fetchById(workspaceSlug, propertyId),
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
      documentPropertyDefinitionService.create(workspaceSlug, data),
    onSuccess: (_data, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.propertyDefinitions.all(workspaceSlug) });
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
      documentPropertyDefinitionService.update(workspaceSlug, propertyId, data),
    onSettled: (_data, _error, { workspaceSlug, propertyId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.propertyDefinitions.all(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.propertyDefinitions.detail(propertyId) });
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
      documentPropertyDefinitionService.remove(workspaceSlug, propertyId),
    onMutate: async ({ workspaceSlug, propertyId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.document.propertyDefinitions.all(workspaceSlug) });

      const previousDefinitions = queryClient.getQueryData<TPropertyDefinition[]>(
        queryKeys.document.propertyDefinitions.all(workspaceSlug)
      );

      if (previousDefinitions) {
        queryClient.setQueryData<TPropertyDefinition[]>(
          queryKeys.document.propertyDefinitions.all(workspaceSlug),
          previousDefinitions.filter((d) => d.id !== propertyId)
        );
      }

      return { previousDefinitions, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousDefinitions && context.workspaceSlug) {
        queryClient.setQueryData(
          queryKeys.document.propertyDefinitions.all(context.workspaceSlug),
          context.previousDefinitions
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, propertyId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.propertyDefinitions.all(workspaceSlug) });
      void queryClient.removeQueries({ queryKey: queryKeys.document.propertyDefinitions.detail(propertyId) });
    },
  });
}

// ==========================================
// PAGE PROPERTY VALUE HOOKS (Unified Page Model)
// ==========================================

/**
 * Hook to fetch all property values for a document.
 *
 * @example
 * const { data: properties, isLoading } = usePageProperties(workspaceSlug, pageId);
 */
export function usePageProperties(workspaceSlug: string, pageId: string) {
  return useQuery({
    queryKey: queryKeys.document.properties.all(pageId),
    queryFn: () => documentPropertyValueService.fetchAll(workspaceSlug, pageId),
    enabled: !!workspaceSlug && !!pageId,
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface CreatePagePropertyParams {
  workspaceSlug: string;
  pageId: string;
  data: TDocumentPropertyValueFormData;
}

/**
 * Hook to set a property value on a document.
 */
export function useCreatePageProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, data }: CreatePagePropertyParams) =>
      documentPropertyValueService.create(workspaceSlug, pageId, data),
    onSuccess: (_data, { pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.properties.all(pageId) });
    },
  });
}

interface UpdatePagePropertyParams {
  workspaceSlug: string;
  pageId: string;
  propertyValueId: string;
  data: Partial<TDocumentPropertyValueFormData>;
}

/**
 * Hook to update a property value on a document.
 */
export function useUpdatePageProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, propertyValueId, data }: UpdatePagePropertyParams) =>
      documentPropertyValueService.update(workspaceSlug, pageId, propertyValueId, data),
    onMutate: async ({ pageId, propertyValueId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.document.properties.all(pageId) });

      const previousProperties = queryClient.getQueryData<TDocumentPropertyValue[]>(
        queryKeys.document.properties.all(pageId)
      );

      if (previousProperties) {
        queryClient.setQueryData<TDocumentPropertyValue[]>(
          queryKeys.document.properties.all(pageId),
          previousProperties.map((p) => (p.id === propertyValueId ? { ...p, ...data } : p))
        );
      }

      return { previousProperties, pageId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousProperties && context.pageId) {
        queryClient.setQueryData(queryKeys.document.properties.all(context.pageId), context.previousProperties);
      }
    },
    onSettled: (_data, _error, { pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.properties.all(pageId) });
    },
  });
}

interface DeletePagePropertyParams {
  workspaceSlug: string;
  pageId: string;
  propertyValueId: string;
}

/**
 * Hook to remove a property value from a document.
 */
export function useDeletePageProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, pageId, propertyValueId }: DeletePagePropertyParams) =>
      documentPropertyValueService.remove(workspaceSlug, pageId, propertyValueId),
    onMutate: async ({ pageId, propertyValueId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.document.properties.all(pageId) });

      const previousProperties = queryClient.getQueryData<TDocumentPropertyValue[]>(
        queryKeys.document.properties.all(pageId)
      );

      if (previousProperties) {
        queryClient.setQueryData<TDocumentPropertyValue[]>(
          queryKeys.document.properties.all(pageId),
          previousProperties.filter((p) => p.id !== propertyValueId)
        );
      }

      return { previousProperties, pageId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousProperties && context.pageId) {
        queryClient.setQueryData(queryKeys.document.properties.all(context.pageId), context.previousProperties);
      }
    },
    onSettled: (_data, _error, { pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.properties.all(pageId) });
    },
  });
}

interface BulkUpdatePagePropertiesParams {
  workspaceSlug: string;
  pageId: string;
  properties: Record<string, unknown>;
}

/**
 * Hook to bulk update multiple property values on a document.
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
      documentPropertyValueService.bulkUpdate(workspaceSlug, pageId, properties),
    onSuccess: (_data, { pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.document.properties.all(pageId) });
    },
  });
}
