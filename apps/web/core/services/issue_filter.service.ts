// services
import { API_BASE_URL } from "@plane/constants";
import type { IIssueFiltersResponse } from "@plane/types";
import { APIService } from "@/services/api.service";
// types

export class IssueFiltersService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  // // workspace issue filters
  // async fetchWorkspaceFilters(workspaceSlug: string): Promise<IIssueFiltersResponse> {
  //   return this.get(`/api/workspaces/${workspaceSlug}/user-properties/`)
  //     .then((response) => response?.data)
  //     .catch((error) => {
  //       throw error?.response?.data;
  //     });
  // }
  // async patchWorkspaceFilters(
  //   workspaceSlug: string,
  //   data: Partial<IIssueFiltersResponse>
  // ): Promise<IIssueFiltersResponse> {
  //   return this.patch(`/api/workspaces/${workspaceSlug}/user-properties/`, data)
  //     .then((response) => response?.data)
  //     .catch((error) => {
  //       throw error?.response?.data;
  //     });
  // }

  // project issue filters
  async fetchProjectIssueFilters(workspaceSlug: string, projectId: string): Promise<IIssueFiltersResponse> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/user-properties/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
  async patchProjectIssueFilters(
    workspaceSlug: string,
    projectId: string,
    data: Partial<IIssueFiltersResponse>
  ): Promise<any> {
    return this.patch(`/api/workspaces/${workspaceSlug}/projects/${projectId}/user-properties/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  // epic issue filters
  async fetchProjectEpicFilters(workspaceSlug: string, projectId: string): Promise<IIssueFiltersResponse> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/epics-user-properties/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
  async patchProjectEpicFilters(
    workspaceSlug: string,
    projectId: string,
    data: Partial<IIssueFiltersResponse>
  ): Promise<any> {
    return this.patch(`/api/workspaces/${workspaceSlug}/projects/${projectId}/epics-user-properties/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  // sprint issue filters
  async fetchSprintIssueFilters(
    workspaceSlug: string,
    projectId: string,
    sprintId: string
  ): Promise<IIssueFiltersResponse> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/sprints/${sprintId}/user-properties/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
  async patchSprintIssueFilters(
    workspaceSlug: string,
    projectId: string,
    sprintId: string,
    data: Partial<IIssueFiltersResponse>
  ): Promise<any> {
    return this.patch(
      `/api/workspaces/${workspaceSlug}/projects/${projectId}/sprints/${sprintId}/user-properties/`,
      data
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  // epic issue filters (for issues within epics)
  async fetchEpicIssueFilters(
    workspaceSlug: string,
    projectId: string,
    epicId: string
  ): Promise<IIssueFiltersResponse> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/epics/${epicId}/user-properties/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
  async patchEpicIssueFilters(
    workspaceSlug: string,
    projectId: string,
    epicId: string,
    data: Partial<IIssueFiltersResponse>
  ): Promise<any> {
    return this.patch(`/api/workspaces/${workspaceSlug}/projects/${projectId}/epics/${epicId}/user-properties/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
