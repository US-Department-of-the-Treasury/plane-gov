"use client";

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import type {
  TInboxIssue,
  TInboxIssueFilter,
  TInboxIssueSorting,
  TInboxIssueStatus,
  TIssue,
  TInboxIssueWithPagination,
} from "@plane/types";
import { EInboxIssueStatus } from "@plane/types";
import { InboxIssueService } from "@/services/inbox";
import { IssueService } from "@/services/issue";
import { queryKeys } from "./query-keys";

// Service instances
const inboxIssueService = new InboxIssueService();
const issueService = new IssueService();

/**
 * Hook to fetch inbox issues with filters and pagination.
 * Replaces MobX ProjectInboxStore.fetchInboxIssues for read operations.
 *
 * @example
 * const { data, isLoading } = useInboxIssues(workspaceSlug, projectId, filters, sorting);
 */
export function useInboxIssues(
  workspaceSlug: string,
  projectId: string,
  filters?: Partial<TInboxIssueFilter>,
  sorting?: Partial<TInboxIssueSorting>,
  perPageCount: number = 10
) {
  return useQuery({
    queryKey: queryKeys.inbox.filtered(workspaceSlug, projectId, { filters, sorting }),
    queryFn: async () => {
      const queryParams = buildInboxIssueQueryParams(filters ?? {}, sorting ?? {}, perPageCount, `${perPageCount}:0:0`);
      return inboxIssueService.list(workspaceSlug, projectId, queryParams);
    },
    enabled: !!workspaceSlug && !!projectId,
    staleTime: 1 * 60 * 1000, // 1 minute - inbox changes frequently
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch inbox issues with infinite pagination.
 * Replaces MobX ProjectInboxStore.fetchInboxPaginationIssues for paginated loads.
 *
 * @example
 * const { data, fetchNextPage, hasNextPage } = useInfiniteInboxIssues(workspaceSlug, projectId, filters, sorting);
 */
export function useInfiniteInboxIssues(
  workspaceSlug: string,
  projectId: string,
  filters?: Partial<TInboxIssueFilter>,
  sorting?: Partial<TInboxIssueSorting>,
  perPageCount: number = 10
) {
  return useInfiniteQuery({
    queryKey: queryKeys.inbox.filtered(workspaceSlug, projectId, { filters, sorting }),
    queryFn: async ({ pageParam = `${perPageCount}:0:0` }) => {
      const queryParams = buildInboxIssueQueryParams(filters ?? {}, sorting ?? {}, perPageCount, pageParam as string);
      return inboxIssueService.list(workspaceSlug, projectId, queryParams);
    },
    initialPageParam: `${perPageCount}:0:0`,
    getNextPageParam: (lastPage) => {
      if (lastPage.next_page_results && lastPage.next_cursor) {
        return lastPage.next_cursor;
      }
      return undefined;
    },
    enabled: !!workspaceSlug && !!projectId,
    staleTime: 1 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch a single inbox issue by ID.
 * Replaces MobX ProjectInboxStore.fetchInboxIssueById for read operations.
 *
 * @example
 * const { data: inboxIssue, isLoading } = useInboxIssue(workspaceSlug, projectId, inboxIssueId);
 */
export function useInboxIssue(workspaceSlug: string, projectId: string, inboxIssueId: string) {
  return useQuery({
    queryKey: queryKeys.inbox.detail(inboxIssueId),
    queryFn: () => inboxIssueService.retrieve(workspaceSlug, projectId, inboxIssueId),
    enabled: !!workspaceSlug && !!projectId && !!inboxIssueId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 30 * 60 * 1000,
  });
}

interface CreateInboxIssueParams {
  workspaceSlug: string;
  projectId: string;
  data: Partial<TIssue>;
}

/**
 * Hook to create a new inbox issue.
 * Replaces MobX ProjectInboxStore.createInboxIssue for write operations.
 *
 * @example
 * const { mutate: createInboxIssue, isPending } = useCreateInboxIssue();
 * createInboxIssue({ workspaceSlug, projectId, data: { name: "Issue title" } });
 */
export function useCreateInboxIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, data }: CreateInboxIssueParams) =>
      inboxIssueService.create(workspaceSlug, projectId, data),
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.inbox.all(workspaceSlug, projectId) });
    },
  });
}

interface UpdateInboxIssueStatusParams {
  workspaceSlug: string;
  projectId: string;
  inboxIssueId: string;
  status: TInboxIssueStatus;
}

/**
 * Hook to update inbox issue status (accept, decline, etc.).
 * Replaces MobX InboxIssueStore.updateInboxIssueStatus for write operations.
 *
 * @example
 * const { mutate: updateStatus, isPending } = useUpdateInboxIssueStatus();
 * updateStatus({ workspaceSlug, projectId, inboxIssueId, status: EInboxIssueStatus.ACCEPTED });
 */
export function useUpdateInboxIssueStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, inboxIssueId, status }: UpdateInboxIssueStatusParams) =>
      inboxIssueService.update(workspaceSlug, projectId, inboxIssueId, { status }),
    onMutate: async ({ inboxIssueId, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.inbox.detail(inboxIssueId) });

      const previousInboxIssue = queryClient.getQueryData<TInboxIssue>(queryKeys.inbox.detail(inboxIssueId));

      if (previousInboxIssue) {
        queryClient.setQueryData<TInboxIssue>(queryKeys.inbox.detail(inboxIssueId), {
          ...previousInboxIssue,
          status,
        });
      }

      return { previousInboxIssue, inboxIssueId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousInboxIssue && context.inboxIssueId) {
        queryClient.setQueryData(queryKeys.inbox.detail(context.inboxIssueId), context.previousInboxIssue);
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId, inboxIssueId, status }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.inbox.detail(inboxIssueId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.inbox.all(workspaceSlug, projectId) });

      // If issue accepted, invalidate issues list to show the newly accepted issue
      if (status === EInboxIssueStatus.ACCEPTED) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.issues.all(workspaceSlug, projectId) });
      }
    },
  });
}

interface UpdateInboxIssueDuplicateParams {
  workspaceSlug: string;
  projectId: string;
  inboxIssueId: string;
  duplicateToIssueId: string;
}

/**
 * Hook to mark inbox issue as duplicate of another issue.
 * Replaces MobX InboxIssueStore.updateInboxIssueDuplicateTo for write operations.
 *
 * @example
 * const { mutate: markAsDuplicate, isPending } = useUpdateInboxIssueDuplicate();
 * markAsDuplicate({ workspaceSlug, projectId, inboxIssueId, duplicateToIssueId });
 */
export function useUpdateInboxIssueDuplicate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, inboxIssueId, duplicateToIssueId }: UpdateInboxIssueDuplicateParams) =>
      inboxIssueService.update(workspaceSlug, projectId, inboxIssueId, {
        status: EInboxIssueStatus.DUPLICATE,
        duplicate_to: duplicateToIssueId,
      }),
    onMutate: async ({ inboxIssueId, duplicateToIssueId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.inbox.detail(inboxIssueId) });

      const previousInboxIssue = queryClient.getQueryData<TInboxIssue>(queryKeys.inbox.detail(inboxIssueId));

      if (previousInboxIssue) {
        queryClient.setQueryData<TInboxIssue>(queryKeys.inbox.detail(inboxIssueId), {
          ...previousInboxIssue,
          status: EInboxIssueStatus.DUPLICATE,
          duplicate_to: duplicateToIssueId,
        });
      }

      return { previousInboxIssue, inboxIssueId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousInboxIssue && context.inboxIssueId) {
        queryClient.setQueryData(queryKeys.inbox.detail(context.inboxIssueId), context.previousInboxIssue);
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId, inboxIssueId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.inbox.detail(inboxIssueId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.inbox.all(workspaceSlug, projectId) });
    },
  });
}

interface UpdateInboxIssueSnoozeParams {
  workspaceSlug: string;
  projectId: string;
  inboxIssueId: string;
  snoozedTill: Date | undefined;
}

/**
 * Hook to snooze/unsnooze an inbox issue.
 * Replaces MobX InboxIssueStore.updateInboxIssueSnoozeTill for write operations.
 *
 * @example
 * const { mutate: snoozeIssue, isPending } = useUpdateInboxIssueSnooze();
 * snoozeIssue({ workspaceSlug, projectId, inboxIssueId, snoozedTill: new Date() });
 */
export function useUpdateInboxIssueSnooze() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, inboxIssueId, snoozedTill }: UpdateInboxIssueSnoozeParams) => {
      const status = snoozedTill ? EInboxIssueStatus.SNOOZED : EInboxIssueStatus.PENDING;
      return inboxIssueService.update(workspaceSlug, projectId, inboxIssueId, {
        status,
        snoozed_till: snoozedTill || null,
      });
    },
    onMutate: async ({ inboxIssueId, snoozedTill }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.inbox.detail(inboxIssueId) });

      const previousInboxIssue = queryClient.getQueryData<TInboxIssue>(queryKeys.inbox.detail(inboxIssueId));
      const status = snoozedTill ? EInboxIssueStatus.SNOOZED : EInboxIssueStatus.PENDING;

      if (previousInboxIssue) {
        queryClient.setQueryData<TInboxIssue>(queryKeys.inbox.detail(inboxIssueId), {
          ...previousInboxIssue,
          status,
          snoozed_till: snoozedTill ?? null,
        });
      }

      return { previousInboxIssue, inboxIssueId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousInboxIssue && context.inboxIssueId) {
        queryClient.setQueryData(queryKeys.inbox.detail(context.inboxIssueId), context.previousInboxIssue);
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId, inboxIssueId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.inbox.detail(inboxIssueId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.inbox.all(workspaceSlug, projectId) });
    },
  });
}

interface UpdateInboxIssueParams {
  workspaceSlug: string;
  projectId: string;
  inboxIssueId: string;
  data: Partial<TIssue>;
}

/**
 * Hook to update inbox issue details.
 * Replaces MobX InboxIssueStore.updateIssue for write operations.
 *
 * @example
 * const { mutate: updateInboxIssue, isPending } = useUpdateInboxIssue();
 * updateInboxIssue({ workspaceSlug, projectId, inboxIssueId, data: { name: "Updated title" } });
 */
export function useUpdateInboxIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, inboxIssueId, data }: UpdateInboxIssueParams) =>
      inboxIssueService.updateIssue(workspaceSlug, projectId, inboxIssueId, data),
    onMutate: async ({ inboxIssueId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.inbox.detail(inboxIssueId) });

      const previousInboxIssue = queryClient.getQueryData<TInboxIssue>(queryKeys.inbox.detail(inboxIssueId));

      if (previousInboxIssue) {
        queryClient.setQueryData<TInboxIssue>(queryKeys.inbox.detail(inboxIssueId), {
          ...previousInboxIssue,
          issue: {
            ...previousInboxIssue.issue,
            ...data,
          },
        });
      }

      return { previousInboxIssue, inboxIssueId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousInboxIssue && context.inboxIssueId) {
        queryClient.setQueryData(queryKeys.inbox.detail(context.inboxIssueId), context.previousInboxIssue);
      }
    },
    onSettled: (data, _error, { workspaceSlug, projectId, inboxIssueId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.inbox.detail(inboxIssueId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.inbox.all(workspaceSlug, projectId) });

      // Invalidate issue activities after update
      const inboxIssue = data as TInboxIssue | undefined;
      if (inboxIssue?.issue?.id) {
        void queryClient.invalidateQueries({
          queryKey: [...queryKeys.issues.detail(inboxIssue.issue.id), "activities"]
        });
      }
    },
  });
}

interface UpdateProjectIssueFromInboxParams {
  workspaceSlug: string;
  projectId: string;
  inboxIssueId: string;
  issueId: string;
  data: Partial<TIssue>;
}

/**
 * Hook to update project issue from inbox (for accepted issues).
 * Replaces MobX InboxIssueStore.updateProjectIssue for write operations.
 *
 * @example
 * const { mutate: updateProjectIssue, isPending } = useUpdateProjectIssueFromInbox();
 * updateProjectIssue({ workspaceSlug, projectId, inboxIssueId, issueId, data: { state_id: "..." } });
 */
export function useUpdateProjectIssueFromInbox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceSlug, projectId, issueId, data }: UpdateProjectIssueFromInboxParams) => {
      // Update the project issue
      const updatedIssue = await issueService.patchIssue(workspaceSlug, projectId, issueId, data);

      // Handle sprint association if sprint_id is provided
      if (data.sprint_id) {
        await issueService.addIssueToSprint(workspaceSlug, projectId, data.sprint_id, { issues: [issueId] });
      }

      return updatedIssue;
    },
    onMutate: async ({ inboxIssueId, issueId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.inbox.detail(inboxIssueId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.issues.detail(issueId) });

      const previousInboxIssue = queryClient.getQueryData<TInboxIssue>(queryKeys.inbox.detail(inboxIssueId));
      const previousIssue = queryClient.getQueryData<TIssue>(queryKeys.issues.detail(issueId));

      if (previousInboxIssue) {
        queryClient.setQueryData<TInboxIssue>(queryKeys.inbox.detail(inboxIssueId), {
          ...previousInboxIssue,
          issue: {
            ...previousInboxIssue.issue,
            ...data,
          },
        });
      }

      if (previousIssue) {
        queryClient.setQueryData<TIssue>(queryKeys.issues.detail(issueId), {
          ...previousIssue,
          ...data,
        });
      }

      return { previousInboxIssue, previousIssue, inboxIssueId, issueId };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        if (context.previousInboxIssue && context.inboxIssueId) {
          queryClient.setQueryData(queryKeys.inbox.detail(context.inboxIssueId), context.previousInboxIssue);
        }
        if (context.previousIssue && context.issueId) {
          queryClient.setQueryData(queryKeys.issues.detail(context.issueId), context.previousIssue);
        }
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId, inboxIssueId, issueId, data }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.inbox.detail(inboxIssueId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.issues.detail(issueId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.issues.all(workspaceSlug, projectId) });

      // Invalidate sprint queries if sprint was updated
      if (data.sprint_id) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.issues.sprint(data.sprint_id) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.sprints.detail(data.sprint_id) });
      }

      // Invalidate issue activities after update
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.issues.detail(issueId), "activities"]
      });
    },
  });
}

interface DeleteInboxIssueParams {
  workspaceSlug: string;
  projectId: string;
  inboxIssueId: string;
}

/**
 * Hook to delete an inbox issue.
 * Replaces MobX ProjectInboxStore.deleteInboxIssue for write operations.
 *
 * @example
 * const { mutate: deleteInboxIssue, isPending } = useDeleteInboxIssue();
 * deleteInboxIssue({ workspaceSlug, projectId, inboxIssueId });
 */
export function useDeleteInboxIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, inboxIssueId }: DeleteInboxIssueParams) =>
      inboxIssueService.destroy(workspaceSlug, projectId, inboxIssueId),
    onSettled: (_data, _error, { workspaceSlug, projectId, inboxIssueId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.inbox.all(workspaceSlug, projectId) });
      void queryClient.removeQueries({ queryKey: queryKeys.inbox.detail(inboxIssueId) });
    },
  });
}

// ===========================
// UTILITY FUNCTIONS
// ===========================

/**
 * Build query parameters for inbox issue list API.
 * Replicates the logic from MobX ProjectInboxStore.inboxIssueQueryParams.
 */
function buildInboxIssueQueryParams(
  filters: Partial<TInboxIssueFilter>,
  sorting: Partial<TInboxIssueSorting>,
  perPageCount: number,
  cursor: string
): Record<string, unknown> {
  const queryParams: Record<string, unknown> = {};

  // Handle filters
  if (filters && Object.keys(filters).length > 0) {
    Object.keys(filters).forEach((key) => {
      const filterKey = key as keyof TInboxIssueFilter;
      const filterValue = filters[filterKey];

      if (filterValue && Array.isArray(filterValue) && filterValue.length > 0) {
        queryParams[filterKey] = filterValue.join(",");
      }
    });
  }

  // Handle sorting
  let orderBy = "-issue__created_at"; // Default sorting

  if (sorting?.order_by && sorting?.sort_by) {
    switch (sorting.order_by) {
      case "issue__created_at":
        orderBy = sorting.sort_by === "desc" ? "-issue__created_at" : "issue__created_at";
        break;
      case "issue__updated_at":
        orderBy = sorting.sort_by === "desc" ? "-issue__updated_at" : "issue__updated_at";
        break;
      case "issue__sequence_id":
        orderBy = sorting.sort_by === "desc" ? "-issue__sequence_id" : "issue__sequence_id";
        break;
      default:
        orderBy = "-issue__created_at";
        break;
    }
  }

  return {
    ...queryParams,
    order_by: orderBy,
    per_page: perPageCount,
    cursor,
  };
}

/**
 * Get inbox issue by ID from inbox issues list.
 *
 * @example
 * const { data: inboxIssues } = useInboxIssues(workspaceSlug, projectId);
 * const inboxIssue = getInboxIssueById(inboxIssues?.results, issueId);
 */
export function getInboxIssueById(
  inboxIssues: TInboxIssue[] | undefined,
  issueId: string | null | undefined
): TInboxIssue | undefined {
  if (!inboxIssues || !issueId) return undefined;
  return inboxIssues.find((inbox) => inbox.issue?.id === issueId);
}

/**
 * Get inbox issue IDs from inbox issues list.
 *
 * @example
 * const { data: inboxIssues } = useInboxIssues(workspaceSlug, projectId);
 * const issueIds = getInboxIssueIds(inboxIssues?.results);
 */
export function getInboxIssueIds(inboxIssues: TInboxIssue[] | undefined): string[] {
  if (!inboxIssues) return [];
  return inboxIssues.map((inbox) => inbox.issue?.id).filter((id): id is string => !!id);
}
