/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access */
// Note: These rules are disabled because the APIService base class returns untyped responses.
import { API_BASE_URL } from "@plane/constants";
import type { TDocumentRelation, TDocumentRelationFormData, TDocumentRelationsGrouped } from "@plane/types";
import { APIService } from "@/services/api.service";

export class DocumentRelationService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  /**
   * Fetch all relations for a document, organized by relation type.
   * Returns relations in both directions (forward and reverse).
   */
  async fetchAll(workspaceSlug: string, documentId: string): Promise<TDocumentRelationsGrouped> {
    return this.get(`/api/workspaces/${workspaceSlug}/documents/${documentId}/relations/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async create(workspaceSlug: string, documentId: string, data: TDocumentRelationFormData): Promise<TDocumentRelation> {
    return this.post(`/api/workspaces/${workspaceSlug}/documents/${documentId}/relations/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async remove(workspaceSlug: string, documentId: string, relationId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/documents/${documentId}/relations/${relationId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
