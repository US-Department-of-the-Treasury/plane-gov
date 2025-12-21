import { API_BASE_URL } from "@plane/constants";
import type { ISprint } from "@plane/types";
import { APIService } from "../api.service";

/**
 * Service class for managing archived sprints.
 *
 * NOTE: Since sprints are now workspace-wide and auto-generated,
 * archiving functionality is limited. Sprints cannot be deleted
 * but can be archived to hide them from active views.
 *
 * @extends {APIService}
 * @deprecated Sprint archiving is being phased out. Sprints are now auto-generated
 * and should not be archived.
 */
export class SprintArchiveService extends APIService {
  constructor(BASE_URL?: string) {
    super(BASE_URL || API_BASE_URL);
  }

  /**
   * Retrieves all archived sprints for a workspace.
   * @param {string} workspaceSlug - The unique identifier for the workspace
   * @returns {Promise<ISprint[]>} Array of archived sprints
   * @throws {Error} Throws response data if the request fails
   * @deprecated Archiving is being phased out
   */
  async list(workspaceSlug: string): Promise<ISprint[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/archived-sprints/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Retrieves details of a specific archived sprint.
   * @param {string} workspaceSlug - The unique identifier for the workspace
   * @param {string} sprintId - The unique identifier for the sprint
   * @returns {Promise<ISprint>} Details of the archived sprint
   * @throws {Error} Throws response data if the request fails
   * @deprecated Archiving is being phased out
   */
  async retrieve(workspaceSlug: string, sprintId: string): Promise<ISprint> {
    return this.get(`/api/workspaces/${workspaceSlug}/archived-sprints/${sprintId}/`)
      .then((res) => res?.data)
      .catch((err) => {
        throw err?.response?.data;
      });
  }

  /**
   * Archives a specific sprint.
   * @param {string} workspaceSlug - The unique identifier for the workspace
   * @param {string} sprintId - The unique identifier for the sprint to archive
   * @returns {Promise<{archived_at: string}>} Object containing the archive timestamp
   * @throws {Error} Throws response data if the request fails
   * @deprecated Archiving is being phased out
   */
  async archive(workspaceSlug: string, sprintId: string): Promise<{ archived_at: string }> {
    return this.post(`/api/workspaces/${workspaceSlug}/sprints/${sprintId}/archive/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Restores a previously archived sprint.
   * @param {string} workspaceSlug - The unique identifier for the workspace
   * @param {string} sprintId - The unique identifier for the sprint to restore
   * @returns {Promise<void>} Resolves when the sprint is successfully restored
   * @throws {Error} Throws response data if the request fails
   * @deprecated Archiving is being phased out
   */
  async restore(workspaceSlug: string, sprintId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/sprints/${sprintId}/archive/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
