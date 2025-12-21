import { API_BASE_URL } from "@plane/constants";
import { APIService } from "../api.service";

export class SprintOperationsService extends APIService {
  constructor(BASE_URL?: string) {
    super(BASE_URL || API_BASE_URL);
  }

  /**
   * Adds a sprint to user favorites.
   * @param {string} workspaceSlug - The workspace identifier
   * @param {string} projectId - The project identifier
   * @param {{sprint: string}} data - The favorite sprint data
   * @returns {Promise<any>} The response data
   * @throws {Error} If the request fails
   */
  async addToFavorites(
    workspaceSlug: string,
    projectId: string,
    data: {
      sprint: string;
    }
  ): Promise<any> {
    return this.post(`/api/workspaces/${workspaceSlug}/projects/${projectId}/user-favorite-sprints/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Removes a sprint from user favorites.
   * @param {string} workspaceSlug - The workspace identifier
   * @param {string} projectId - The project identifier
   * @param {string} sprintId - The sprint identifier
   * @returns {Promise<any>} The removal response
   * @throws {Error} If the request fails
   */
  async removeFromFavorites(workspaceSlug: string, projectId: string, sprintId: string): Promise<any> {
    return this.delete(`/api/workspaces/${workspaceSlug}/projects/${projectId}/user-favorite-sprints/${sprintId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Transfers issues between sprints.
   * @param {string} workspaceSlug - The workspace identifier
   * @param {string} projectId - The project identifier
   * @param {string} sprintId - The source sprint identifier
   * @param {{new_sprint_id: string}} data - The target sprint data
   * @returns {Promise<any>} The transfer response
   * @throws {Error} If the request fails
   */
  async transferIssues(
    workspaceSlug: string,
    projectId: string,
    sprintId: string,
    data: {
      new_sprint_id: string;
    }
  ): Promise<any> {
    return this.post(`/api/workspaces/${workspaceSlug}/projects/${projectId}/sprints/${sprintId}/transfer-issues/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
