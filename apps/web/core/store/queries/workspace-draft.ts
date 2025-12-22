"use client";

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import type { TIssue, TWorkspaceDraftIssue, TWorkspaceDraftPaginationInfo } from "@plane/types";
import workspaceDraftService from "@/services/issue/workspace_draft.service";
import { queryKeys } from "./query-keys";

/**
 * Hook to fetch workspace draft issues with pagination.
 *
 * @example
 * const { data, isLoading } = useWorkspaceDraftIssues(workspaceSlug, { per_page: 50 });
 */
export function useWorkspaceDraftIssues(workspaceSlug: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.workspaceDrafts.filtered(workspaceSlug, params ?? {}),
    queryFn: () => workspaceDraftService.getIssues(workspaceSlug, params),
    enabled: !!workspaceSlug,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch workspace draft issues with infinite scroll pagination.
 *
 * @example
 * const { data, fetchNextPage, hasNextPage } = useInfiniteWorkspaceDraftIssues(workspaceSlug);
 */
export function useInfiniteWorkspaceDraftIssues(workspaceSlug: string, filterParams?: Record<string, unknown>) {
  return useInfiniteQuery({
    queryKey: queryKeys.workspaceDrafts.filtered(workspaceSlug, filterParams ?? {}),
    queryFn: ({ pageParam }) =>
      workspaceDraftService.getIssues(workspaceSlug, {
        per_page: 50,
        cursor: pageParam,
        ...filterParams,
      }),
    enabled: !!workspaceSlug,
    initialPageParam: "50:0:0",
    getNextPageParam: (lastPage) => {
      if (!lastPage?.next_cursor) return undefined;
      return lastPage.next_cursor;
    },
    staleTime: 1 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch a single workspace draft issue by ID.
 *
 * @example
 * const { data: issue, isLoading } = useWorkspaceDraftIssue(workspaceSlug, issueId);
 */
export function useWorkspaceDraftIssue(workspaceSlug: string, issueId: string) {
  return useQuery({
    queryKey: queryKeys.workspaceDrafts.detail(issueId),
    queryFn: () => workspaceDraftService.getIssueById(workspaceSlug, issueId),
    enabled: !!workspaceSlug && !!issueId,
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface CreateWorkspaceDraftIssueParams {
  workspaceSlug: string;
  data: Partial<TWorkspaceDraftIssue | TIssue>;
}

/**
 * Hook to create a new workspace draft issue with optimistic updates.
 *
 * @example
 * const { mutate: createDraft, isPending } = useCreateWorkspaceDraftIssue();
 * createDraft({ workspaceSlug, data: { name: "Draft title" } });
 */
export function useCreateWorkspaceDraftIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, data }: CreateWorkspaceDraftIssueParams) =>
      workspaceDraftService.createIssue(workspaceSlug, data),
    onSuccess: (newIssue, { workspaceSlug }) => {
      if (!newIssue) return;

      // Optimistically update the cache with the new issue
      queryClient.setQueriesData<TWorkspaceDraftPaginationInfo<TWorkspaceDraftIssue>>(
        { queryKey: queryKeys.workspaceDrafts.all(workspaceSlug), exact: false },
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            results: [newIssue, ...(oldData.results ?? [])],
            total_count: (oldData.total_count ?? 0) + 1,
          } as TWorkspaceDraftPaginationInfo<TWorkspaceDraftIssue>;
        }
      );
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceDrafts.all(workspaceSlug) });
    },
  });
}

interface UpdateWorkspaceDraftIssueParams {
  workspaceSlug: string;
  issueId: string;
  data: Partial<TWorkspaceDraftIssue | TIssue>;
}

/**
 * Hook to update a workspace draft issue with optimistic updates.
 *
 * @example
 * const { mutate: updateDraft, isPending } = useUpdateWorkspaceDraftIssue();
 * updateDraft({ workspaceSlug, issueId, data: { name: "Updated title" } });
 */
export function useUpdateWorkspaceDraftIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, issueId, data }: UpdateWorkspaceDraftIssueParams) =>
      workspaceDraftService.updateIssue(workspaceSlug, issueId, data),
    onMutate: async ({ issueId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.workspaceDrafts.detail(issueId) });

      const previousIssue = queryClient.getQueryData<TWorkspaceDraftIssue>(queryKeys.workspaceDrafts.detail(issueId));

      if (previousIssue) {
        queryClient.setQueryData<TWorkspaceDraftIssue>(queryKeys.workspaceDrafts.detail(issueId), {
          ...previousIssue,
          ...(data as Partial<TWorkspaceDraftIssue>),
          updated_at: new Date().toISOString(),
        });
      }

      return { previousIssue, issueId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousIssue && context.issueId) {
        queryClient.setQueryData(queryKeys.workspaceDrafts.detail(context.issueId), context.previousIssue);
      }
    },
    onSettled: (_data, _error, { workspaceSlug, issueId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceDrafts.detail(issueId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceDrafts.all(workspaceSlug) });
    },
  });
}

interface DeleteWorkspaceDraftIssueParams {
  workspaceSlug: string;
  issueId: string;
}

/**
 * Hook to delete a workspace draft issue.
 *
 * @example
 * const { mutate: deleteDraft, isPending } = useDeleteWorkspaceDraftIssue();
 * deleteDraft({ workspaceSlug, issueId });
 */
export function useDeleteWorkspaceDraftIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, issueId }: DeleteWorkspaceDraftIssueParams) =>
      workspaceDraftService.deleteIssue(workspaceSlug, issueId),
    onMutate: async ({ workspaceSlug, issueId }) => {
      // Optimistically remove from list queries
      queryClient.setQueriesData<TWorkspaceDraftPaginationInfo<TWorkspaceDraftIssue>>(
        { queryKey: queryKeys.workspaceDrafts.all(workspaceSlug), exact: false },
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            results: (oldData.results ?? []).filter((issue) => issue.id !== issueId),
            total_count: Math.max((oldData.total_count ?? 0) - 1, 0),
          } as TWorkspaceDraftPaginationInfo<TWorkspaceDraftIssue>;
        }
      );
    },
    onSettled: (_data, _error, { workspaceSlug, issueId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceDrafts.all(workspaceSlug) });
      void queryClient.removeQueries({ queryKey: queryKeys.workspaceDrafts.detail(issueId) });
    },
  });
}

interface MoveWorkspaceDraftIssueParams {
  workspaceSlug: string;
  issueId: string;
  data: Partial<TWorkspaceDraftIssue>;
}

/**
 * Hook to move a workspace draft issue to a regular issue.
 *
 * @example
 * const { mutate: moveDraft, isPending } = useMoveWorkspaceDraftIssue();
 * moveDraft({ workspaceSlug, issueId, data: { project_id: "..." } });
 */
export function useMoveWorkspaceDraftIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, issueId, data }: MoveWorkspaceDraftIssueParams) =>
      workspaceDraftService.moveIssue(workspaceSlug, issueId, data),
    onMutate: async ({ workspaceSlug, issueId }) => {
      // Optimistically remove from draft list queries
      queryClient.setQueriesData<TWorkspaceDraftPaginationInfo<TWorkspaceDraftIssue>>(
        { queryKey: queryKeys.workspaceDrafts.all(workspaceSlug), exact: false },
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            results: (oldData.results ?? []).filter((issue) => issue.id !== issueId),
            total_count: Math.max((oldData.total_count ?? 0) - 1, 0),
          } as TWorkspaceDraftPaginationInfo<TWorkspaceDraftIssue>;
        }
      );
    },
    onSettled: (data, _error, { workspaceSlug, issueId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceDrafts.all(workspaceSlug) });
      void queryClient.removeQueries({ queryKey: queryKeys.workspaceDrafts.detail(issueId) });
      // If the issue was moved to a project, invalidate that project's issues
      const movedIssue = data as TIssue | undefined;
      if (movedIssue?.project_id) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.issues.all(workspaceSlug, movedIssue.project_id) });
      }
    },
  });
}
