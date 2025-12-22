import { API_BASE_URL } from "@plane/constants";
import type { TWikiCollection, TWikiCollectionFormData } from "@plane/types";
import { APIService } from "@/services/api.service";

export class WikiCollectionService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async fetchAll(workspaceSlug: string): Promise<TWikiCollection[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/wiki/collections/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async fetchById(workspaceSlug: string, collectionId: string): Promise<TWikiCollection> {
    return this.get(`/api/workspaces/${workspaceSlug}/wiki/collections/${collectionId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async create(workspaceSlug: string, data: TWikiCollectionFormData): Promise<TWikiCollection> {
    return this.post(`/api/workspaces/${workspaceSlug}/wiki/collections/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async update(
    workspaceSlug: string,
    collectionId: string,
    data: Partial<TWikiCollectionFormData>
  ): Promise<TWikiCollection> {
    return this.patch(`/api/workspaces/${workspaceSlug}/wiki/collections/${collectionId}/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async remove(workspaceSlug: string, collectionId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/wiki/collections/${collectionId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async fetchPages(workspaceSlug: string, collectionId: string): Promise<TWikiCollection> {
    return this.get(`/api/workspaces/${workspaceSlug}/wiki/collections/${collectionId}/pages/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
