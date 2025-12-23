import { pull, find, concat, update } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// Plane Imports
import type { TIssueReaction, TIssueReactionMap, TIssueReactionIdMap, TIssueServiceType } from "@plane/types";
import { groupReactions } from "@plane/utils";
// services
import { IssueReactionService } from "@/services/issue";

export interface IIssueReactionStore {
  // state
  reactions: TIssueReactionIdMap;
  reactionMap: TIssueReactionMap;
  // helper methods
  getReactionsByIssueId: (issueId: string) => { [reaction_id: string]: string[] } | undefined;
  getReactionById: (reactionId: string) => TIssueReaction | undefined;
  reactionsByUser: (issueId: string, userId: string) => TIssueReaction[];
  // actions
  addReactions: (issueId: string, reactions: TIssueReaction[]) => void;
  fetchReactions: (workspaceSlug: string, projectId: string, issueId: string) => Promise<TIssueReaction[]>;
  createReaction: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    reaction: string,
    onFetchActivity?: () => void
  ) => Promise<TIssueReaction>;
  removeReaction: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    reaction: string,
    userId: string,
    onFetchActivity?: () => void
  ) => Promise<void>;
}

// Store factory for different service types
const reactionServiceMap = new Map<TIssueServiceType, IssueReactionService>();

const getReactionService = (serviceType: TIssueServiceType): IssueReactionService => {
  if (!reactionServiceMap.has(serviceType)) {
    reactionServiceMap.set(serviceType, new IssueReactionService(serviceType));
  }
  return reactionServiceMap.get(serviceType)!;
};

export const useIssueReactionStore = create<IIssueReactionStore>()(
  immer((set, get) => ({
    // state
    reactions: {},
    reactionMap: {},

    // helper methods
    getReactionsByIssueId: (issueId: string) => {
      if (!issueId) return undefined;
      return get().reactions[issueId] ?? undefined;
    },

    getReactionById: (reactionId: string) => {
      if (!reactionId) return undefined;
      return get().reactionMap[reactionId] ?? undefined;
    },

    reactionsByUser: (issueId: string, userId: string) => {
      if (!issueId || !userId) return [];
      const state = get();
      const reactions = state.getReactionsByIssueId(issueId);
      if (!reactions) return [];

      const _userReactions: TIssueReaction[] = [];
      Object.keys(reactions).forEach((reaction) => {
        if (reactions?.[reaction])
          reactions?.[reaction].forEach((reactionId) => {
            const currentReaction = state.getReactionById(reactionId);
            if (currentReaction && currentReaction.actor === userId) _userReactions.push(currentReaction);
          });
      });

      return _userReactions;
    },

    // actions
    addReactions: (issueId: string, reactions: TIssueReaction[]) => {
      const groupedReactions = groupReactions(reactions || [], "reaction");
      const issueReactionIdsMap: { [reaction: string]: string[] } = {};

      Object.keys(groupedReactions).forEach((reactionId) => {
        const reactionIds = (groupedReactions[reactionId] || []).map((reaction) => reaction.id);
        issueReactionIdsMap[reactionId] = reactionIds;
      });

      set((state) => {
        state.reactions[issueId] = issueReactionIdsMap;
        reactions.forEach((reaction) => {
          state.reactionMap[reaction.id] = reaction;
        });
      });
    },

    fetchReactions: async (workspaceSlug: string, projectId: string, issueId: string) => {
      const service = getReactionService("WORKSPACE");
      const response = await service.listIssueReactions(workspaceSlug, projectId, issueId);
      get().addReactions(issueId, response);
      return response;
    },

    createReaction: async (
      workspaceSlug: string,
      projectId: string,
      issueId: string,
      reaction: string,
      onFetchActivity?: () => void
    ) => {
      const service = getReactionService("WORKSPACE");
      const response = await service.createIssueReaction(workspaceSlug, projectId, issueId, {
        reaction,
      });

      set((state) => {
        if (!state.reactions[issueId]) {
          state.reactions[issueId] = {};
        }
        if (!state.reactions[issueId][reaction]) {
          state.reactions[issueId][reaction] = [];
        }
        state.reactions[issueId][reaction] = concat(state.reactions[issueId][reaction], response.id);
        state.reactionMap[response.id] = response;
      });

      // fetching activity
      if (onFetchActivity) {
        onFetchActivity();
      }

      return response;
    },

    removeReaction: async (
      workspaceSlug: string,
      projectId: string,
      issueId: string,
      reaction: string,
      userId: string,
      onFetchActivity?: () => void
    ) => {
      const service = getReactionService("WORKSPACE");
      const state = get();
      const userReactions = state.reactionsByUser(issueId, userId);
      const currentReaction = find(userReactions, { actor: userId, reaction: reaction });

      if (currentReaction && currentReaction.id) {
        set((draft) => {
          if (draft.reactions[issueId]?.[reaction]) {
            pull(draft.reactions[issueId][reaction], currentReaction.id);
          }
          delete draft.reactionMap[currentReaction.id];
        });
      }

      await service.deleteIssueReaction(workspaceSlug, projectId, issueId, reaction);

      // fetching activity
      if (onFetchActivity) {
        onFetchActivity();
      }
    },
  }))
);
