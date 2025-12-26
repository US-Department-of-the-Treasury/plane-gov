import { pull, concat, update, uniq, set as lodashSet } from "lodash-es";
import { create } from "zustand";
// types
import type { TIssueComment, TIssueCommentMap, TIssueCommentIdMap, TIssueServiceType } from "@plane/types";
// services
import { IssueCommentService } from "@/services/issue";
// types
import type { IIssueDetail } from "@/store/issue/issue-details/root.store";

export type TCommentLoader = "fetch" | "create" | "update" | "delete" | "mutate" | undefined;

// ============================================================================
// State Interface
// ============================================================================

interface IssueCommentStoreState {
  loader: TCommentLoader;
  comments: TIssueCommentIdMap;
  commentMap: TIssueCommentMap;
  serviceType: TIssueServiceType | null;
  rootStore: IIssueDetail | null;
}

// ============================================================================
// Actions Interface
// ============================================================================

interface IssueCommentStoreActions {
  initialize: (rootStore: IIssueDetail, serviceType: TIssueServiceType) => void;
  fetchComments: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    loaderType?: TCommentLoader
  ) => Promise<TIssueComment[]>;
  createComment: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    data: Partial<TIssueComment>
  ) => Promise<any>;
  updateComment: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    commentId: string,
    data: Partial<TIssueComment>
  ) => Promise<any>;
  removeComment: (workspaceSlug: string, projectId: string, issueId: string, commentId: string) => Promise<any>;
  // helper methods
  getCommentsByIssueId: (issueId: string) => string[] | undefined;
  getCommentById: (commentId: string) => TIssueComment | undefined;
}

// ============================================================================
// Combined Store Type
// ============================================================================

export type IssueCommentStore = IssueCommentStoreState & IssueCommentStoreActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: IssueCommentStoreState = {
  loader: "fetch",
  comments: {},
  commentMap: {},
  serviceType: null,
  rootStore: null,
};

// ============================================================================
// Zustand Store
// ============================================================================

/**
 * Issue Comment Store (Zustand)
 *
 * Manages comments for issues.
 * Migrated from MobX IssueCommentStore to Zustand.
 *
 * Migration notes:
 * - Service instance is created on-demand using stored serviceType
 * - Maintains optimistic updates with error rollback
 * - Integrates with commentReaction store for reactions
 */
export const useIssueCommentStore = create<IssueCommentStore>()((set, get) => ({
  ...initialState,

  // ============================================================================
  // Initialization
  // ============================================================================

  initialize: (rootStore, serviceType) => {
    set({
      rootStore,
      serviceType,
    });
  },

  // ============================================================================
  // Helper Methods
  // ============================================================================

  getCommentsByIssueId: (issueId) => {
    if (!issueId) return undefined;
    const state = get();
    return state.comments[issueId] ?? undefined;
  },

  getCommentById: (commentId) => {
    if (!commentId) return undefined;
    const state = get();
    return state.commentMap[commentId] ?? undefined;
  },

  // ============================================================================
  // Actions
  // ============================================================================

  fetchComments: async (workspaceSlug, projectId, issueId, loaderType = "fetch") => {
    const state = get();
    if (!state.serviceType) throw new Error("Store not initialized");

    const issueCommentService = new IssueCommentService(state.serviceType);

    set({ loader: loaderType });

    let props = {};
    const _commentIds = get().getCommentsByIssueId(issueId);
    if (_commentIds && _commentIds.length > 0) {
      const _comment = get().getCommentById(_commentIds[_commentIds.length - 1]);
      if (_comment) props = { created_at__gt: _comment.created_at };
    }

    const comments = await issueCommentService.getIssueComments(workspaceSlug, projectId, issueId, props);

    const commentIds = comments.map((comment) => comment.id);

    set((state) => {
      const updatedComments = { ...state.comments };
      const updatedCommentMap = { ...state.commentMap };

      // Update comments map
      update(updatedComments, issueId, (_commentIds) => {
        if (!_commentIds) return commentIds;
        return uniq(concat(_commentIds, commentIds));
      });

      // Update comment map and apply reactions
      comments.forEach((comment) => {
        if (state.rootStore?.commentReaction) {
          state.rootStore.commentReaction.applyCommentReactions(comment.id, comment?.comment_reactions || []);
        }
        lodashSet(updatedCommentMap, comment.id, comment);
      });

      return {
        comments: updatedComments,
        commentMap: updatedCommentMap,
        loader: undefined,
      };
    });

    return comments;
  },

  createComment: async (workspaceSlug, projectId, issueId, data) => {
    const state = get();
    if (!state.serviceType) throw new Error("Store not initialized");

    const issueCommentService = new IssueCommentService(state.serviceType);
    const response = await issueCommentService.createIssueComment(workspaceSlug, projectId, issueId, data);

    set((state) => {
      const updatedComments = { ...state.comments };
      const updatedCommentMap = { ...state.commentMap };

      // Update comments map
      update(updatedComments, issueId, (_commentIds) => {
        if (!_commentIds) return [response.id];
        return uniq(concat(_commentIds, [response.id]));
      });

      // Update comment map
      lodashSet(updatedCommentMap, response.id, response);

      return {
        comments: updatedComments,
        commentMap: updatedCommentMap,
      };
    });

    return response;
  },

  updateComment: async (workspaceSlug, projectId, issueId, commentId, data) => {
    const state = get();
    if (!state.serviceType) throw new Error("Store not initialized");

    const issueCommentService = new IssueCommentService(state.serviceType);

    // Store previous data for rollback
    const previousComment = state.commentMap[commentId];

    try {
      // Optimistic update
      set((state) => {
        const updatedCommentMap = { ...state.commentMap };

        Object.keys(data).forEach((key) => {
          // Use string path for proper Zustand reactivity
          lodashSet(updatedCommentMap, `${commentId}.${key}`, data[key as keyof TIssueComment]);
        });

        return { commentMap: updatedCommentMap };
      });

      const response = await issueCommentService.patchIssueComment(
        workspaceSlug,
        projectId,
        issueId,
        commentId,
        data
      );

      // Update with server response
      set((state) => {
        const updatedCommentMap = { ...state.commentMap };
        // Use string paths for proper Zustand reactivity
        lodashSet(updatedCommentMap, `${commentId}.updated_at`, response.updated_at);
        lodashSet(updatedCommentMap, `${commentId}.edited_at`, response.edited_at);

        return { commentMap: updatedCommentMap };
      });

      return response;
    } catch (error) {
      // Rollback on error
      if (previousComment) {
        set((state) => ({
          commentMap: {
            ...state.commentMap,
            [commentId]: previousComment,
          },
        }));
      }

      // Fetch activities on error
      if (state.rootStore?.activity) {
        state.rootStore.activity.fetchActivities(workspaceSlug, projectId, issueId);
      }

      throw error;
    }
  },

  removeComment: async (workspaceSlug, projectId, issueId, commentId) => {
    const state = get();
    if (!state.serviceType) throw new Error("Store not initialized");

    const issueCommentService = new IssueCommentService(state.serviceType);
    const response = await issueCommentService.deleteIssueComment(workspaceSlug, projectId, issueId, commentId);

    set((state) => {
      const updatedComments = { ...state.comments };
      const updatedCommentMap = { ...state.commentMap };

      // Remove from comments array
      if (updatedComments[issueId]) {
        updatedComments[issueId] = updatedComments[issueId].filter((id) => id !== commentId);
      }

      // Remove from comment map
      delete updatedCommentMap[commentId];

      return {
        comments: updatedComments,
        commentMap: updatedCommentMap,
      };
    });

    return response;
  },
}));

// ============================================================================
// Legacy Interface (for backwards compatibility)
// ============================================================================

export interface IIssueCommentStoreActions {
  fetchComments: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    loaderType?: TCommentLoader
  ) => Promise<TIssueComment[]>;
  createComment: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    data: Partial<TIssueComment>
  ) => Promise<any>;
  updateComment: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    commentId: string,
    data: Partial<TIssueComment>
  ) => Promise<any>;
  removeComment: (workspaceSlug: string, projectId: string, issueId: string, commentId: string) => Promise<any>;
}

export interface IIssueCommentStore extends IIssueCommentStoreActions {
  // observables
  loader: TCommentLoader;
  comments: TIssueCommentIdMap;
  commentMap: TIssueCommentMap;
  // helper methods
  getCommentsByIssueId: (issueId: string) => string[] | undefined;
  getCommentById: (activityId: string) => TIssueComment | undefined;
}

// ============================================================================
// Legacy Class Wrapper (for backwards compatibility)
// ============================================================================

/**
 * Legacy IssueCommentStore class wrapper.
 * Provides MobX-like API by delegating to Zustand store.
 *
 * @deprecated Use useIssueCommentStore hook directly in new code
 */
export class IssueCommentStoreLegacy implements IIssueCommentStore {
  private rootIssueDetail: IIssueDetail;
  private serviceType: TIssueServiceType;

  constructor(rootStore: IIssueDetail, serviceType: TIssueServiceType) {
    this.rootIssueDetail = rootStore;
    this.serviceType = serviceType;

    // Initialize the Zustand store
    useIssueCommentStore.getState().initialize(rootStore, serviceType);
  }

  // ============================================================================
  // Observable Properties (via getters)
  // ============================================================================

  get loader(): TCommentLoader {
    return useIssueCommentStore.getState().loader;
  }

  get comments(): TIssueCommentIdMap {
    return useIssueCommentStore.getState().comments;
  }

  get commentMap(): TIssueCommentMap {
    return useIssueCommentStore.getState().commentMap;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  getCommentsByIssueId = (issueId: string): string[] | undefined => {
    return useIssueCommentStore.getState().getCommentsByIssueId(issueId);
  };

  getCommentById = (commentId: string): TIssueComment | undefined => {
    return useIssueCommentStore.getState().getCommentById(commentId);
  };

  // ============================================================================
  // Actions
  // ============================================================================

  fetchComments = async (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    loaderType?: TCommentLoader
  ): Promise<TIssueComment[]> => {
    return useIssueCommentStore.getState().fetchComments(workspaceSlug, projectId, issueId, loaderType);
  };

  createComment = async (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    data: Partial<TIssueComment>
  ): Promise<any> => {
    return useIssueCommentStore.getState().createComment(workspaceSlug, projectId, issueId, data);
  };

  updateComment = async (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    commentId: string,
    data: Partial<TIssueComment>
  ): Promise<any> => {
    return useIssueCommentStore.getState().updateComment(workspaceSlug, projectId, issueId, commentId, data);
  };

  removeComment = async (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    commentId: string
  ): Promise<any> => {
    return useIssueCommentStore.getState().removeComment(workspaceSlug, projectId, issueId, commentId);
  };
}

// Export the legacy class as IssueCommentStore for backward compatibility
export { IssueCommentStoreLegacy as IssueCommentStore };
