/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access */
// Note: These rules are disabled because the APIService base class returns untyped responses.
import { API_BASE_URL } from "@plane/constants";
import type { TPageRelation, TPageRelationFormData, TPageRelationsGrouped } from "@plane/types";
import { APIService } from "@/services/api.service";

export class WikiRelationService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  /**
   * Fetch all relations for a page, organized by relation type.
   * Returns relations in both directions (forward and reverse).
   */
  async fetchAll(workspaceSlug: string, pageId: string): Promise<TPageRelationsGrouped> {
    return this.get(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/relations/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async create(workspaceSlug: string, pageId: string, data: TPageRelationFormData): Promise<TPageRelation> {
    return this.post(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/relations/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async remove(workspaceSlug: string, pageId: string, relationId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/relations/${relationId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
