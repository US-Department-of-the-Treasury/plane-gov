// type
import { API_BASE_URL } from "@plane/constants";
import type { IEpic } from "@plane/types";
// helpers
// services
import { APIService } from "@/services/api.service";

export class EpicArchiveService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async getArchivedEpics(workspaceSlug: string, projectId: string): Promise<IEpic[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/archived-epics/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async getArchivedEpicDetails(workspaceSlug: string, projectId: string, epicId: string): Promise<IEpic> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/archived-epics/${epicId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async archiveEpic(
    workspaceSlug: string,
    projectId: string,
    epicId: string
  ): Promise<{
    archived_at: string;
  }> {
    return this.post(`/api/workspaces/${workspaceSlug}/projects/${projectId}/epics/${epicId}/archive/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async restoreEpic(workspaceSlug: string, projectId: string, epicId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/projects/${projectId}/epics/${epicId}/archive/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
