/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access */
// Note: These rules are disabled because the APIService base class returns untyped responses.
// This is a codebase-wide pattern that would require refactoring APIService to fix properly.
import { API_BASE_URL } from "@plane/constants";
import type { TWikiPage, TWikiPageDetail, TWikiPageFormData, TWikiDocumentPayload } from "@plane/types";
import { APIService } from "@/services/api.service";

export class WikiPageService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async fetchAll(workspaceSlug: string): Promise<TWikiPage[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/wiki/pages/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async fetchByProject(workspaceSlug: string, projectId: string): Promise<TWikiPage[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/wiki/pages/`, {
      params: { project: projectId },
    })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async fetchById(workspaceSlug: string, pageId: string): Promise<TWikiPageDetail> {
    return this.get(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async create(workspaceSlug: string, data: TWikiPageFormData): Promise<TWikiPage> {
    return this.post(`/api/workspaces/${workspaceSlug}/wiki/pages/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async update(workspaceSlug: string, pageId: string, data: TWikiPageFormData): Promise<TWikiPage> {
    return this.patch(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async remove(workspaceSlug: string, pageId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async archive(workspaceSlug: string, pageId: string): Promise<{ archived_at: string }> {
    return this.post(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/archive/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async unarchive(workspaceSlug: string, pageId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/archive/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async lock(workspaceSlug: string, pageId: string): Promise<void> {
    return this.post(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/lock/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async unlock(workspaceSlug: string, pageId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/lock/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async duplicate(workspaceSlug: string, pageId: string): Promise<TWikiPage> {
    return this.post(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/duplicate/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async fetchDescriptionBinary(workspaceSlug: string, pageId: string): Promise<ArrayBuffer> {
    return this.get(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/description/`, {
      headers: {
        "Content-Type": "application/octet-stream",
      },
      responseType: "arraybuffer",
    })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async updateDescription(workspaceSlug: string, pageId: string, data: TWikiDocumentPayload): Promise<void> {
    return this.patch(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/description/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error;
      });
  }

  async fetchArchived(workspaceSlug: string): Promise<TWikiPage[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/wiki/pages/`, {
      params: { archived: true },
    })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async fetchShared(workspaceSlug: string): Promise<TWikiPage[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/wiki/pages/`, {
      params: { access: 2 }, // EWikiPageAccess.SHARED
    })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async fetchPrivate(workspaceSlug: string): Promise<TWikiPage[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/wiki/pages/`, {
      params: { access: 1 }, // EWikiPageAccess.PRIVATE
    })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Search wiki pages using full-text search.
   * Backend uses PostgreSQL full-text search for efficient querying.
   */
  async search(workspaceSlug: string, query: string): Promise<TWikiPage[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/wiki/pages/search/`, {
      params: { q: query },
    })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
