"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TIssue, TIssueLink, TIssueParams, TBulkOperationsPayload } from "@plane/types";
import { IssueService } from "@/services/issue/issue.service";
import { queryKeys } from "./query-keys";

// Service instance
const issueService = new IssueService();

/**
 * Hook to fetch a single issue by ID.
 * Replaces MobX IssueStore.getIssueById for read operations.
 *
 * @example
 * const { data: issue, isLoading } = useIssue(workspaceSlug, projectId, issueId);
 */
export function useIssue(workspaceSlug: string, projectId: string, issueId: string) {
  return useQuery({
    queryKey: queryKeys.issues.detail(issueId),
    queryFn: () => issueService.retrieve(workspaceSlug, projectId, issueId),
    enabled: !!workspaceSlug && !!projectId && !!issueId,
    staleTime: 2 * 60 * 1000, // 2 minutes - issues change frequently
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch an issue by identifier (e.g., "PRJ-123").
 *
 * @example
 * const { data: issue, isLoading } = useIssueByIdentifier(workspaceSlug, projectIdentifier, sequenceId);
 */
export function useIssueByIdentifier(workspaceSlug: string, projectIdentifier: string, sequenceId: string) {
  return useQuery({
    queryKey: ["issues", "identifier", `${projectIdentifier}-${sequenceId}`],
    queryFn: () => issueService.retrieveWithIdentifier(workspaceSlug, projectIdentifier, sequenceId),
    enabled: !!workspaceSlug && !!projectIdentifier && !!sequenceId,
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch issues for a project with optional filters.
 *
 * @example
 * const { data: issues, isLoading } = useIssues(workspaceSlug, projectId, { state: "backlog" });
 */
export function useIssues(
  workspaceSlug: string,
  projectId: string,
  filters?: Partial<Record<TIssueParams, string | boolean>>
) {
  return useQuery({
    queryKey: queryKeys.issues.filtered(workspaceSlug, projectId, filters ?? {}),
    queryFn: () => issueService.getIssues(workspaceSlug, projectId, filters),
    enabled: !!workspaceSlug && !!projectId,
    staleTime: 1 * 60 * 1000, // 1 minute - issue lists change frequently
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch issues for a sprint.
 *
 * @example
 * const { data: issues, isLoading } = useSprintIssues(workspaceSlug, projectId, sprintId);
 */
export function useSprintIssues(workspaceSlug: string, projectId: string, sprintId: string) {
  return useQuery({
    queryKey: queryKeys.issues.sprint(sprintId),
    queryFn: () => issueService.getIssues(workspaceSlug, projectId, { sprint: sprintId } as Record<string, string>),
    enabled: !!workspaceSlug && !!projectId && !!sprintId,
    staleTime: 1 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch issues for a module.
 *
 * @example
 * const { data: issues, isLoading } = useModuleIssues(workspaceSlug, projectId, moduleId);
 */
export function useModuleIssues(workspaceSlug: string, projectId: string, moduleId: string) {
  return useQuery({
    queryKey: queryKeys.issues.module(moduleId),
    queryFn: () => issueService.getIssues(workspaceSlug, projectId, { module: moduleId } as Record<string, string>),
    enabled: !!workspaceSlug && !!projectId && !!moduleId,
    staleTime: 1 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface CreateIssueParams {
  workspaceSlug: string;
  projectId: string;
  data: Partial<TIssue>;
}

/**
 * Hook to create a new issue with optimistic updates.
 *
 * @example
 * const { mutate: createIssue, isPending } = useCreateIssue();
 * createIssue({ workspaceSlug, projectId, data: { name: "Issue title", state_id: "..." } });
 */
export function useCreateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, data }: CreateIssueParams) =>
      issueService.createIssue(workspaceSlug, projectId, data),
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      // Invalidate all issue queries for this project
      void queryClient.invalidateQueries({ queryKey: queryKeys.issues.all(workspaceSlug, projectId) });
    },
  });
}

interface UpdateIssueParams {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  data: Partial<TIssue>;
}

/**
 * Hook to update an issue with optimistic updates.
 *
 * @example
 * const { mutate: updateIssue, isPending } = useUpdateIssue();
 * updateIssue({ workspaceSlug, projectId, issueId, data: { name: "Updated title" } });
 */
export function useUpdateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, issueId, data }: UpdateIssueParams) =>
      issueService.patchIssue(workspaceSlug, projectId, issueId, data),
    onMutate: async ({ issueId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.issues.detail(issueId) });

      const previousIssue = queryClient.getQueryData<TIssue>(queryKeys.issues.detail(issueId));

      if (previousIssue) {
        queryClient.setQueryData<TIssue>(queryKeys.issues.detail(issueId), {
          ...previousIssue,
          ...data,
          updated_at: new Date().toISOString(),
        });
      }

      return { previousIssue, issueId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousIssue && context.issueId) {
        queryClient.setQueryData(queryKeys.issues.detail(context.issueId), context.previousIssue);
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId, issueId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issues.detail(issueId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.issues.all(workspaceSlug, projectId) });
    },
  });
}

interface DeleteIssueParams {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
}

/**
 * Hook to delete an issue.
 *
 * @example
 * const { mutate: deleteIssue, isPending } = useDeleteIssue();
 * deleteIssue({ workspaceSlug, projectId, issueId });
 */
export function useDeleteIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, issueId }: DeleteIssueParams) =>
      issueService.deleteIssue(workspaceSlug, projectId, issueId),
    onSettled: (_data, _error, { workspaceSlug, projectId, issueId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issues.all(workspaceSlug, projectId) });
      void queryClient.removeQueries({ queryKey: queryKeys.issues.detail(issueId) });
    },
  });
}

/**
 * Hook to fetch issue activities/history.
 *
 * @example
 * const { data: activities, isLoading } = useIssueActivities(workspaceSlug, projectId, issueId);
 */
export function useIssueActivities(workspaceSlug: string, projectId: string, issueId: string) {
  return useQuery({
    queryKey: [...queryKeys.issues.detail(issueId), "activities"],
    queryFn: () => issueService.getIssueActivities(workspaceSlug, projectId, issueId),
    enabled: !!workspaceSlug && !!projectId && !!issueId,
    staleTime: 1 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch sub-issues for a parent issue.
 *
 * @example
 * const { data: subIssues, isLoading } = useSubIssues(workspaceSlug, projectId, issueId);
 */
export function useSubIssues(workspaceSlug: string, projectId: string, issueId: string) {
  return useQuery({
    queryKey: [...queryKeys.issues.detail(issueId), "sub-issues"],
    queryFn: () => issueService.subIssues(workspaceSlug, projectId, issueId),
    enabled: !!workspaceSlug && !!projectId && !!issueId,
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface AddSubIssuesParams {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  subIssueIds: string[];
}

/**
 * Hook to add sub-issues to a parent issue.
 *
 * @example
 * const { mutate: addSubIssues, isPending } = useAddSubIssues();
 * addSubIssues({ workspaceSlug, projectId, issueId, subIssueIds: ["id1", "id2"] });
 */
export function useAddSubIssues() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, issueId, subIssueIds }: AddSubIssuesParams) =>
      issueService.addSubIssues(workspaceSlug, projectId, issueId, { sub_issue_ids: subIssueIds }),
    onSettled: (_data, _error, { issueId }) => {
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.issues.detail(issueId), "sub-issues"] });
    },
  });
}

/**
 * Hook to fetch issue links.
 *
 * @example
 * const { data: links, isLoading } = useIssueLinks(workspaceSlug, projectId, issueId);
 */
export function useIssueLinks(workspaceSlug: string, projectId: string, issueId: string) {
  return useQuery({
    queryKey: [...queryKeys.issues.detail(issueId), "links"],
    queryFn: () => issueService.fetchIssueLinks(workspaceSlug, projectId, issueId),
    enabled: !!workspaceSlug && !!projectId && !!issueId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface CreateIssueLinkParams {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  data: Partial<TIssueLink>;
}

/**
 * Hook to create an issue link.
 *
 * @example
 * const { mutate: createLink, isPending } = useCreateIssueLink();
 * createLink({ workspaceSlug, projectId, issueId, data: { url: "https://...", title: "Link" } });
 */
export function useCreateIssueLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, issueId, data }: CreateIssueLinkParams) =>
      issueService.createIssueLink(workspaceSlug, projectId, issueId, data),
    onSettled: (_data, _error, { issueId }) => {
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.issues.detail(issueId), "links"] });
    },
  });
}

interface UpdateIssueLinkParams {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  linkId: string;
  data: Partial<TIssueLink>;
}

/**
 * Hook to update an issue link with optimistic updates.
 *
 * @example
 * const { mutate: updateLink, isPending } = useUpdateIssueLink();
 * updateLink({ workspaceSlug, projectId, issueId, linkId, data: { title: "Updated" } });
 */
export function useUpdateIssueLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, issueId, linkId, data }: UpdateIssueLinkParams) =>
      issueService.updateIssueLink(workspaceSlug, projectId, issueId, linkId, data),
    onMutate: async ({ issueId, linkId, data }) => {
      const queryKey = [...queryKeys.issues.detail(issueId), "links"];
      await queryClient.cancelQueries({ queryKey });

      const previousLinks = queryClient.getQueryData<TIssueLink[]>(queryKey);

      if (previousLinks) {
        queryClient.setQueryData<TIssueLink[]>(
          queryKey,
          previousLinks.map((link) => (link.id === linkId ? { ...link, ...data } : link))
        );
      }

      return { previousLinks, issueId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousLinks && context.issueId) {
        const queryKey = [...queryKeys.issues.detail(context.issueId), "links"];
        queryClient.setQueryData(queryKey, context.previousLinks);
      }
    },
    onSettled: (_data, _error, { issueId }) => {
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.issues.detail(issueId), "links"] });
    },
  });
}

interface DeleteIssueLinkParams {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  linkId: string;
}

/**
 * Hook to delete an issue link with optimistic updates.
 *
 * @example
 * const { mutate: deleteLink, isPending } = useDeleteIssueLink();
 * deleteLink({ workspaceSlug, projectId, issueId, linkId });
 */
export function useDeleteIssueLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, issueId, linkId }: DeleteIssueLinkParams) =>
      issueService.deleteIssueLink(workspaceSlug, projectId, issueId, linkId),
    onMutate: async ({ issueId, linkId }) => {
      const queryKey = [...queryKeys.issues.detail(issueId), "links"];
      await queryClient.cancelQueries({ queryKey });

      const previousLinks = queryClient.getQueryData<TIssueLink[]>(queryKey);

      if (previousLinks) {
        queryClient.setQueryData<TIssueLink[]>(
          queryKey,
          previousLinks.filter((link) => link.id !== linkId)
        );
      }

      return { previousLinks, issueId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousLinks && context.issueId) {
        const queryKey = [...queryKeys.issues.detail(context.issueId), "links"];
        queryClient.setQueryData(queryKey, context.previousLinks);
      }
    },
    onSettled: (_data, _error, { issueId }) => {
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.issues.detail(issueId), "links"] });
    },
  });
}

/**
 * Hook to fetch issue subscription status.
 *
 * @example
 * const { data: subscription, isLoading } = useIssueSubscription(workspaceSlug, projectId, issueId);
 */
export function useIssueSubscription(workspaceSlug: string, projectId: string, issueId: string) {
  return useQuery({
    queryKey: [...queryKeys.issues.detail(issueId), "subscription"],
    queryFn: () => issueService.getIssueNotificationSubscriptionStatus(workspaceSlug, projectId, issueId),
    enabled: !!workspaceSlug && !!projectId && !!issueId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface ToggleSubscriptionParams {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  subscribed: boolean;
}

/**
 * Hook to toggle issue subscription with optimistic updates.
 *
 * @example
 * const { mutate: toggleSubscription, isPending } = useToggleIssueSubscription();
 * toggleSubscription({ workspaceSlug, projectId, issueId, subscribed: true });
 */
export function useToggleIssueSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, issueId, subscribed }: ToggleSubscriptionParams) =>
      subscribed
        ? issueService.subscribeToIssueNotifications(workspaceSlug, projectId, issueId)
        : issueService.unsubscribeFromIssueNotifications(workspaceSlug, projectId, issueId),
    onMutate: async ({ issueId, subscribed }) => {
      const queryKey = [...queryKeys.issues.detail(issueId), "subscription"];
      await queryClient.cancelQueries({ queryKey });

      const previousStatus = queryClient.getQueryData<{ subscribed: boolean }>(queryKey);

      queryClient.setQueryData<{ subscribed: boolean }>(queryKey, { subscribed });

      return { previousStatus, issueId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousStatus && context.issueId) {
        const queryKey = [...queryKeys.issues.detail(context.issueId), "subscription"];
        queryClient.setQueryData(queryKey, context.previousStatus);
      }
    },
    onSettled: (_data, _error, { issueId }) => {
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.issues.detail(issueId), "subscription"] });
    },
  });
}

interface BulkOperationParams {
  workspaceSlug: string;
  projectId: string;
  data: TBulkOperationsPayload;
}

/**
 * Hook to perform bulk operations on issues.
 *
 * @example
 * const { mutate: bulkUpdate, isPending } = useBulkIssueOperations();
 * bulkUpdate({ workspaceSlug, projectId, data: { issue_ids: [...], properties: { state_id: "..." } } });
 */
export function useBulkIssueOperations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, data }: BulkOperationParams) =>
      issueService.bulkOperations(workspaceSlug, projectId, data),
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issues.all(workspaceSlug, projectId) });
    },
  });
}

interface BulkDeleteParams {
  workspaceSlug: string;
  projectId: string;
  issueIds: string[];
}

/**
 * Hook to bulk delete issues.
 *
 * @example
 * const { mutate: bulkDelete, isPending } = useBulkDeleteIssues();
 * bulkDelete({ workspaceSlug, projectId, issueIds: ["id1", "id2"] });
 */
export function useBulkDeleteIssues() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, issueIds }: BulkDeleteParams) =>
      issueService.bulkDeleteIssues(workspaceSlug, projectId, { issue_ids: issueIds }),
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issues.all(workspaceSlug, projectId) });
    },
  });
}

interface BulkArchiveParams {
  workspaceSlug: string;
  projectId: string;
  issueIds: string[];
}

/**
 * Hook to bulk archive issues.
 *
 * @example
 * const { mutate: bulkArchive, isPending } = useBulkArchiveIssues();
 * bulkArchive({ workspaceSlug, projectId, issueIds: ["id1", "id2"] });
 */
export function useBulkArchiveIssues() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, issueIds }: BulkArchiveParams) =>
      issueService.bulkArchiveIssues(workspaceSlug, projectId, { issue_ids: issueIds }),
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issues.all(workspaceSlug, projectId) });
    },
  });
}

interface AddIssueToSprintParams {
  workspaceSlug: string;
  projectId: string;
  sprintId: string;
  issueIds: string[];
}

/**
 * Hook to add issues to a sprint.
 *
 * @example
 * const { mutate: addToSprint, isPending } = useAddIssueToSprint();
 * addToSprint({ workspaceSlug, projectId, sprintId, issueIds: ["id1", "id2"] });
 */
export function useAddIssueToSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, sprintId, issueIds }: AddIssueToSprintParams) =>
      issueService.addIssueToSprint(workspaceSlug, projectId, sprintId, { issues: issueIds }),
    onSettled: (_data, _error, { workspaceSlug, projectId, sprintId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issues.sprint(sprintId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.issues.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.sprints.detail(sprintId) });
    },
  });
}

interface RemoveIssueFromSprintParams {
  workspaceSlug: string;
  projectId: string;
  sprintId: string;
  bridgeId: string;
}

/**
 * Hook to remove an issue from a sprint.
 *
 * @example
 * const { mutate: removeFromSprint, isPending } = useRemoveIssueFromSprint();
 * removeFromSprint({ workspaceSlug, projectId, sprintId, bridgeId });
 */
export function useRemoveIssueFromSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, sprintId, bridgeId }: RemoveIssueFromSprintParams) =>
      issueService.removeIssueFromSprint(workspaceSlug, projectId, sprintId, bridgeId),
    onSettled: (_data, _error, { workspaceSlug, projectId, sprintId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issues.sprint(sprintId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.issues.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.sprints.detail(sprintId) });
    },
  });
}
