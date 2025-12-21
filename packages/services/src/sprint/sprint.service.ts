import { API_BASE_URL } from "@plane/constants";
import type { ISprint, TIssuesResponse, IWorkspaceActiveSprintsResponse } from "@plane/types";
import { APIService } from "../api.service";

/**
 * Service class for managing workspace-wide sprints.
 * Extends APIService to handle HTTP requests to the sprint-related endpoints.
 *
 * IMPORTANT: Sprints are now workspace-wide and auto-generated.
 * - Sprints cannot be created or deleted manually
 * - Sprint dates are auto-calculated based on workspace.sprint_start_date
 * - Each sprint is exactly 14 days (2 weeks)
 * - Only name, description, logo_props, view_props, sort_order can be updated
 *
 * @extends {APIService}
 */
export class SprintService extends APIService {
  constructor(BASE_URL?: string) {
    super(BASE_URL || API_BASE_URL);
  }

  /**
   * Gets all sprints for a workspace.
   * This will auto-generate sprints if workspace.sprint_start_date is set.
   * @param {string} workspaceSlug - The workspace identifier
   * @returns {Promise<ISprint[]>} Array of sprint objects
   * @throws {Error} If the request fails
   */
  async getWorkspaceSprints(workspaceSlug: string): Promise<ISprint[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/sprints/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Retrieves detailed information for a specific sprint.
   * @param {string} workspaceSlug - The workspace identifier
   * @param {string} sprintId - The sprint identifier
   * @returns {Promise<ISprint>} The sprint details
   * @throws {Error} If the request fails
   */
  async retrieve(workspaceSlug: string, sprintId: string): Promise<ISprint> {
    return this.get(`/api/workspaces/${workspaceSlug}/sprints/${sprintId}/`)
      .then((res) => res?.data)
      .catch((err) => {
        throw err?.response?.data;
      });
  }

  /**
   * Updates a sprint with partial data.
   * Only name, description, logo_props, view_props, sort_order can be updated.
   * Dates are auto-calculated and cannot be changed.
   * @param {string} workspaceSlug - The workspace identifier
   * @param {string} sprintId - The sprint identifier
   * @param {Partial<ISprint>} data - The partial sprint data to update
   * @returns {Promise<ISprint>} The updated sprint
   * @throws {Error} If the request fails
   */
  async update(workspaceSlug: string, sprintId: string, data: Partial<ISprint>): Promise<ISprint> {
    return this.patch(`/api/workspaces/${workspaceSlug}/sprints/${sprintId}/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Retrieves issues associated with a specific sprint.
   * @param {string} workspaceSlug - The workspace identifier
   * @param {string} sprintId - The sprint identifier
   * @param {any} [queries] - Optional query parameters
   * @param {object} [config={}] - Optional request configuration
   * @returns {Promise<TIssuesResponse>} The sprint issues data
   * @throws {Error} If the request fails
   */
  async getSprintIssues(
    workspaceSlug: string,
    sprintId: string,
    queries?: any,
    config = {}
  ): Promise<TIssuesResponse> {
    return this.get(
      `/api/workspaces/${workspaceSlug}/sprints/${sprintId}/issues/`,
      {
        params: queries,
      },
      config
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Add sprint to favorites.
   * @param {string} workspaceSlug - The workspace identifier
   * @param {string} sprintId - The sprint identifier
   * @returns {Promise<any>} The response
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
   * Remove sprint from favorites.
   * @param {string} workspaceSlug - The workspace identifier
   * @param {string} sprintId - The sprint identifier
   * @returns {Promise<any>} The response
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
   * Get user properties for a sprint.
   * @param {string} workspaceSlug - The workspace identifier
   * @param {string} sprintId - The sprint identifier
   * @returns {Promise<any>} The user properties
   * @throws {Error} If the request fails
   */
  async getUserProperties(workspaceSlug: string, sprintId: string): Promise<any> {
    return this.get(`/api/workspaces/${workspaceSlug}/sprints/${sprintId}/user-properties/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Update user properties for a sprint.
   * @param {string} workspaceSlug - The workspace identifier
   * @param {string} sprintId - The sprint identifier
   * @param {any} data - The properties to update
   * @returns {Promise<any>} The updated properties
   * @throws {Error} If the request fails
   */
  async updateUserProperties(workspaceSlug: string, sprintId: string, data: any): Promise<any> {
    return this.patch(`/api/workspaces/${workspaceSlug}/sprints/${sprintId}/user-properties/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  // Legacy methods for backward compatibility - will be removed in future

  /**
   * @deprecated Use getWorkspaceSprints instead
   */
  async workspaceActiveSprints(
    workspaceSlug: string,
    cursor: string,
    per_page: number
  ): Promise<IWorkspaceActiveSprintsResponse> {
    return this.get(`/api/workspaces/${workspaceSlug}/active-sprints/`, {
      params: {
        per_page,
        cursor,
      },
    })
      .then((res) => res?.data)
      .catch((err) => {
        throw err?.response?.data;
      });
  }
}
