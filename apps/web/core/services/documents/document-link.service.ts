/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access */
// Note: These rules are disabled because the APIService base class returns untyped responses.
import { API_BASE_URL } from "@plane/constants";
import type { TDocumentLink, TDocumentLinkFormData } from "@plane/types";
import { APIService } from "@/services/api.service";

export class DocumentLinkService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async fetchAll(workspaceSlug: string, documentId: string): Promise<TDocumentLink[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/documents/${documentId}/links/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async create(workspaceSlug: string, documentId: string, data: TDocumentLinkFormData): Promise<TDocumentLink> {
    return this.post(`/api/workspaces/${workspaceSlug}/documents/${documentId}/links/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async update(
    workspaceSlug: string,
    documentId: string,
    linkId: string,
    data: Partial<TDocumentLinkFormData>
  ): Promise<TDocumentLink> {
    return this.patch(`/api/workspaces/${workspaceSlug}/documents/${documentId}/links/${linkId}/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async remove(workspaceSlug: string, documentId: string, linkId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/documents/${documentId}/links/${linkId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
