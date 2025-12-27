/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access */
import { API_BASE_URL } from "@plane/constants";
import type { TDocumentVersionDetail, TDocumentVersionListResponse } from "@plane/types";
import { APIService } from "@/services/api.service";

export class DocumentVersionService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async fetchAll(workspaceSlug: string, documentId: string, offset?: number): Promise<TDocumentVersionListResponse> {
    const params: Record<string, unknown> = {};
    if (offset !== undefined) {
      params.offset = offset;
    }
    return this.get(`/api/workspaces/${workspaceSlug}/documents/${documentId}/versions/`, { params })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async fetchById(workspaceSlug: string, documentId: string, versionId: string): Promise<TDocumentVersionDetail> {
    return this.get(`/api/workspaces/${workspaceSlug}/documents/${documentId}/versions/${versionId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async restore(workspaceSlug: string, documentId: string, versionId: string): Promise<void> {
    return this.post(`/api/workspaces/${workspaceSlug}/documents/${documentId}/versions/${versionId}/restore/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
