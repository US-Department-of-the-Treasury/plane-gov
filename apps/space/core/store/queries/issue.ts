"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SitesIssueService } from "@plane/services";
import type { TPublicIssuesResponse, IPublicIssue } from "@plane/types";
import { queryKeys } from "./query-keys";

const issueService = new SitesIssueService();

/**
 * Hook to fetch issues list for a published project.
 * Replaces MobX IssueStore.fetchIssues.
 */
export function useIssues(anchor: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.issues.filtered(anchor, params ?? {}),
    queryFn: () => issueService.list(anchor, params),
    enabled: !!anchor,
    staleTime: 1 * 60 * 1000, // 1 minute - issues change frequently
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch a single issue detail.
 * Replaces MobX IssueDetailStore.fetchIssue.
 */
export function useIssue(anchor: string, issueId: string) {
  return useQuery({
    queryKey: queryKeys.issues.detail(anchor, issueId),
    queryFn: () => issueService.retrieve(anchor, issueId),
    enabled: !!anchor && !!issueId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch issue votes.
 */
export function useIssueVotes(anchor: string, issueId: string) {
  return useQuery({
    queryKey: queryKeys.issueDetail.votes(anchor, issueId),
    queryFn: () => issueService.listVotes(anchor, issueId),
    enabled: !!anchor && !!issueId,
    staleTime: 1 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface AddVoteParams {
  anchor: string;
  issueId: string;
  data: { vote: number };
}

/**
 * Hook to add a vote to an issue.
 */
export function useAddVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ anchor, issueId, data }: AddVoteParams) => issueService.addVote(anchor, issueId, data),
    onSettled: (_data, _error, { anchor, issueId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetail.votes(anchor, issueId) });
    },
  });
}

interface RemoveVoteParams {
  anchor: string;
  issueId: string;
}

/**
 * Hook to remove a vote from an issue.
 */
export function useRemoveVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ anchor, issueId }: RemoveVoteParams) => issueService.removeVote(anchor, issueId),
    onSettled: (_data, _error, { anchor, issueId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetail.votes(anchor, issueId) });
    },
  });
}

/**
 * Hook to fetch issue reactions.
 */
export function useIssueReactions(anchor: string, issueId: string) {
  return useQuery({
    queryKey: queryKeys.issueDetail.reactions(anchor, issueId),
    queryFn: () => issueService.listReactions(anchor, issueId),
    enabled: !!anchor && !!issueId,
    staleTime: 1 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface AddReactionParams {
  anchor: string;
  issueId: string;
  data: { reaction: string };
}

/**
 * Hook to add a reaction to an issue.
 */
export function useAddReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ anchor, issueId, data }: AddReactionParams) => issueService.addReaction(anchor, issueId, data),
    onSettled: (_data, _error, { anchor, issueId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetail.reactions(anchor, issueId) });
    },
  });
}

interface RemoveReactionParams {
  anchor: string;
  issueId: string;
  reactionId: string;
}

/**
 * Hook to remove a reaction from an issue.
 */
export function useRemoveReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ anchor, issueId, reactionId }: RemoveReactionParams) =>
      issueService.removeReaction(anchor, issueId, reactionId),
    onSettled: (_data, _error, { anchor, issueId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetail.reactions(anchor, issueId) });
    },
  });
}

/**
 * Hook to fetch issue comments.
 */
export function useIssueComments(anchor: string, issueId: string) {
  return useQuery({
    queryKey: queryKeys.issueDetail.comments(anchor, issueId),
    queryFn: () => issueService.listComments(anchor, issueId),
    enabled: !!anchor && !!issueId,
    staleTime: 1 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface AddCommentParams {
  anchor: string;
  issueId: string;
  data: { comment_html: string };
}

/**
 * Hook to add a comment to an issue.
 */
export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ anchor, issueId, data }: AddCommentParams) => issueService.addComment(anchor, issueId, data),
    onSettled: (_data, _error, { anchor, issueId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetail.comments(anchor, issueId) });
    },
  });
}

interface UpdateCommentParams {
  anchor: string;
  issueId: string;
  commentId: string;
  data: { comment_html: string };
}

/**
 * Hook to update a comment.
 */
export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ anchor, issueId, commentId, data }: UpdateCommentParams) =>
      issueService.updateComment(anchor, issueId, commentId, data),
    onSettled: (_data, _error, { anchor, issueId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetail.comments(anchor, issueId) });
    },
  });
}

interface RemoveCommentParams {
  anchor: string;
  issueId: string;
  commentId: string;
}

/**
 * Hook to remove a comment.
 */
export function useRemoveComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ anchor, issueId, commentId }: RemoveCommentParams) =>
      issueService.removeComment(anchor, issueId, commentId),
    onSettled: (_data, _error, { anchor, issueId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetail.comments(anchor, issueId) });
    },
  });
}

interface AddCommentReactionParams {
  anchor: string;
  commentId: string;
  data: { reaction: string };
  issueId: string; // For cache invalidation
}

/**
 * Hook to add a reaction to a comment.
 */
export function useAddCommentReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ anchor, commentId, data }: AddCommentReactionParams) =>
      issueService.addCommentReaction(anchor, commentId, data),
    onSettled: (_data, _error, { anchor, issueId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetail.comments(anchor, issueId) });
    },
  });
}

interface RemoveCommentReactionParams {
  anchor: string;
  commentId: string;
  reactionHex: string;
  issueId: string; // For cache invalidation
}

/**
 * Hook to remove a reaction from a comment.
 */
export function useRemoveCommentReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ anchor, commentId, reactionHex }: RemoveCommentReactionParams) =>
      issueService.removeCommentReaction(anchor, commentId, reactionHex),
    onSettled: (_data, _error, { anchor, issueId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueDetail.comments(anchor, issueId) });
    },
  });
}
