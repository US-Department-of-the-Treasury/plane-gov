import { API_BASE_URL } from "@plane/constants";
import type { TWikiPageShare, TWikiPageShareFormData } from "@plane/types";
import { APIService } from "@/services/api.service";

export class WikiShareService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async fetchAll(workspaceSlug: string, pageId: string): Promise<TWikiPageShare[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/shares/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async create(
    workspaceSlug: string,
    pageId: string,
    data: TWikiPageShareFormData
  ): Promise<TWikiPageShare> {
    return this.post(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/shares/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async update(
    workspaceSlug: string,
    pageId: string,
    shareId: string,
    data: Partial<TWikiPageShareFormData>
  ): Promise<TWikiPageShare> {
    return this.patch(
      `/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/shares/${shareId}/`,
      data
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async remove(workspaceSlug: string, pageId: string, shareId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/shares/${shareId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
