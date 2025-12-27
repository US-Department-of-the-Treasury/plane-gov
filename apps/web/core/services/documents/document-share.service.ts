/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access */
import { API_BASE_URL } from "@plane/constants";
import type { TDocumentShare, TDocumentShareFormData } from "@plane/types";
import { APIService } from "@/services/api.service";

export class DocumentShareService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async fetchAll(workspaceSlug: string, documentId: string): Promise<TDocumentShare[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/documents/${documentId}/shares/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async create(workspaceSlug: string, documentId: string, data: TDocumentShareFormData): Promise<TDocumentShare> {
    return this.post(`/api/workspaces/${workspaceSlug}/documents/${documentId}/shares/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async update(
    workspaceSlug: string,
    documentId: string,
    shareId: string,
    data: Partial<TDocumentShareFormData>
  ): Promise<TDocumentShare> {
    return this.patch(`/api/workspaces/${workspaceSlug}/documents/${documentId}/shares/${shareId}/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async remove(workspaceSlug: string, documentId: string, shareId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/documents/${documentId}/shares/${shareId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
