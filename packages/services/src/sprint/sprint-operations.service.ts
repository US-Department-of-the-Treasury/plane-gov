import { API_BASE_URL } from "@plane/constants";
import { APIService } from "../api.service";

/**
 * Service class for sprint operations.
 *
 * NOTE: Many operations are now handled by the main SprintService.
 * This service is kept for backward compatibility.
 *
 * @extends {APIService}
 */
export class SprintOperationsService extends APIService {
  constructor(BASE_URL?: string) {
    super(BASE_URL || API_BASE_URL);
  }

  /**
   * Adds a sprint to user favorites.
   * @param {string} workspaceSlug - The workspace identifier
   * @param {string} sprintId - The sprint identifier
   * @returns {Promise<any>} The response data
   * @throws {Error} If the request fails
   */
  async addToFavorites(workspaceSlug: string, sprintId: string): Promise<any> {
    return this.post(`/api/workspaces/${workspaceSlug}/sprints/${sprintId}/favorite/`, {})
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Removes a sprint from user favorites.
   * @param {string} workspaceSlug - The workspace identifier
   * @param {string} sprintId - The sprint identifier
   * @returns {Promise<any>} The removal response
   * @throws {Error} If the request fails
   */
  async removeFromFavorites(workspaceSlug: string, sprintId: string): Promise<any> {
    return this.delete(`/api/workspaces/${workspaceSlug}/sprints/${sprintId}/favorite/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Transfers issues between sprints.
   * @param {string} workspaceSlug - The workspace identifier
   * @param {string} fromSprintId - The source sprint identifier
   * @param {string} toSprintId - The target sprint identifier
   * @returns {Promise<any>} The transfer response
   * @throws {Error} If the request fails
   * @deprecated Issue assignment is now done directly on the issue
   */
  async transferIssues(workspaceSlug: string, fromSprintId: string, toSprintId: string): Promise<any> {
    // This functionality should be handled by updating issues directly
    throw new Error("transferIssues is deprecated. Update issue sprint_id directly.");
  }
}
