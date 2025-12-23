import { pull, find, concat, update, set as lodashSet } from "lodash-es";
import { create } from "zustand";
// Plane Imports
import type { TIssueCommentReaction, TIssueCommentReactionIdMap, TIssueCommentReactionMap } from "@plane/types";
import { groupReactions } from "@plane/utils";
// services
import { IssueReactionService } from "@/services/issue";

// Service instance at module level
const issueReactionService = new IssueReactionService();

// State interface
interface IssueCommentReactionStoreState {
  commentReactions: TIssueCommentReactionIdMap;
  commentReactionMap: TIssueCommentReactionMap;
}

// Actions interface
interface IssueCommentReactionStoreActions {
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
  ) => Promise<any>;
  removeCommentReaction: (
    workspaceSlug: string,
    projectId: string,
    commentId: string,
    reaction: string,
    userId: string
  ) => Promise<any>;
  // helper methods
  getCommentReactionsByCommentId: (commentId: string) => { [reaction_id: string]: string[] } | undefined;
  getCommentReactionById: (reactionId: string) => TIssueCommentReaction | undefined;
  commentReactionsByUser: (commentId: string, userId: string) => TIssueCommentReaction[];
}

// Combined type
type IssueCommentReactionStore = IssueCommentReactionStoreState & IssueCommentReactionStoreActions;

// Initial state
const initialState: IssueCommentReactionStoreState = {
  commentReactions: {},
  commentReactionMap: {},
};

/**
 * Issue Comment Reaction Store
 *
 * Manages comment reactions on issues.
 * Migrated from MobX IssueCommentReactionStore to Zustand.
 */
export const useIssueCommentReactionStore = create<IssueCommentReactionStore>()((set, get) => ({
  ...initialState,

  // Helper methods
  getCommentReactionsByCommentId: (commentId) => {
    if (!commentId) return undefined;
    return get().commentReactions[commentId] ?? undefined;
  },

  getCommentReactionById: (reactionId) => {
    if (!reactionId) return undefined;
    return get().commentReactionMap[reactionId] ?? undefined;
  },

  commentReactionsByUser: (commentId, userId) => {
    if (!commentId || !userId) return [];

    const state = get();
    const reactions = state.getCommentReactionsByCommentId(commentId);
    if (!reactions) return [];

    const _userReactions: TIssueCommentReaction[] = [];
    Object.keys(reactions).forEach((reaction) => {
      if (reactions?.[reaction])
        reactions?.[reaction].map((reactionId) => {
          const currentReaction = state.getCommentReactionById(reactionId);
          if (currentReaction && currentReaction.actor === userId) _userReactions.push(currentReaction);
        });
    });

    return _userReactions;
  },

  // Actions
  fetchCommentReactions: async (workspaceSlug, projectId, commentId) => {
    try {
      const response = await issueReactionService.listIssueCommentReactions(workspaceSlug, projectId, commentId);

      const groupedReactions = groupReactions(response || [], "reaction");

      const commentReactionIdsMap: { [reaction: string]: string[] } = {};

      Object.keys(groupedReactions).map((reactionId) => {
        const reactionIds = (groupedReactions[reactionId] || []).map((reaction) => reaction.id);
        commentReactionIdsMap[reactionId] = reactionIds;
      });

      // Update state immutably
      set((state) => {
        const newCommentReactions = { ...state.commentReactions };
        lodashSet(newCommentReactions, commentId, commentReactionIdsMap);

        const newCommentReactionMap = { ...state.commentReactionMap };
        response.forEach((reaction) => lodashSet(newCommentReactionMap, reaction.id, reaction));

        return {
          commentReactions: newCommentReactions,
          commentReactionMap: newCommentReactionMap,
        };
      });

      return response;
    } catch (error) {
      console.log("error", error);
      throw error;
    }
  },

  applyCommentReactions: (commentId, commentReactions) => {
    const groupedReactions = groupReactions(commentReactions || [], "reaction");

    const commentReactionIdsMap: { [reaction: string]: string[] } = {};

    Object.keys(groupedReactions).map((reactionId) => {
      const reactionIds = (groupedReactions[reactionId] || []).map((reaction) => reaction.id);
      commentReactionIdsMap[reactionId] = reactionIds;
    });

    // Update state immutably
    set((state) => {
      const newCommentReactions = { ...state.commentReactions };
      lodashSet(newCommentReactions, commentId, commentReactionIdsMap);

      const newCommentReactionMap = { ...state.commentReactionMap };
      commentReactions.forEach((reaction) => lodashSet(newCommentReactionMap, reaction.id, reaction));

      return {
        commentReactions: newCommentReactions,
        commentReactionMap: newCommentReactionMap,
      };
    });

    return;
  },

  createCommentReaction: async (workspaceSlug, projectId, commentId, reaction) => {
    try {
      const response = await issueReactionService.createIssueCommentReaction(workspaceSlug, projectId, commentId, {
        reaction,
      });

      // Update state immutably using lodash update pattern
      set((state) => {
        const newCommentReactions = { ...state.commentReactions };

        // Ensure commentId exists in the map
        if (!newCommentReactions[commentId]) {
          newCommentReactions[commentId] = {};
        }

        // Update or create reaction array immutably
        update(newCommentReactions, `${commentId}.${reaction}`, (reactionId) => {
          if (!reactionId) return [response.id];
          return concat(reactionId, response.id);
        });

        const newCommentReactionMap = { ...state.commentReactionMap };
        lodashSet(newCommentReactionMap, response.id, response);

        return {
          commentReactions: newCommentReactions,
          commentReactionMap: newCommentReactionMap,
        };
      });

      return response;
    } catch (error) {
      console.log("error", error);
      throw error;
    }
  },

  removeCommentReaction: async (workspaceSlug, projectId, commentId, reaction, userId) => {
    try {
      const state = get();
      const userReactions = state.commentReactionsByUser(commentId, userId);
      const currentReaction = find(userReactions, { actor: userId, reaction: reaction });

      // Optimistically update state
      if (currentReaction && currentReaction.id) {
        set((state) => {
          const newCommentReactions = { ...state.commentReactions };
          const newCommentReactionMap = { ...state.commentReactionMap };

          // Remove reaction from array
          if (newCommentReactions[commentId]?.[reaction]) {
            const reactionArray = [...newCommentReactions[commentId][reaction]];
            pull(reactionArray, currentReaction.id);
            newCommentReactions[commentId] = {
              ...newCommentReactions[commentId],
              [reaction]: reactionArray,
            };
          }

          // Remove from reaction map
          delete newCommentReactionMap[reaction];

          return {
            commentReactions: newCommentReactions,
            commentReactionMap: newCommentReactionMap,
          };
        });
      }

      const response = await issueReactionService.deleteIssueCommentReaction(
        workspaceSlug,
        projectId,
        commentId,
        reaction
      );

      return response;
    } catch (error) {
      // Rollback on error by refetching
      get().fetchCommentReactions(workspaceSlug, projectId, commentId);
      throw error;
    }
  },
}));

// Legacy interface (matches original MobX interface)
export interface IIssueCommentReactionStoreActions {
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
  ) => Promise<any>;
  removeCommentReaction: (
    workspaceSlug: string,
    projectId: string,
    commentId: string,
    reaction: string,
    userId: string
  ) => Promise<any>;
}

export interface IIssueCommentReactionStore extends IIssueCommentReactionStoreActions {
  // observables
  commentReactions: TIssueCommentReactionIdMap;
  commentReactionMap: TIssueCommentReactionMap;
  // helper methods
  getCommentReactionsByCommentId: (commentId: string) => { [reaction_id: string]: string[] } | undefined;
  getCommentReactionById: (reactionId: string) => TIssueCommentReaction | undefined;
  commentReactionsByUser: (commentId: string, userId: string) => TIssueCommentReaction[];
}

// Legacy class wrapper for backward compatibility
export class IssueCommentReactionStoreLegacy implements IIssueCommentReactionStore {
  constructor(private rootStore: any) {}

  // Getters that delegate to Zustand store
  get commentReactions(): TIssueCommentReactionIdMap {
    return useIssueCommentReactionStore.getState().commentReactions;
  }

  get commentReactionMap(): TIssueCommentReactionMap {
    return useIssueCommentReactionStore.getState().commentReactionMap;
  }

  // Helper methods that delegate to Zustand store
  getCommentReactionsByCommentId = (commentId: string) => {
    return useIssueCommentReactionStore.getState().getCommentReactionsByCommentId(commentId);
  };

  getCommentReactionById = (reactionId: string) => {
    return useIssueCommentReactionStore.getState().getCommentReactionById(reactionId);
  };

  commentReactionsByUser = (commentId: string, userId: string) => {
    return useIssueCommentReactionStore.getState().commentReactionsByUser(commentId, userId);
  };

  // Action methods that delegate to Zustand store
  fetchCommentReactions = async (workspaceSlug: string, projectId: string, commentId: string) => {
    return useIssueCommentReactionStore.getState().fetchCommentReactions(workspaceSlug, projectId, commentId);
  };

  applyCommentReactions = (commentId: string, commentReactions: TIssueCommentReaction[]) => {
    return useIssueCommentReactionStore.getState().applyCommentReactions(commentId, commentReactions);
  };

  createCommentReaction = async (workspaceSlug: string, projectId: string, commentId: string, reaction: string) => {
    return useIssueCommentReactionStore.getState().createCommentReaction(workspaceSlug, projectId, commentId, reaction);
  };

  removeCommentReaction = async (
    workspaceSlug: string,
    projectId: string,
    commentId: string,
    reaction: string,
    userId: string
  ) => {
    return useIssueCommentReactionStore
      .getState()
      .removeCommentReaction(workspaceSlug, projectId, commentId, reaction, userId);
  };
}

// Export the legacy class as IssueCommentReactionStore for backward compatibility
export { IssueCommentReactionStoreLegacy as IssueCommentReactionStore };
