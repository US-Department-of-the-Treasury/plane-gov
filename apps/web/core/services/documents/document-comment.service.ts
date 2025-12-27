/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access */
// Note: These rules are disabled because the APIService base class returns untyped responses.
import { API_BASE_URL } from "@plane/constants";
import type { TDocumentComment, TDocumentCommentFormData, TDocumentCommentReaction } from "@plane/types";
import { APIService } from "@/services/api.service";

export class DocumentCommentService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async fetchAll(workspaceSlug: string, documentId: string): Promise<TDocumentComment[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/documents/${documentId}/comments/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async fetchById(workspaceSlug: string, documentId: string, commentId: string): Promise<TDocumentComment> {
    return this.get(`/api/workspaces/${workspaceSlug}/documents/${documentId}/comments/${commentId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async create(workspaceSlug: string, documentId: string, data: TDocumentCommentFormData): Promise<TDocumentComment> {
    return this.post(`/api/workspaces/${workspaceSlug}/documents/${documentId}/comments/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async update(
    workspaceSlug: string,
    documentId: string,
    commentId: string,
    data: Partial<TDocumentCommentFormData>
  ): Promise<TDocumentComment> {
    return this.patch(`/api/workspaces/${workspaceSlug}/documents/${documentId}/comments/${commentId}/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async remove(workspaceSlug: string, documentId: string, commentId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/documents/${documentId}/comments/${commentId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  // Comment reactions
  async fetchReactions(
    workspaceSlug: string,
    documentId: string,
    commentId: string
  ): Promise<TDocumentCommentReaction[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/documents/${documentId}/comments/${commentId}/reactions/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async createReaction(
    workspaceSlug: string,
    documentId: string,
    commentId: string,
    reaction: string
  ): Promise<TDocumentCommentReaction> {
    return this.post(`/api/workspaces/${workspaceSlug}/documents/${documentId}/comments/${commentId}/reactions/`, {
      reaction,
    })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async removeReaction(
    workspaceSlug: string,
    documentId: string,
    commentId: string,
    reactionId: string
  ): Promise<void> {
    return this.delete(
      `/api/workspaces/${workspaceSlug}/documents/${documentId}/comments/${commentId}/reactions/${reactionId}/`
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
