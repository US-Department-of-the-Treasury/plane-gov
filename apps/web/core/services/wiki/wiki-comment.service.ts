/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access */
// Note: These rules are disabled because the APIService base class returns untyped responses.
import { API_BASE_URL } from "@plane/constants";
import type { TPageComment, TPageCommentFormData, TPageCommentReaction } from "@plane/types";
import { APIService } from "@/services/api.service";

export class WikiCommentService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async fetchAll(workspaceSlug: string, pageId: string): Promise<TPageComment[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/comments/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async fetchById(workspaceSlug: string, pageId: string, commentId: string): Promise<TPageComment> {
    return this.get(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/comments/${commentId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async create(workspaceSlug: string, pageId: string, data: TPageCommentFormData): Promise<TPageComment> {
    return this.post(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/comments/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async update(
    workspaceSlug: string,
    pageId: string,
    commentId: string,
    data: Partial<TPageCommentFormData>
  ): Promise<TPageComment> {
    return this.patch(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/comments/${commentId}/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async remove(workspaceSlug: string, pageId: string, commentId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/comments/${commentId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  // Comment reactions
  async fetchReactions(workspaceSlug: string, pageId: string, commentId: string): Promise<TPageCommentReaction[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/comments/${commentId}/reactions/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async createReaction(
    workspaceSlug: string,
    pageId: string,
    commentId: string,
    reaction: string
  ): Promise<TPageCommentReaction> {
    return this.post(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/comments/${commentId}/reactions/`, {
      reaction,
    })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async removeReaction(workspaceSlug: string, pageId: string, commentId: string, reactionId: string): Promise<void> {
    return this.delete(
      `/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/comments/${commentId}/reactions/${reactionId}/`
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
