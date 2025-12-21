import { API_BASE_URL } from "@plane/constants";
import type { ISprint } from "@plane/types";
import { APIService } from "../api.service";

/**
 * Service class for managing archived sprints in a project
 * Provides methods for retrieving, archiving, and restoring project sprints
 * @extends {APIService}
 */
export class SprintArchiveService extends APIService {
  constructor(BASE_URL?: string) {
    super(BASE_URL || API_BASE_URL);
  }

  /**
   * Retrieves all archived sprints for a specific project
   * @param {string} workspaceSlug - The unique identifier for the workspace
   * @param {string} projectId - The unique identifier for the project
   * @returns {Promise<ISprint[]>} Array of archived sprints
   * @throws {Error} Throws response data if the request fails
   */
  async list(workspaceSlug: string, projectId: string): Promise<ISprint[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/archived-sprints/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Retrieves details of a specific archived sprint
   * @param {string} workspaceSlug - The unique identifier for the workspace
   * @param {string} projectId - The unique identifier for the project
   * @param {string} sprintId - The unique identifier for the sprint
   * @returns {Promise<ISprint>} Details of the archived sprint
   * @throws {Error} Throws response data if the request fails
   */
  async retrieve(workspaceSlug: string, projectId: string, sprintId: string): Promise<ISprint> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/archived-sprints/${sprintId}/`)
      .then((res) => res?.data)
      .catch((err) => {
        throw err?.response?.data;
      });
  }

  /**
   * Archives a specific sprint in a project
   * @param {string} workspaceSlug - The unique identifier for the workspace
   * @param {string} projectId - The unique identifier for the project
   * @param {string} sprintId - The unique identifier for the sprint to archive
   * @returns {Promise<{archived_at: string}>} Object containing the archive timestamp
   * @throws {Error} Throws response data if the request fails
   */
  async archive(
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

  /**
   * Restores a previously archived sprint
   * @param {string} workspaceSlug - The unique identifier for the workspace
   * @param {string} projectId - The unique identifier for the project
   * @param {string} sprintId - The unique identifier for the sprint to restore
   * @returns {Promise<void>} Resolves when the sprint is successfully restored
   * @throws {Error} Throws response data if the request fails
   */
  async restore(workspaceSlug: string, projectId: string, sprintId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/projects/${projectId}/sprints/${sprintId}/archive/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
