import { API_BASE_URL } from "@plane/constants";
import type { SprintDateCheckData, ISprint, TIssuesResponse, IWorkspaceActiveSprintsResponse } from "@plane/types";
import { APIService } from "../api.service";

/**
 * Service class for managing sprints within a workspace and project context.
 * Extends APIService to handle HTTP requests to the sprint-related endpoints.
 * @extends {APIService}
 */
export class SprintService extends APIService {
  constructor(BASE_URL?: string) {
    super(BASE_URL || API_BASE_URL);
  }

  /**
   * Retrieves paginated list of active sprints in a workspace.
   * @param {string} workspaceSlug - The workspace identifier
   * @param {string} cursor - The pagination cursor
   * @param {number} per_page - Number of items per page
   * @returns {Promise<IWorkspaceActiveSprintsResponse>} Paginated active sprints data
   * @throws {Error} If the request fails
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

  /**
   * Gets all sprints in a workspace.
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
   * Creates a new sprint in a project.
   * @param {string} workspaceSlug - The workspace identifier
   * @param {string} projectId - The project identifier
   * @param {any} data - The sprint creation data
   * @returns {Promise<ISprint>} The created sprint object
   * @throws {Error} If the request fails
   */
  async create(workspaceSlug: string, projectId: string, data: any): Promise<ISprint> {
    return this.post(`/api/workspaces/${workspaceSlug}/projects/${projectId}/sprints/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Retrieves sprints with optional filtering parameters.
   * @param {string} workspaceSlug - The workspace identifier
   * @param {string} projectId - The project identifier
   * @param {"current"} [sprintType] - Optional filter for sprint type
   * @returns {Promise<ISprint[]>} Array of filtered sprint objects
   * @throws {Error} If the request fails
   */
  async getWithParams(workspaceSlug: string, projectId: string, sprintType?: "current"): Promise<ISprint[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/sprints/`, {
      params: {
        sprint_view: sprintType,
      },
    })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Retrieves detailed information for a specific sprint.
   * @param {string} workspaceSlug - The workspace identifier
   * @param {string} projectId - The project identifier
   * @param {string} sprintId - The sprint identifier
   * @returns {Promise<ISprint>} The sprint details
   * @throws {Error} If the request fails
   */
  async retrieve(workspaceSlug: string, projectId: string, sprintId: string): Promise<ISprint> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/sprints/${sprintId}/`)
      .then((res) => res?.data)
      .catch((err) => {
        throw err?.response?.data;
      });
  }

  /**
   * Retrieves issues associated with a specific sprint.
   * @param {string} workspaceSlug - The workspace identifier
   * @param {string} projectId - The project identifier
   * @param {string} sprintId - The sprint identifier
   * @param {any} [queries] - Optional query parameters
   * @param {object} [config={}] - Optional request configuration
   * @returns {Promise<TIssuesResponse>} The sprint issues data
   * @throws {Error} If the request fails
   */
  async getSprintIssues(
    workspaceSlug: string,
    projectId: string,
    sprintId: string,
    queries?: any,
    config = {}
  ): Promise<TIssuesResponse> {
    return this.get(
      `/api/workspaces/${workspaceSlug}/projects/${projectId}/sprints/${sprintId}/sprint-issues/`,
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
   * Updates a sprint with partial data.
   * @param {string} workspaceSlug - The workspace identifier
   * @param {string} projectId - The project identifier
   * @param {string} sprintId - The sprint identifier
   * @param {Partial<ISprint>} data - The partial sprint data to update
   * @returns {Promise<any>} The update response
   * @throws {Error} If the request fails
   */
  async update(workspaceSlug: string, projectId: string, sprintId: string, data: Partial<ISprint>): Promise<any> {
    return this.patch(`/api/workspaces/${workspaceSlug}/projects/${projectId}/sprints/${sprintId}/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Deletes a specific sprint.
   * @param {string} workspaceSlug - The workspace identifier
   * @param {string} projectId - The project identifier
   * @param {string} sprintId - The sprint identifier
   * @returns {Promise<any>} The deletion response
   * @throws {Error} If the request fails
   */
  async destroy(workspaceSlug: string, projectId: string, sprintId: string): Promise<any> {
    return this.delete(`/api/workspaces/${workspaceSlug}/projects/${projectId}/sprints/${sprintId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Validates sprint dates.
   * @param {string} workspaceSlug - The workspace identifier
   * @param {string} projectId - The project identifier
   * @param {SprintDateCheckData} data - The date check data
   * @returns {Promise<any>} The validation response
   * @throws {Error} If the request fails
   */
  async validateDates(workspaceSlug: string, projectId: string, data: SprintDateCheckData): Promise<any> {
    return this.post(`/api/workspaces/${workspaceSlug}/projects/${projectId}/sprints/date-check/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
