import { API_BASE_URL } from "@plane/constants";
import type { TSprintDistribution, TProgressSnapshot, TSprintEstimateDistribution } from "@plane/types";
import { APIService } from "../api.service";

/**
 * Service class for managing sprints within a workspace and project context.
 * Extends APIService to handle HTTP requests to the sprint-related endpoints.
 * @extends {APIService}
 */
export class SprintAnalyticsService extends APIService {
  constructor(BASE_URL?: string) {
    super(BASE_URL || API_BASE_URL);
  }

  /**
   * Retrieves analytics for active sprints in a workspace.
   * @param {string} workspaceSlug - The workspace identifier
   * @param {string} projectId - The project identifier
   * @param {string} sprintId - The sprint identifier
   * @param {string} [analytic_type="points"] - The type of analytics to retrieve
   * @returns {Promise<TSprintDistribution | TSprintEstimateDistribution>} The sprint analytics data
   * @throws {Error} If the request fails
   */
  async workspaceActiveSprintsAnalytics(
    workspaceSlug: string,
    projectId: string,
    sprintId: string,
    analytic_type: string = "points"
  ): Promise<TSprintDistribution | TSprintEstimateDistribution> {
    return this.get(
      `/api/workspaces/${workspaceSlug}/projects/${projectId}/sprints/${sprintId}/analytics?type=${analytic_type}`
    )
      .then((res) => res?.data)
      .catch((err) => {
        throw err?.response?.data;
      });
  }

  /**
   * Retrieves progress data for active sprints.
   * @param {string} workspaceSlug - The workspace identifier
   * @param {string} projectId - The project identifier
   * @param {string} sprintId - The sprint identifier
   * @returns {Promise<TProgressSnapshot>} The sprint progress data
   * @throws {Error} If the request fails
   */
  async workspaceActiveSprintsProgress(
    workspaceSlug: string,
    projectId: string,
    sprintId: string
  ): Promise<TProgressSnapshot> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/sprints/${sprintId}/progress/`)
      .then((res) => res?.data)
      .catch((err) => {
        throw err?.response?.data;
      });
  }

  /**
   * Retrieves advanced progress data for active sprints (Pro feature).
   * @param {string} workspaceSlug - The workspace identifier
   * @param {string} projectId - The project identifier
   * @param {string} sprintId - The sprint identifier
   * @returns {Promise<TProgressSnapshot>} The detailed sprint progress data
   * @throws {Error} If the request fails
   */
  async workspaceActiveSprintsProgressPro(
    workspaceSlug: string,
    projectId: string,
    sprintId: string
  ): Promise<TProgressSnapshot> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/sprints/${sprintId}/sprint-progress/`)
      .then((res) => res?.data)
      .catch((err) => {
        throw err?.response?.data;
      });
  }
}
