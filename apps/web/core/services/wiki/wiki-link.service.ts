/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access */
// Note: These rules are disabled because the APIService base class returns untyped responses.
import { API_BASE_URL } from "@plane/constants";
import type { TPageLink, TPageLinkFormData } from "@plane/types";
import { APIService } from "@/services/api.service";

export class WikiLinkService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async fetchAll(workspaceSlug: string, pageId: string): Promise<TPageLink[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/links/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async create(workspaceSlug: string, pageId: string, data: TPageLinkFormData): Promise<TPageLink> {
    return this.post(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/links/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async update(
    workspaceSlug: string,
    pageId: string,
    linkId: string,
    data: Partial<TPageLinkFormData>
  ): Promise<TPageLink> {
    return this.patch(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/links/${linkId}/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async remove(workspaceSlug: string, pageId: string, linkId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/links/${linkId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
