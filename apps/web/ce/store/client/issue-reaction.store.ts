/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call */
import { pull, find, concat, set as lodashSet, update as lodashUpdate } from "lodash-es";
import { create } from "zustand";
// Plane Imports
import type { TIssueReaction, TIssueReactionMap, TIssueReactionIdMap, TIssueServiceType } from "@plane/types";
import { groupReactions } from "@plane/utils";
// services
import { IssueReactionService } from "@/services/issue";
// stores - no rootStore indirection
import { useIssueActivityStore } from "@/plane-web/store/issue/issue-details/activity.store";

// State interface
export interface IssueReactionStoreState {
  reactions: TIssueReactionIdMap;
  reactionMap: TIssueReactionMap;
  serviceType: TIssueServiceType | null;
}

// Actions interface
export interface IssueReactionStoreActions {
  // initialization
  initialize: (serviceType: TIssueServiceType) => void;

  // actions
  addReactions: (issueId: string, reactions: TIssueReaction[]) => void;
  fetchReactions: (workspaceSlug: string, projectId: string, issueId: string) => Promise<TIssueReaction[]>;
  createReaction: (workspaceSlug: string, projectId: string, issueId: string, reaction: string) => Promise<any>;
  removeReaction: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    reaction: string,
    userId: string
  ) => Promise<any>;

  // helper methods
  getReactionsByIssueId: (issueId: string) => { [reaction_id: string]: string[] } | undefined;
  getReactionById: (reactionId: string) => TIssueReaction | undefined;
  reactionsByUser: (issueId: string, userId: string) => TIssueReaction[];
}

// Combined type
export type IssueReactionStore = IssueReactionStoreState & IssueReactionStoreActions;

// Initial state
const initialState: IssueReactionStoreState = {
  reactions: {},
  reactionMap: {},
  serviceType: null,
};

// Helper to get service instance (created on-demand based on serviceType)
const getIssueReactionService = (serviceType: TIssueServiceType | null) => {
  if (!serviceType) {
    throw new Error("Service type not initialized");
  }
  return new IssueReactionService(serviceType);
};

/**
 * Issue Reaction Store
 *
 * Manages reactions for issues. Migrated from MobX to Zustand.
 *
 * Key changes:
 * - Service instance created on-demand based on serviceType
 * - Immutable state updates using set()
 * - Activity fetching via direct useIssueActivityStore import (no rootStore indirection)
 */
export const useIssueReactionStore = create<IssueReactionStore>()((set, get) => ({
  ...initialState,

  // Initialization
  initialize: (serviceType) => {
    set({
      serviceType,
      reactions: {},
      reactionMap: {},
    });
    // Also set the serviceType in the activity store
    useIssueActivityStore.getState().setServiceType(serviceType);
  },

  // Helper methods
  getReactionsByIssueId: (issueId) => {
    if (!issueId) return undefined;
    const state = get();
    return state.reactions[issueId] ?? undefined;
  },

  getReactionById: (reactionId) => {
    if (!reactionId) return undefined;
    const state = get();
    return state.reactionMap[reactionId] ?? undefined;
  },

  reactionsByUser: (issueId, userId) => {
    if (!issueId || !userId) return [];

    const state = get();
    const reactions = state.reactions[issueId];
    if (!reactions) return [];

    const _userReactions: TIssueReaction[] = [];
    Object.keys(reactions).forEach((reaction) => {
      if (reactions?.[reaction]) {
        reactions[reaction].forEach((reactionId) => {
          const currentReaction = state.reactionMap[reactionId];
          if (currentReaction && currentReaction.actor === userId) {
            _userReactions.push(currentReaction);
          }
        });
      }
    });

    return _userReactions;
  },

  // Actions
  addReactions: (issueId, reactions) => {
    const groupedReactions = groupReactions(reactions || [], "reaction");

    const issueReactionIdsMap: { [reaction: string]: string[] } = {};

    Object.keys(groupedReactions).forEach((reactionId) => {
      const reactionIds = (groupedReactions[reactionId] || []).map((reaction) => reaction.id);
      issueReactionIdsMap[reactionId] = reactionIds;
    });

    set((state) => {
      const newReactions = { ...state.reactions };
      lodashSet(newReactions, issueId, issueReactionIdsMap);

      const newReactionMap = { ...state.reactionMap };
      reactions.forEach((reaction) => {
        lodashSet(newReactionMap, reaction.id, reaction);
      });

      return {
        reactions: newReactions,
        reactionMap: newReactionMap,
      };
    });
  },

  fetchReactions: async (workspaceSlug, projectId, issueId) => {
    const state = get();
    const service = getIssueReactionService(state.serviceType);
    const response = await service.listIssueReactions(workspaceSlug, projectId, issueId);
    get().addReactions(issueId, response);
    return response;
  },

  createReaction: async (workspaceSlug, projectId, issueId, reaction) => {
    const state = get();
    const service = getIssueReactionService(state.serviceType);

    const response = await service.createIssueReaction(workspaceSlug, projectId, issueId, {
      reaction,
    });

    set((state) => {
      const newReactions = { ...state.reactions };

      // Update the reactions map immutably
      lodashUpdate(newReactions, [issueId, reaction], (reactionId) => {
        if (!reactionId) return [response.id];
        return concat(reactionId, response.id);
      });

      const newReactionMap = { ...state.reactionMap };
      lodashSet(newReactionMap, response.id, response);

      return {
        reactions: newReactions,
        reactionMap: newReactionMap,
      };
    });

    // Fetching activity - direct call, no rootStore indirection
    useIssueActivityStore.getState().fetchActivities(workspaceSlug, projectId, issueId);

    return response;
  },

  removeReaction: async (workspaceSlug, projectId, issueId, reaction, userId) => {
    const state = get();
    const userReactions = state.reactionsByUser(issueId, userId);
    const currentReaction = find(userReactions, { actor: userId, reaction: reaction });

    if (currentReaction && currentReaction.id) {
      // Optimistic update
      set((state) => {
        const newReactions = { ...state.reactions };
        const newReactionMap = { ...state.reactionMap };

        // Remove reaction ID from the array
        if (newReactions[issueId]?.[reaction]) {
          const updatedReactionIds = [...newReactions[issueId][reaction]];
          pull(updatedReactionIds, currentReaction.id);

          newReactions[issueId] = {
            ...newReactions[issueId],
            [reaction]: updatedReactionIds,
          };
        }

        // Remove from reaction map
        delete newReactionMap[currentReaction.id];

        return {
          reactions: newReactions,
          reactionMap: newReactionMap,
        };
      });
    }

    const service = getIssueReactionService(state.serviceType);
    const response = await service.deleteIssueReaction(workspaceSlug, projectId, issueId, reaction);

    // Fetching activity - direct call, no rootStore indirection
    useIssueActivityStore.getState().fetchActivities(workspaceSlug, projectId, issueId);

    return response;
  },
}));

// Legacy interface (matches original MobX interface)
export interface IIssueReactionStore {
  // observables
  reactions: TIssueReactionIdMap;
  reactionMap: TIssueReactionMap;

  // helper methods
  getReactionsByIssueId: (issueId: string) => { [reaction_id: string]: string[] } | undefined;
  getReactionById: (reactionId: string) => TIssueReaction | undefined;
  reactionsByUser: (issueId: string, userId: string) => TIssueReaction[];

  // actions
  addReactions: (issueId: string, reactions: TIssueReaction[]) => void;
  fetchReactions: (workspaceSlug: string, projectId: string, issueId: string) => Promise<TIssueReaction[]>;
  createReaction: (workspaceSlug: string, projectId: string, issueId: string, reaction: string) => Promise<any>;
  removeReaction: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    reaction: string,
    userId: string
  ) => Promise<any>;
}
