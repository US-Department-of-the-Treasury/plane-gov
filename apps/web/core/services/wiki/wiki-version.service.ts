import { API_BASE_URL } from "@plane/constants";
import type { TWikiPageVersion, TWikiPageVersionDetail, TWikiPageVersionListResponse } from "@plane/types";
import { APIService } from "@/services/api.service";

export class WikiVersionService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async fetchAll(
    workspaceSlug: string,
    pageId: string,
    offset?: number
  ): Promise<TWikiPageVersionListResponse> {
    const params: Record<string, unknown> = {};
    if (offset !== undefined) {
      params.offset = offset;
    }
    return this.get(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/versions/`, { params })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async fetchById(
    workspaceSlug: string,
    pageId: string,
    versionId: string
  ): Promise<TWikiPageVersionDetail> {
    return this.get(
      `/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/versions/${versionId}/`
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async restore(workspaceSlug: string, pageId: string, versionId: string): Promise<void> {
    return this.post(
      `/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/versions/${versionId}/restore/`
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
