// type
import { API_BASE_URL } from "@plane/constants";
import type { ISprint } from "@plane/types";
// services
import { APIService } from "@/services/api.service";

/**
 * Service class for managing archived sprints.
 *
 * NOTE: Since sprints are now workspace-wide and auto-generated,
 * archiving functionality is limited. Sprints cannot be deleted
 * but can be archived to hide them from active views.
 *
 * @deprecated Sprint archiving is being phased out. Sprints are now auto-generated
 * and should not be archived.
 */
export class SprintArchiveService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  /**
   * Get all archived sprints for a workspace.
   * @deprecated Archiving is being phased out
   */
  async getArchivedSprints(workspaceSlug: string): Promise<ISprint[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/archived-sprints/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Get details of a specific archived sprint.
   * @deprecated Archiving is being phased out
   */
  async getArchivedSprintDetails(workspaceSlug: string, sprintId: string): Promise<ISprint> {
    return this.get(`/api/workspaces/${workspaceSlug}/archived-sprints/${sprintId}/`)
      .then((res) => res?.data)
      .catch((err) => {
        throw err?.response?.data;
      });
  }

  /**
   * Archive a sprint.
   * @deprecated Archiving is being phased out
   */
  async archiveSprint(workspaceSlug: string, sprintId: string): Promise<{ archived_at: string }> {
    return this.post(`/api/workspaces/${workspaceSlug}/sprints/${sprintId}/archive/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Restore an archived sprint.
   * @deprecated Archiving is being phased out
   */
  async restoreSprint(workspaceSlug: string, sprintId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/sprints/${sprintId}/archive/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
