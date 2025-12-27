/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access */
// Note: These rules are disabled because the APIService base class returns untyped responses.
// This is a codebase-wide pattern that would require refactoring APIService to fix properly.
import { API_BASE_URL } from "@plane/constants";
import type { TDocument, TDocumentDetail, TDocumentFormData, TDocumentUpdatePayload } from "@plane/types";
import { APIService } from "@/services/api.service";

export class DocumentService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async fetchAll(workspaceSlug: string): Promise<TDocument[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/documents/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async fetchByProject(workspaceSlug: string, projectId: string): Promise<TDocument[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/documents/`, {
      params: { project: projectId },
    })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async fetchById(workspaceSlug: string, documentId: string): Promise<TDocumentDetail> {
    return this.get(`/api/workspaces/${workspaceSlug}/documents/${documentId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async create(workspaceSlug: string, data: TDocumentFormData): Promise<TDocument> {
    return this.post(`/api/workspaces/${workspaceSlug}/documents/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async update(workspaceSlug: string, documentId: string, data: TDocumentFormData): Promise<TDocument> {
    return this.patch(`/api/workspaces/${workspaceSlug}/documents/${documentId}/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async remove(workspaceSlug: string, documentId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/documents/${documentId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async archive(workspaceSlug: string, documentId: string): Promise<{ archived_at: string }> {
    return this.post(`/api/workspaces/${workspaceSlug}/documents/${documentId}/archive/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async unarchive(workspaceSlug: string, documentId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/documents/${documentId}/archive/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async lock(workspaceSlug: string, documentId: string): Promise<void> {
    return this.post(`/api/workspaces/${workspaceSlug}/documents/${documentId}/lock/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async unlock(workspaceSlug: string, documentId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/documents/${documentId}/lock/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async duplicate(workspaceSlug: string, documentId: string): Promise<TDocument> {
    return this.post(`/api/workspaces/${workspaceSlug}/documents/${documentId}/duplicate/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async fetchDescriptionBinary(workspaceSlug: string, documentId: string): Promise<ArrayBuffer> {
    return this.get(`/api/workspaces/${workspaceSlug}/documents/${documentId}/description/`, {
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

  async updateDescription(workspaceSlug: string, documentId: string, data: TDocumentUpdatePayload): Promise<void> {
    return this.patch(`/api/workspaces/${workspaceSlug}/documents/${documentId}/description/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error;
      });
  }

  async fetchArchived(workspaceSlug: string): Promise<TDocument[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/documents/`, {
      params: { archived: true },
    })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async fetchShared(workspaceSlug: string): Promise<TDocument[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/documents/`, {
      params: { access: 2 }, // EDocumentAccess.SHARED
    })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async fetchPrivate(workspaceSlug: string): Promise<TDocument[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/documents/`, {
      params: { access: 1 }, // EDocumentAccess.PRIVATE
    })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Search documents using full-text search.
   * Backend uses PostgreSQL full-text search for efficient querying.
   */
  async search(workspaceSlug: string, query: string): Promise<TDocument[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/documents/search/`, {
      params: { q: query },
    })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
