import { pull, concat, update, uniq, set } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// Plane Imports
import { EIssueServiceType } from "@plane/types";
import type { TIssueComment, TIssueCommentMap, TIssueCommentIdMap, TIssueServiceType } from "@plane/types";
// services
import { IssueCommentService } from "@/services/issue";

export type TCommentLoader = "fetch" | "create" | "update" | "delete" | "mutate" | undefined;

export interface IIssueCommentStore {
  // state
  loader: TCommentLoader;
  comments: TIssueCommentIdMap;
  commentMap: TIssueCommentMap;
  // helper methods
  getCommentsByIssueId: (issueId: string) => string[] | undefined;
  getCommentById: (commentId: string) => TIssueComment | undefined;
  // actions
  setLoader: (loader: TCommentLoader) => void;
  fetchComments: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    loaderType?: TCommentLoader,
    applyCommentReactions?: (commentId: string, reactions: unknown[]) => void
  ) => Promise<TIssueComment[]>;
  createComment: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    data: Partial<TIssueComment>
  ) => Promise<TIssueComment>;
  updateComment: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    commentId: string,
    data: Partial<TIssueComment>,
    onError?: () => Promise<void>
  ) => Promise<TIssueComment>;
  removeComment: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    commentId: string
  ) => Promise<void>;
}

// Store factory for different service types
const commentServiceMap = new Map<TIssueServiceType, IssueCommentService>();

const getCommentService = (serviceType: TIssueServiceType): IssueCommentService => {
  if (!commentServiceMap.has(serviceType)) {
    commentServiceMap.set(serviceType, new IssueCommentService(serviceType));
  }
  return commentServiceMap.get(serviceType)!;
};

export const useIssueCommentStore = create<IIssueCommentStore>()(
  immer((set, get) => ({
    // state
    loader: "fetch" as TCommentLoader,
    comments: {},
    commentMap: {},

    // helper methods
    getCommentsByIssueId: (issueId: string) => {
      if (!issueId) return undefined;
      return get().comments[issueId] ?? undefined;
    },

    getCommentById: (commentId: string) => {
      if (!commentId) return undefined;
      return get().commentMap[commentId] ?? undefined;
    },

    // actions
    setLoader: (loader: TCommentLoader) => {
      set((state) => {
        state.loader = loader;
      });
    },

    fetchComments: async (
      workspaceSlug: string,
      projectId: string,
      issueId: string,
      loaderType: TCommentLoader = "fetch",
      applyCommentReactions?: (commentId: string, reactions: unknown[]) => void
    ) => {
      const service = getCommentService(EIssueServiceType.ISSUES);
      const state = get();

      set((draft) => {
        draft.loader = loaderType;
      });

      let props = {};
      const _commentIds = state.getCommentsByIssueId(issueId);
      if (_commentIds && _commentIds.length > 0) {
        const _comment = state.getCommentById(_commentIds[_commentIds.length - 1]);
        if (_comment) props = { created_at__gt: _comment.created_at };
      }

      const comments = await service.getIssueComments(workspaceSlug, projectId, issueId, props);

      const commentIds = comments.map((comment) => comment.id);
      set((draft) => {
        update(draft.comments, issueId, (_commentIds) => {
          if (!_commentIds) return commentIds;
          return uniq(concat(_commentIds, commentIds));
        });
        comments.forEach((comment) => {
          if (applyCommentReactions) {
            applyCommentReactions(comment.id, comment?.comment_reactions || []);
          }
          draft.commentMap[comment.id] = comment;
        });
        draft.loader = undefined;
      });

      return comments;
    },

    createComment: async (
      workspaceSlug: string,
      projectId: string,
      issueId: string,
      data: Partial<TIssueComment>
    ) => {
      const service = getCommentService(EIssueServiceType.ISSUES);
      const response = await service.createIssueComment(workspaceSlug, projectId, issueId, data);

      set((state) => {
        update(state.comments, issueId, (_commentIds) => {
          if (!_commentIds) return [response.id];
          return uniq(concat(_commentIds, [response.id]));
        });
        state.commentMap[response.id] = response;
      });

      return response;
    },

    updateComment: async (
      workspaceSlug: string,
      projectId: string,
      issueId: string,
      commentId: string,
      data: Partial<TIssueComment>,
      onError?: () => Promise<void>
    ) => {
      const service = getCommentService(EIssueServiceType.ISSUES);

      try {
        // Optimistic update
        set((state) => {
          Object.keys(data).forEach((key) => {
            if (state.commentMap[commentId]) {
              (state.commentMap[commentId] as Record<string, unknown>)[key] = data[key as keyof TIssueComment];
            }
          });
        });

        const response = await service.patchIssueComment(workspaceSlug, projectId, issueId, commentId, data);

        set((state) => {
          if (state.commentMap[commentId]) {
            state.commentMap[commentId].updated_at = response.updated_at;
            state.commentMap[commentId].edited_at = response.edited_at;
          }
        });

        return response;
      } catch (error) {
        // Refetch on error to restore state
        if (onError) {
          await onError();
        }
        throw error;
      }
    },

    removeComment: async (
      workspaceSlug: string,
      projectId: string,
      issueId: string,
      commentId: string
    ) => {
      const service = getCommentService(EIssueServiceType.ISSUES);
      await service.deleteIssueComment(workspaceSlug, projectId, issueId, commentId);

      set((state) => {
        if (state.comments[issueId]) {
          pull(state.comments[issueId], commentId);
        }
        delete state.commentMap[commentId];
      });
    },
  }))
);
