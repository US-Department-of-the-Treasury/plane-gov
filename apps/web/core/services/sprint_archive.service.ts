// type
import { API_BASE_URL } from "@plane/constants";
import type { ISprint } from "@plane/types";
// helpers
// services
import { APIService } from "@/services/api.service";

export class SprintArchiveService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async getArchivedSprints(workspaceSlug: string, projectId: string): Promise<ISprint[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/archived-sprints/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async getArchivedSprintDetails(workspaceSlug: string, projectId: string, sprintId: string): Promise<ISprint> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/archived-sprints/${sprintId}/`)
      .then((res) => res?.data)
      .catch((err) => {
        throw err?.response?.data;
      });
  }

  async archiveSprint(
    workspaceSlug: string,
    projectId: string,
    sprintId: string
  ): Promise<{
    archived_at: string;
  }> {
    return this.post(`/api/workspaces/${workspaceSlug}/projects/${projectId}/sprints/${sprintId}/archive/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async restoreSprint(workspaceSlug: string, projectId: string, sprintId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/projects/${projectId}/sprints/${sprintId}/archive/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
