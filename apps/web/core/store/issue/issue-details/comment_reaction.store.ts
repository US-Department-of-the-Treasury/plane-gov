import { pull, find, concat, update, set } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// Plane Imports
import type { TIssueCommentReaction, TIssueCommentReactionIdMap, TIssueCommentReactionMap } from "@plane/types";
import { groupReactions } from "@plane/utils";
// services
import { IssueReactionService } from "@/services/issue";

export interface IIssueCommentReactionStore {
  // state
  commentReactions: TIssueCommentReactionIdMap;
  commentReactionMap: TIssueCommentReactionMap;
  // helper methods
  getCommentReactionsByCommentId: (commentId: string) => { [reaction_id: string]: string[] } | undefined;
  getCommentReactionById: (reactionId: string) => TIssueCommentReaction | undefined;
  commentReactionsByUser: (commentId: string, userId: string) => TIssueCommentReaction[];
  // actions
  fetchCommentReactions: (
    workspaceSlug: string,
    projectId: string,
    commentId: string
  ) => Promise<TIssueCommentReaction[]>;
  applyCommentReactions: (commentId: string, commentReactions: TIssueCommentReaction[]) => void;
  createCommentReaction: (
    workspaceSlug: string,
    projectId: string,
    commentId: string,
    reaction: string
  ) => Promise<TIssueCommentReaction>;
  removeCommentReaction: (
    workspaceSlug: string,
    projectId: string,
    commentId: string,
    reaction: string,
    userId: string,
    onRefetch?: () => Promise<void>
  ) => Promise<void>;
}

const issueReactionService = new IssueReactionService();

export const useIssueCommentReactionStore = create<IIssueCommentReactionStore>()(
  immer((set, get) => ({
    // state
    commentReactions: {},
    commentReactionMap: {},

    // helper methods
    getCommentReactionsByCommentId: (commentId: string) => {
      if (!commentId) return undefined;
      return get().commentReactions[commentId] ?? undefined;
    },

    getCommentReactionById: (reactionId: string) => {
      if (!reactionId) return undefined;
      return get().commentReactionMap[reactionId] ?? undefined;
    },

    commentReactionsByUser: (commentId: string, userId: string) => {
      if (!commentId || !userId) return [];
      const state = get();
      const reactions = state.getCommentReactionsByCommentId(commentId);
      if (!reactions) return [];

      const _userReactions: TIssueCommentReaction[] = [];
      Object.keys(reactions).forEach((reaction) => {
        if (reactions?.[reaction])
          reactions?.[reaction].forEach((reactionId) => {
            const currentReaction = state.getCommentReactionById(reactionId);
            if (currentReaction && currentReaction.actor === userId) _userReactions.push(currentReaction);
          });
      });

      return _userReactions;
    },

    // actions
    fetchCommentReactions: async (workspaceSlug: string, projectId: string, commentId: string) => {
      try {
        const response = await issueReactionService.listIssueCommentReactions(workspaceSlug, projectId, commentId);

        const groupedReactions = groupReactions(response || [], "reaction");
        const commentReactionIdsMap: { [reaction: string]: string[] } = {};

        Object.keys(groupedReactions).forEach((reactionId) => {
          const reactionIds = (groupedReactions[reactionId] || []).map((reaction) => reaction.id);
          commentReactionIdsMap[reactionId] = reactionIds;
        });

        set((state) => {
          state.commentReactions[commentId] = commentReactionIdsMap;
          response.forEach((reaction) => {
            state.commentReactionMap[reaction.id] = reaction;
          });
        });

        return response;
      } catch (error) {
        console.error("Error fetching comment reactions:", error);
        throw error;
      }
    },

    applyCommentReactions: (commentId: string, commentReactions: TIssueCommentReaction[]) => {
      const groupedReactions = groupReactions(commentReactions || [], "reaction");
      const commentReactionIdsMap: { [reaction: string]: string[] } = {};

      Object.keys(groupedReactions).forEach((reactionId) => {
        const reactionIds = (groupedReactions[reactionId] || []).map((reaction) => reaction.id);
        commentReactionIdsMap[reactionId] = reactionIds;
      });

      set((state) => {
        state.commentReactions[commentId] = commentReactionIdsMap;
        commentReactions.forEach((reaction) => {
          state.commentReactionMap[reaction.id] = reaction;
        });
      });
    },

    createCommentReaction: async (workspaceSlug: string, projectId: string, commentId: string, reaction: string) => {
      try {
        const response = await issueReactionService.createIssueCommentReaction(workspaceSlug, projectId, commentId, {
          reaction,
        });

        set((state) => {
          if (!state.commentReactions[commentId]) {
            state.commentReactions[commentId] = {};
          }
          if (!state.commentReactions[commentId][reaction]) {
            state.commentReactions[commentId][reaction] = [];
          }
          state.commentReactions[commentId][reaction] = concat(
            state.commentReactions[commentId][reaction],
            response.id
          );
          state.commentReactionMap[response.id] = response;
        });

        return response;
      } catch (error) {
        console.error("Error creating comment reaction:", error);
        throw error;
      }
    },

    removeCommentReaction: async (
      workspaceSlug: string,
      projectId: string,
      commentId: string,
      reaction: string,
      userId: string,
      onRefetch?: () => Promise<void>
    ) => {
      try {
        const state = get();
        const userReactions = state.commentReactionsByUser(commentId, userId);
        const currentReaction = find(userReactions, { actor: userId, reaction: reaction });

        if (currentReaction && currentReaction.id) {
          set((draft) => {
            if (draft.commentReactions[commentId]?.[reaction]) {
              pull(draft.commentReactions[commentId][reaction], currentReaction.id);
            }
            delete draft.commentReactionMap[currentReaction.id];
          });
        }

        await issueReactionService.deleteIssueCommentReaction(workspaceSlug, projectId, commentId, reaction);
      } catch (error) {
        // Refetch on error to restore state
        if (onRefetch) {
          await onRefetch();
        }
        throw error;
      }
    },
  }))
);
