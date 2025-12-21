// services
import { API_BASE_URL } from "@plane/constants";
import type {
  SprintDateCheckData,
  ISprint,
  TIssuesResponse,
  IWorkspaceActiveSprintsResponse,
  TSprintDistribution,
  TProgressSnapshot,
  TSprintEstimateDistribution,
} from "@plane/types";
import { APIService } from "@/services/api.service";

export class SprintService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

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

  async getWorkspaceSprints(workspaceSlug: string): Promise<ISprint[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/sprints/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async createSprint(workspaceSlug: string, projectId: string, data: any): Promise<ISprint> {
    return this.post(`/api/workspaces/${workspaceSlug}/projects/${projectId}/sprints/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async getSprintsWithParams(workspaceSlug: string, projectId: string, sprintType?: "current"): Promise<ISprint[]> {
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

  async getSprintDetails(workspaceSlug: string, projectId: string, sprintId: string): Promise<ISprint> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/sprints/${sprintId}/`)
      .then((res) => res?.data)
      .catch((err) => {
        throw err?.response?.data;
      });
  }

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

  async patchSprint(workspaceSlug: string, projectId: string, sprintId: string, data: Partial<ISprint>): Promise<any> {
    return this.patch(`/api/workspaces/${workspaceSlug}/projects/${projectId}/sprints/${sprintId}/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async deleteSprint(workspaceSlug: string, projectId: string, sprintId: string): Promise<any> {
    return this.delete(`/api/workspaces/${workspaceSlug}/projects/${projectId}/sprints/${sprintId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async sprintDateCheck(workspaceSlug: string, projectId: string, data: SprintDateCheckData): Promise<any> {
    return this.post(`/api/workspaces/${workspaceSlug}/projects/${projectId}/sprints/date-check/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async addSprintToFavorites(
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

  async removeSprintFromFavorites(workspaceSlug: string, projectId: string, sprintId: string): Promise<any> {
    return this.delete(`/api/workspaces/${workspaceSlug}/projects/${projectId}/user-favorite-sprints/${sprintId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
