// services
import { API_BASE_URL } from "@plane/constants";
import type {
  ISprint,
  TIssuesResponse,
  IWorkspaceActiveSprintsResponse,
  TSprintDistribution,
  TProgressSnapshot,
  TSprintEstimateDistribution,
} from "@plane/types";
import { APIService } from "@/services/api.service";

/**
 * SprintService for workspace-wide sprints.
 *
 * IMPORTANT: Sprints are now workspace-wide and auto-generated.
 * - Sprints cannot be created or deleted manually
 * - Sprint dates are auto-calculated (read-only)
 * - Only name, description, logo_props, view_props, sort_order can be updated
 */
export class SprintService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  /**
   * Get all sprints for a workspace.
   * This will auto-generate sprints if workspace.sprint_start_date is set.
   */
  async getWorkspaceSprints(workspaceSlug: string): Promise<ISprint[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/sprints/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Get sprint details by ID.
   */
  async getSprintDetails(workspaceSlug: string, sprintId: string): Promise<ISprint> {
    return this.get(`/api/workspaces/${workspaceSlug}/sprints/${sprintId}/`)
      .then((res) => res?.data)
      .catch((err) => {
        throw err?.response?.data;
      });
  }

  /**
   * Update sprint details.
   * Only name, description, logo_props, view_props, sort_order can be updated.
   * Dates are auto-calculated and cannot be changed.
   */
  async patchSprint(workspaceSlug: string, sprintId: string, data: Partial<ISprint>): Promise<ISprint> {
    return this.patch(`/api/workspaces/${workspaceSlug}/sprints/${sprintId}/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Get issues for a sprint.
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
   * Add or remove an issue from a sprint.
   */
  async updateSprintIssue(
    workspaceSlug: string,
    sprintId: string,
    issueId: string,
    data: { sprint_id: string | null }
  ): Promise<any> {
    return this.patch(`/api/workspaces/${workspaceSlug}/sprints/${sprintId}/issues/${issueId}/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Add sprint to favorites.
   */
  async addSprintToFavorites(workspaceSlug: string, sprintId: string): Promise<any> {
    return this.post(`/api/workspaces/${workspaceSlug}/sprints/${sprintId}/favorite/`, {})
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Remove sprint from favorites.
   */
  async removeSprintFromFavorites(workspaceSlug: string, sprintId: string): Promise<any> {
    return this.delete(`/api/workspaces/${workspaceSlug}/sprints/${sprintId}/favorite/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Get user properties for a sprint.
   */
  async getSprintUserProperties(workspaceSlug: string, sprintId: string): Promise<any> {
    return this.get(`/api/workspaces/${workspaceSlug}/sprints/${sprintId}/user-properties/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Update user properties for a sprint.
   */
  async updateSprintUserProperties(workspaceSlug: string, sprintId: string, data: any): Promise<any> {
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
