"use client";

import type { AxiosProgressEvent } from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  TIssue,
  TIssueAttachment,
  TIssueComment,
  TIssueCommentReaction,
  TIssueLink,
  TIssueReaction,
  TIssueRelation,
  TIssueSubIssues,
  TIssueActivity,
  TIssueServiceType,
  TIssueRelationTypes,
} from "@plane/types";
import { IssueService } from "@/services/issue/issue.service";
import { IssueAttachmentService } from "@/services/issue/issue_attachment.service";
import { IssueCommentService } from "@/services/issue/issue_comment.service";
import { IssueReactionService } from "@/services/issue/issue_reaction.service";
import { IssueRelationService } from "@/services/issue/issue_relation.service";
import { IssueActivityService } from "@/services/issue/issue_activity.service";
import { queryKeys } from "./query-keys";

// ============================================================================
// SERVICE INSTANCES
// ============================================================================

const createIssueService = (serviceType: TIssueServiceType) => new IssueService(serviceType);
const createAttachmentService = (serviceType: TIssueServiceType) => new IssueAttachmentService(serviceType);
const createCommentService = (serviceType: TIssueServiceType) => new IssueCommentService(serviceType);
const createReactionService = (serviceType?: TIssueServiceType) => new IssueReactionService(serviceType);
const createRelationService = () => new IssueRelationService();
const createActivityService = (serviceType: TIssueServiceType) => new IssueActivityService(serviceType);

// ============================================================================
// SUBSCRIPTION HOOKS
// ============================================================================

/**
 * Hook to fetch issue subscription status.
 *
 * @example
 * const { data: isSubscribed } = useIssueSubscription(workspaceSlug, projectId, issueId);
 */
export function useIssueSubscription(
  workspaceSlug: string | undefined,
  projectId: string | undefined,
  issueId: string | undefined,
  serviceType: TIssueServiceType
) {
  const issueService = createIssueService(serviceType);

  return useQuery({
    queryKey: queryKeys.issueDetails.subscription(issueId ?? ""),
    queryFn: () => issueService.getIssueNotificationSubscriptionStatus(workspaceSlug!, projectId!, issueId!),
    enabled: !!workspaceSlug && !!projectId && !!issueId,
    select: (data) => data?.subscribed,
    staleTime: 30 * 1000, // 30 seconds
  });
}

interface SubscribeParams {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
}

/**
 * Hook to subscribe to issue notifications with optimistic updates.
 *
 * @example
 * const { mutate: subscribe } = useSubscribeToIssue(serviceType);
 * subscribe({ workspaceSlug, projectId, issueId });
 */
export function useSubscribeToIssue(serviceType: TIssueServiceType) {
  const queryClient = useQueryClient();
  const issueService = createIssueService(serviceType);

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, issueId }: SubscribeParams) =>
      issueService.subscribeToIssueNotifications(workspaceSlug, projectId, issueId),
    onMutate: async ({ issueId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.issueDetails.subscription(issueId) });

      const previousSubscription = queryClient.getQueryData<{ subscribed: boolean }>(
        queryKeys.issueDetails.subscription(issueId)
      );

      queryClient.setQueryData<{ subscribed: boolean }>(queryKeys.issueDetails.subscription(issueId), {
        subscribed: true,
      });

      return { previousSubscription, issueId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousSubscription) {
        queryClient.setQueryData(queryKeys.issueDetails.subscription(context.issueId), context.previousSubscription);
      }
    },
    onSettled: (_data, _error, { issueId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetails.subscription(issueId) });
    },
  });
}

/**
 * Hook to unsubscribe from issue notifications with optimistic updates.
 *
 * @example
 * const { mutate: unsubscribe } = useUnsubscribeFromIssue(serviceType);
 * unsubscribe({ workspaceSlug, projectId, issueId });
 */
export function useUnsubscribeFromIssue(serviceType: TIssueServiceType) {
  const queryClient = useQueryClient();
  const issueService = createIssueService(serviceType);

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, issueId }: SubscribeParams) =>
      issueService.unsubscribeFromIssueNotifications(workspaceSlug, projectId, issueId),
    onMutate: async ({ issueId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.issueDetails.subscription(issueId) });

      const previousSubscription = queryClient.getQueryData<{ subscribed: boolean }>(
        queryKeys.issueDetails.subscription(issueId)
      );

      queryClient.setQueryData<{ subscribed: boolean }>(queryKeys.issueDetails.subscription(issueId), {
        subscribed: false,
      });

      return { previousSubscription, issueId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousSubscription) {
        queryClient.setQueryData(queryKeys.issueDetails.subscription(context.issueId), context.previousSubscription);
      }
    },
    onSettled: (_data, _error, { issueId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetails.subscription(issueId) });
    },
  });
}

// ============================================================================
// LINK HOOKS
// ============================================================================

/**
 * Hook to fetch issue links.
 *
 * @example
 * const { data: links } = useIssueLinks(workspaceSlug, projectId, issueId, serviceType);
 */
export function useIssueLinks(
  workspaceSlug: string | undefined,
  projectId: string | undefined,
  issueId: string | undefined,
  serviceType: TIssueServiceType
) {
  const issueService = createIssueService(serviceType);

  return useQuery({
    queryKey: queryKeys.issueDetails.links(issueId ?? ""),
    queryFn: () => issueService.fetchIssueLinks(workspaceSlug!, projectId!, issueId!),
    enabled: !!workspaceSlug && !!projectId && !!issueId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

interface CreateLinkParams {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  data: Partial<TIssueLink>;
}

/**
 * Hook to create an issue link with optimistic updates.
 *
 * @example
 * const { mutate: createLink } = useCreateIssueLink(serviceType);
 * createLink({ workspaceSlug, projectId, issueId, data: { url: "https://..." } });
 */
export function useCreateIssueLink(serviceType: TIssueServiceType) {
  const queryClient = useQueryClient();
  const issueService = createIssueService(serviceType);

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, issueId, data }: CreateLinkParams) =>
      issueService.createIssueLink(workspaceSlug, projectId, issueId, data),
    onMutate: async ({ issueId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.issueDetails.links(issueId) });

      const previousLinks = queryClient.getQueryData<TIssueLink[]>(queryKeys.issueDetails.links(issueId));

      if (previousLinks) {
        const optimisticLink: TIssueLink = {
          id: `temp-${Date.now()}`,
          url: data.url ?? "",
          title: data.title ?? "",
          metadata: data.metadata ?? {},
          created_at: new Date(),
          created_by_id: "",
          issue_id: issueId,
        };

        queryClient.setQueryData<TIssueLink[]>(queryKeys.issueDetails.links(issueId), [
          ...previousLinks,
          optimisticLink,
        ]);
      }

      return { previousLinks, issueId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousLinks) {
        queryClient.setQueryData(queryKeys.issueDetails.links(context.issueId), context.previousLinks);
      }
    },
    onSettled: (_data, _error, { issueId, projectId, workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetails.links(issueId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetails.activities(issueId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.issues.detail(issueId) });
    },
  });
}

interface UpdateLinkParams {
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
 * const { mutate: updateLink } = useUpdateIssueLink(serviceType);
 * updateLink({ workspaceSlug, projectId, issueId, linkId, data: { title: "Updated" } });
 */
export function useUpdateIssueLink(serviceType: TIssueServiceType) {
  const queryClient = useQueryClient();
  const issueService = createIssueService(serviceType);

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, issueId, linkId, data }: UpdateLinkParams) =>
      issueService.updateIssueLink(workspaceSlug, projectId, issueId, linkId, data),
    onMutate: async ({ issueId, linkId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.issueDetails.links(issueId) });

      const previousLinks = queryClient.getQueryData<TIssueLink[]>(queryKeys.issueDetails.links(issueId));

      if (previousLinks) {
        queryClient.setQueryData<TIssueLink[]>(
          queryKeys.issueDetails.links(issueId),
          previousLinks.map((link) => (link.id === linkId ? { ...link, ...data } : link))
        );
      }

      return { previousLinks, issueId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousLinks) {
        queryClient.setQueryData(queryKeys.issueDetails.links(context.issueId), context.previousLinks);
      }
    },
    onSettled: (_data, _error, { issueId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetails.links(issueId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetails.activities(issueId) });
    },
  });
}

interface DeleteLinkParams {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  linkId: string;
}

/**
 * Hook to delete an issue link with optimistic updates.
 *
 * @example
 * const { mutate: deleteLink } = useDeleteIssueLink(serviceType);
 * deleteLink({ workspaceSlug, projectId, issueId, linkId });
 */
export function useDeleteIssueLink(serviceType: TIssueServiceType) {
  const queryClient = useQueryClient();
  const issueService = createIssueService(serviceType);

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, issueId, linkId }: DeleteLinkParams) =>
      issueService.deleteIssueLink(workspaceSlug, projectId, issueId, linkId),
    onMutate: async ({ issueId, linkId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.issueDetails.links(issueId) });

      const previousLinks = queryClient.getQueryData<TIssueLink[]>(queryKeys.issueDetails.links(issueId));

      if (previousLinks) {
        queryClient.setQueryData<TIssueLink[]>(
          queryKeys.issueDetails.links(issueId),
          previousLinks.filter((link) => link.id !== linkId)
        );
      }

      return { previousLinks, issueId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousLinks) {
        queryClient.setQueryData(queryKeys.issueDetails.links(context.issueId), context.previousLinks);
      }
    },
    onSettled: (_data, _error, { issueId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetails.links(issueId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetails.activities(issueId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.issues.detail(issueId) });
    },
  });
}

// ============================================================================
// ATTACHMENT HOOKS
// ============================================================================

/**
 * Hook to fetch issue attachments.
 *
 * @example
 * const { data: attachments } = useIssueAttachments(workspaceSlug, projectId, issueId, serviceType);
 */
export function useIssueAttachments(
  workspaceSlug: string | undefined,
  projectId: string | undefined,
  issueId: string | undefined,
  serviceType: TIssueServiceType
) {
  const attachmentService = createAttachmentService(serviceType);

  return useQuery({
    queryKey: queryKeys.issueDetails.attachments(issueId ?? ""),
    queryFn: () => attachmentService.getIssueAttachments(workspaceSlug!, projectId!, issueId!),
    enabled: !!workspaceSlug && !!projectId && !!issueId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

interface UploadAttachmentParams {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  file: File;
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
}

/**
 * Hook to upload an issue attachment.
 *
 * @example
 * const { mutate: uploadAttachment, isPending } = useUploadIssueAttachment(serviceType);
 * uploadAttachment({ workspaceSlug, projectId, issueId, file });
 */
export function useUploadIssueAttachment(serviceType: TIssueServiceType) {
  const queryClient = useQueryClient();
  const attachmentService = createAttachmentService(serviceType);

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, issueId, file, onUploadProgress }: UploadAttachmentParams) =>
      attachmentService.uploadIssueAttachment(workspaceSlug, projectId, issueId, file, onUploadProgress),
    onSuccess: (data, { issueId }) => {
      const previousAttachments = queryClient.getQueryData<TIssueAttachment[]>(
        queryKeys.issueDetails.attachments(issueId)
      );

      if (previousAttachments) {
        queryClient.setQueryData<TIssueAttachment[]>(queryKeys.issueDetails.attachments(issueId), [
          ...previousAttachments,
          data,
        ]);
      }

      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetails.attachments(issueId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.issues.detail(issueId) });
    },
  });
}

interface DeleteAttachmentParams {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  attachmentId: string;
}

/**
 * Hook to delete an issue attachment with optimistic updates.
 *
 * @example
 * const { mutate: deleteAttachment } = useDeleteIssueAttachment(serviceType);
 * deleteAttachment({ workspaceSlug, projectId, issueId, attachmentId });
 */
export function useDeleteIssueAttachment(serviceType: TIssueServiceType) {
  const queryClient = useQueryClient();
  const attachmentService = createAttachmentService(serviceType);

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, issueId, attachmentId }: DeleteAttachmentParams) =>
      attachmentService.deleteIssueAttachment(workspaceSlug, projectId, issueId, attachmentId),
    onMutate: async ({ issueId, attachmentId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.issueDetails.attachments(issueId) });

      const previousAttachments = queryClient.getQueryData<TIssueAttachment[]>(
        queryKeys.issueDetails.attachments(issueId)
      );

      if (previousAttachments) {
        queryClient.setQueryData<TIssueAttachment[]>(
          queryKeys.issueDetails.attachments(issueId),
          previousAttachments.filter((attachment) => attachment.id !== attachmentId)
        );
      }

      return { previousAttachments, issueId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousAttachments) {
        queryClient.setQueryData(queryKeys.issueDetails.attachments(context.issueId), context.previousAttachments);
      }
    },
    onSettled: (_data, _error, { issueId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetails.attachments(issueId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.issues.detail(issueId) });
    },
  });
}

// ============================================================================
// REACTION HOOKS
// ============================================================================

/**
 * Hook to fetch issue reactions.
 *
 * @example
 * const { data: reactions } = useIssueReactions(workspaceSlug, projectId, issueId, serviceType);
 */
export function useIssueReactions(
  workspaceSlug: string | undefined,
  projectId: string | undefined,
  issueId: string | undefined,
  serviceType: TIssueServiceType
) {
  const reactionService = createReactionService(serviceType);

  return useQuery({
    queryKey: queryKeys.issueDetails.reactions(issueId ?? ""),
    queryFn: () => reactionService.listIssueReactions(workspaceSlug!, projectId!, issueId!),
    enabled: !!workspaceSlug && !!projectId && !!issueId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

interface CreateReactionParams {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  reaction: string;
}

/**
 * Hook to create an issue reaction with optimistic updates.
 *
 * @example
 * const { mutate: createReaction } = useCreateIssueReaction(serviceType);
 * createReaction({ workspaceSlug, projectId, issueId, reaction: "👍" });
 */
export function useCreateIssueReaction(serviceType: TIssueServiceType) {
  const queryClient = useQueryClient();
  const reactionService = createReactionService(serviceType);

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, issueId, reaction }: CreateReactionParams) =>
      reactionService.createIssueReaction(workspaceSlug, projectId, issueId, { reaction }),
    onSuccess: (data, { issueId }) => {
      const previousReactions = queryClient.getQueryData<TIssueReaction[]>(queryKeys.issueDetails.reactions(issueId));

      if (previousReactions) {
        queryClient.setQueryData<TIssueReaction[]>(queryKeys.issueDetails.reactions(issueId), [
          ...previousReactions,
          data,
        ]);
      }

      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetails.reactions(issueId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetails.activities(issueId) });
    },
  });
}

interface DeleteReactionParams {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  reaction: string;
}

/**
 * Hook to delete an issue reaction with optimistic updates.
 *
 * @example
 * const { mutate: deleteReaction } = useDeleteIssueReaction(serviceType);
 * deleteReaction({ workspaceSlug, projectId, issueId, reaction: "👍" });
 */
export function useDeleteIssueReaction(serviceType: TIssueServiceType) {
  const queryClient = useQueryClient();
  const reactionService = createReactionService(serviceType);

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, issueId, reaction }: DeleteReactionParams) =>
      reactionService.deleteIssueReaction(workspaceSlug, projectId, issueId, reaction),
    onMutate: async ({ issueId, reaction }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.issueDetails.reactions(issueId) });

      const previousReactions = queryClient.getQueryData<TIssueReaction[]>(queryKeys.issueDetails.reactions(issueId));

      if (previousReactions) {
        queryClient.setQueryData<TIssueReaction[]>(
          queryKeys.issueDetails.reactions(issueId),
          previousReactions.filter((r) => r.reaction !== reaction)
        );
      }

      return { previousReactions, issueId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousReactions) {
        queryClient.setQueryData(queryKeys.issueDetails.reactions(context.issueId), context.previousReactions);
      }
    },
    onSettled: (_data, _error, { issueId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetails.reactions(issueId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetails.activities(issueId) });
    },
  });
}

// ============================================================================
// COMMENT HOOKS
// ============================================================================

/**
 * Hook to fetch issue comments.
 *
 * @example
 * const { data: comments } = useIssueComments(workspaceSlug, projectId, issueId, serviceType);
 */
export function useIssueComments(
  workspaceSlug: string | undefined,
  projectId: string | undefined,
  issueId: string | undefined,
  serviceType: TIssueServiceType
) {
  const commentService = createCommentService(serviceType);

  return useQuery({
    queryKey: queryKeys.issueDetails.comments(issueId ?? ""),
    queryFn: () => commentService.getIssueComments(workspaceSlug!, projectId!, issueId!),
    enabled: !!workspaceSlug && !!projectId && !!issueId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

interface CreateCommentParams {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  data: Partial<TIssueComment>;
}

/**
 * Hook to create an issue comment.
 *
 * @example
 * const { mutate: createComment } = useCreateIssueComment(serviceType);
 * createComment({ workspaceSlug, projectId, issueId, data: { comment_html: "Comment text" } });
 */
export function useCreateIssueComment(serviceType: TIssueServiceType) {
  const queryClient = useQueryClient();
  const commentService = createCommentService(serviceType);

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, issueId, data }: CreateCommentParams) =>
      commentService.createIssueComment(workspaceSlug, projectId, issueId, data),
    onSuccess: (data, { issueId }) => {
      const previousComments = queryClient.getQueryData<TIssueComment[]>(queryKeys.issueDetails.comments(issueId));

      if (previousComments) {
        queryClient.setQueryData<TIssueComment[]>(queryKeys.issueDetails.comments(issueId), [
          ...previousComments,
          data,
        ]);
      }

      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetails.comments(issueId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetails.activities(issueId) });
    },
  });
}

interface UpdateCommentParams {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  commentId: string;
  data: Partial<TIssueComment>;
}

/**
 * Hook to update an issue comment with optimistic updates.
 *
 * @example
 * const { mutate: updateComment } = useUpdateIssueComment(serviceType);
 * updateComment({ workspaceSlug, projectId, issueId, commentId, data: { comment_html: "Updated" } });
 */
export function useUpdateIssueComment(serviceType: TIssueServiceType) {
  const queryClient = useQueryClient();
  const commentService = createCommentService(serviceType);

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, issueId, commentId, data }: UpdateCommentParams) =>
      commentService.patchIssueComment(workspaceSlug, projectId, issueId, commentId, data),
    onMutate: async ({ issueId, commentId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.issueDetails.comments(issueId) });

      const previousComments = queryClient.getQueryData<TIssueComment[]>(queryKeys.issueDetails.comments(issueId));

      if (previousComments) {
        queryClient.setQueryData<TIssueComment[]>(
          queryKeys.issueDetails.comments(issueId),
          previousComments.map((comment) => (comment.id === commentId ? { ...comment, ...data } : comment))
        );
      }

      return { previousComments, issueId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(queryKeys.issueDetails.comments(context.issueId), context.previousComments);
      }
    },
    onSettled: (_data, _error, { issueId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetails.comments(issueId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetails.activities(issueId) });
    },
  });
}

interface DeleteCommentParams {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  commentId: string;
}

/**
 * Hook to delete an issue comment with optimistic updates.
 *
 * @example
 * const { mutate: deleteComment } = useDeleteIssueComment(serviceType);
 * deleteComment({ workspaceSlug, projectId, issueId, commentId });
 */
export function useDeleteIssueComment(serviceType: TIssueServiceType) {
  const queryClient = useQueryClient();
  const commentService = createCommentService(serviceType);

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, issueId, commentId }: DeleteCommentParams) =>
      commentService.deleteIssueComment(workspaceSlug, projectId, issueId, commentId),
    onMutate: async ({ issueId, commentId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.issueDetails.comments(issueId) });

      const previousComments = queryClient.getQueryData<TIssueComment[]>(queryKeys.issueDetails.comments(issueId));

      if (previousComments) {
        queryClient.setQueryData<TIssueComment[]>(
          queryKeys.issueDetails.comments(issueId),
          previousComments.filter((comment) => comment.id !== commentId)
        );
      }

      return { previousComments, issueId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(queryKeys.issueDetails.comments(context.issueId), context.previousComments);
      }
    },
    onSettled: (_data, _error, { issueId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetails.comments(issueId) });
    },
  });
}

// ============================================================================
// COMMENT REACTION HOOKS
// ============================================================================

/**
 * Hook to fetch comment reactions.
 *
 * @example
 * const { data: reactions } = useCommentReactions(workspaceSlug, projectId, commentId);
 */
export function useCommentReactions(
  workspaceSlug: string | undefined,
  projectId: string | undefined,
  commentId: string | undefined
) {
  const reactionService = createReactionService();

  return useQuery({
    queryKey: queryKeys.issueDetails.commentReactions(commentId ?? ""),
    queryFn: () => reactionService.listIssueCommentReactions(workspaceSlug!, projectId!, commentId!),
    enabled: !!workspaceSlug && !!projectId && !!commentId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

interface CreateCommentReactionParams {
  workspaceSlug: string;
  projectId: string;
  commentId: string;
  reaction: string;
}

/**
 * Hook to create a comment reaction.
 *
 * @example
 * const { mutate: createReaction } = useCreateCommentReaction();
 * createReaction({ workspaceSlug, projectId, commentId, reaction: "👍" });
 */
export function useCreateCommentReaction() {
  const queryClient = useQueryClient();
  const reactionService = createReactionService();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, commentId, reaction }: CreateCommentReactionParams) =>
      reactionService.createIssueCommentReaction(workspaceSlug, projectId, commentId, { reaction }),
    onSuccess: (data, { commentId }) => {
      const previousReactions = queryClient.getQueryData<TIssueCommentReaction[]>(
        queryKeys.issueDetails.commentReactions(commentId)
      );

      if (previousReactions) {
        queryClient.setQueryData<TIssueCommentReaction[]>(queryKeys.issueDetails.commentReactions(commentId), [
          ...previousReactions,
          data,
        ]);
      }

      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetails.commentReactions(commentId) });
    },
  });
}

interface DeleteCommentReactionParams {
  workspaceSlug: string;
  projectId: string;
  commentId: string;
  reaction: string;
}

/**
 * Hook to delete a comment reaction.
 *
 * @example
 * const { mutate: deleteReaction } = useDeleteCommentReaction();
 * deleteReaction({ workspaceSlug, projectId, commentId, reaction: "👍" });
 */
export function useDeleteCommentReaction() {
  const queryClient = useQueryClient();
  const reactionService = createReactionService();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, commentId, reaction }: DeleteCommentReactionParams) =>
      reactionService.deleteIssueCommentReaction(workspaceSlug, projectId, commentId, reaction),
    onMutate: async ({ commentId, reaction }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.issueDetails.commentReactions(commentId) });

      const previousReactions = queryClient.getQueryData<TIssueCommentReaction[]>(
        queryKeys.issueDetails.commentReactions(commentId)
      );

      if (previousReactions) {
        queryClient.setQueryData<TIssueCommentReaction[]>(
          queryKeys.issueDetails.commentReactions(commentId),
          previousReactions.filter((r) => r.reaction !== reaction)
        );
      }

      return { previousReactions, commentId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousReactions) {
        queryClient.setQueryData(
          queryKeys.issueDetails.commentReactions(context.commentId),
          context.previousReactions
        );
      }
    },
    onSettled: (_data, _error, { commentId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetails.commentReactions(commentId) });
    },
  });
}

// ============================================================================
// ACTIVITY HOOKS
// ============================================================================

/**
 * Hook to fetch issue activities.
 *
 * @example
 * const { data: activities } = useIssueActivities(workspaceSlug, projectId, issueId, serviceType);
 */
export function useIssueActivities(
  workspaceSlug: string | undefined,
  projectId: string | undefined,
  issueId: string | undefined,
  serviceType: TIssueServiceType
) {
  const activityService = createActivityService(serviceType);

  return useQuery({
    queryKey: queryKeys.issueDetails.activities(issueId ?? ""),
    queryFn: () => activityService.getIssueActivities(workspaceSlug!, projectId!, issueId!),
    enabled: !!workspaceSlug && !!projectId && !!issueId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============================================================================
// RELATION HOOKS
// ============================================================================

/**
 * Hook to fetch issue relations.
 *
 * @example
 * const { data: relations } = useIssueRelations(workspaceSlug, projectId, issueId);
 */
export function useIssueRelations(
  workspaceSlug: string | undefined,
  projectId: string | undefined,
  issueId: string | undefined
) {
  const relationService = createRelationService();

  return useQuery({
    queryKey: queryKeys.issueDetails.relations(issueId ?? ""),
    queryFn: () => relationService.listIssueRelations(workspaceSlug!, projectId!, issueId!),
    enabled: !!workspaceSlug && !!projectId && !!issueId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

interface CreateRelationParams {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  relationType: TIssueRelationTypes;
  issues: string[];
}

/**
 * Hook to create issue relations with optimistic updates.
 *
 * @example
 * const { mutate: createRelation } = useCreateIssueRelation();
 * createRelation({ workspaceSlug, projectId, issueId, relationType: "blocks", issues: ["issue-id"] });
 */
export function useCreateIssueRelation() {
  const queryClient = useQueryClient();
  const relationService = createRelationService();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, issueId, relationType, issues }: CreateRelationParams) =>
      relationService.createIssueRelations(workspaceSlug, projectId, issueId, {
        relation_type: relationType,
        issues,
      }),
    onSuccess: (data, { issueId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetails.relations(issueId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetails.activities(issueId) });
    },
  });
}

interface DeleteRelationParams {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  relationType: TIssueRelationTypes;
  relatedIssue: string;
}

/**
 * Hook to delete an issue relation with optimistic updates.
 *
 * @example
 * const { mutate: deleteRelation } = useDeleteIssueRelation();
 * deleteRelation({ workspaceSlug, projectId, issueId, relationType: "blocks", relatedIssue: "issue-id" });
 */
export function useDeleteIssueRelation() {
  const queryClient = useQueryClient();
  const relationService = createRelationService();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, issueId, relationType, relatedIssue }: DeleteRelationParams) =>
      relationService.deleteIssueRelation(workspaceSlug, projectId, issueId, {
        relation_type: relationType,
        related_issue: relatedIssue,
      }),
    onMutate: async ({ issueId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.issueDetails.relations(issueId) });

      const previousRelations = queryClient.getQueryData<TIssueRelation>(queryKeys.issueDetails.relations(issueId));

      return { previousRelations, issueId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousRelations) {
        queryClient.setQueryData(queryKeys.issueDetails.relations(context.issueId), context.previousRelations);
      }
    },
    onSettled: (_data, _error, { issueId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetails.relations(issueId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetails.activities(issueId) });
    },
  });
}

// ============================================================================
// SUB-ISSUES HOOKS
// ============================================================================

/**
 * Hook to fetch sub-issues.
 *
 * @example
 * const { data: subIssues } = useSubIssues(workspaceSlug, projectId, parentIssueId, serviceType);
 */
export function useSubIssues(
  workspaceSlug: string | undefined,
  projectId: string | undefined,
  parentIssueId: string | undefined,
  serviceType: TIssueServiceType
) {
  const issueService = createIssueService(serviceType);

  return useQuery({
    queryKey: queryKeys.issueDetails.subIssues(parentIssueId ?? ""),
    queryFn: () => issueService.subIssues(workspaceSlug!, projectId!, parentIssueId!),
    enabled: !!workspaceSlug && !!projectId && !!parentIssueId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

interface CreateSubIssuesParams {
  workspaceSlug: string;
  projectId: string;
  parentIssueId: string;
  issueIds: string[];
}

/**
 * Hook to create sub-issues (add existing issues as sub-issues).
 *
 * @example
 * const { mutate: createSubIssues } = useCreateSubIssues(serviceType);
 * createSubIssues({ workspaceSlug, projectId, parentIssueId, issueIds: ["issue-id-1", "issue-id-2"] });
 */
export function useCreateSubIssues(serviceType: TIssueServiceType) {
  const queryClient = useQueryClient();
  const issueService = createIssueService(serviceType);

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, parentIssueId, issueIds }: CreateSubIssuesParams) =>
      issueService.addSubIssues(workspaceSlug, projectId, parentIssueId, { sub_issue_ids: issueIds }),
    onSuccess: (data, { parentIssueId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetails.subIssues(parentIssueId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.issues.detail(parentIssueId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetails.activities(parentIssueId) });
    },
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get link by ID from links array.
 *
 * @example
 * const { data: links } = useIssueLinks(workspaceSlug, projectId, issueId, serviceType);
 * const link = getLinkById(links, linkId);
 */
export function getLinkById(links: TIssueLink[] | undefined, linkId: string | null | undefined): TIssueLink | undefined {
  if (!links || !linkId) return undefined;
  return links.find((link) => link.id === linkId);
}

/**
 * Get attachment by ID from attachments array.
 *
 * @example
 * const { data: attachments } = useIssueAttachments(workspaceSlug, projectId, issueId, serviceType);
 * const attachment = getAttachmentById(attachments, attachmentId);
 */
export function getAttachmentById(
  attachments: TIssueAttachment[] | undefined,
  attachmentId: string | null | undefined
): TIssueAttachment | undefined {
  if (!attachments || !attachmentId) return undefined;
  return attachments.find((attachment) => attachment.id === attachmentId);
}

/**
 * Get comment by ID from comments array.
 *
 * @example
 * const { data: comments } = useIssueComments(workspaceSlug, projectId, issueId, serviceType);
 * const comment = getCommentById(comments, commentId);
 */
export function getCommentById(
  comments: TIssueComment[] | undefined,
  commentId: string | null | undefined
): TIssueComment | undefined {
  if (!comments || !commentId) return undefined;
  return comments.find((comment) => comment.id === commentId);
}

/**
 * Get activity by ID from activities array.
 *
 * @example
 * const { data: activities } = useIssueActivities(workspaceSlug, projectId, issueId, serviceType);
 * const activity = getActivityById(activities, activityId);
 */
export function getActivityById(
  activities: TIssueActivity[] | undefined,
  activityId: string | null | undefined
): TIssueActivity | undefined {
  if (!activities || !activityId) return undefined;
  return activities.find((activity) => activity.id === activityId);
}
