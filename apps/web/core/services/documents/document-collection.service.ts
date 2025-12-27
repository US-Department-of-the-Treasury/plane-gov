/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access */
import { API_BASE_URL } from "@plane/constants";
import type { TDocumentCollection, TDocumentCollectionFormData } from "@plane/types";
import { APIService } from "@/services/api.service";

export class DocumentCollectionService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async fetchAll(workspaceSlug: string): Promise<TDocumentCollection[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/documents/collections/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async fetchById(workspaceSlug: string, collectionId: string): Promise<TDocumentCollection> {
    return this.get(`/api/workspaces/${workspaceSlug}/documents/collections/${collectionId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async create(workspaceSlug: string, data: TDocumentCollectionFormData): Promise<TDocumentCollection> {
    return this.post(`/api/workspaces/${workspaceSlug}/documents/collections/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async update(
    workspaceSlug: string,
    collectionId: string,
    data: Partial<TDocumentCollectionFormData>
  ): Promise<TDocumentCollection> {
    return this.patch(`/api/workspaces/${workspaceSlug}/documents/collections/${collectionId}/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async remove(workspaceSlug: string, collectionId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/documents/collections/${collectionId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async fetchPages(workspaceSlug: string, collectionId: string): Promise<TDocumentCollection> {
    return this.get(`/api/workspaces/${workspaceSlug}/documents/collections/${collectionId}/pages/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
