// types
import { API_BASE_URL } from "@plane/constants";
import type { IEpic, ILinkDetails, EpicLink, TIssuesResponse } from "@plane/types";
// services
import { APIService } from "@/services/api.service";

export class EpicService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async getWorkspaceEpics(workspaceSlug: string): Promise<IEpic[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/epics/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async getEpics(workspaceSlug: string, projectId: string): Promise<IEpic[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/epics/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async createEpic(workspaceSlug: string, projectId: string, data: any): Promise<IEpic> {
    return this.post(`/api/workspaces/${workspaceSlug}/projects/${projectId}/epics/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async updateEpic(workspaceSlug: string, projectId: string, epicId: string, data: any): Promise<any> {
    return this.put(`/api/workspaces/${workspaceSlug}/projects/${projectId}/epics/${epicId}/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async getEpicDetails(workspaceSlug: string, projectId: string, epicId: string): Promise<IEpic> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/epics/${epicId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async patchEpic(
    workspaceSlug: string,
    projectId: string,
    epicId: string,
    data: Partial<IEpic>
  ): Promise<IEpic> {
    return this.patch(`/api/workspaces/${workspaceSlug}/projects/${projectId}/epics/${epicId}/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async deleteEpic(workspaceSlug: string, projectId: string, epicId: string): Promise<any> {
    return this.delete(`/api/workspaces/${workspaceSlug}/projects/${projectId}/epics/${epicId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async getEpicIssues(
    workspaceSlug: string,
    projectId: string,
    epicId: string,
    queries?: any,
    config = {}
  ): Promise<TIssuesResponse> {
    return this.get(
      `/api/workspaces/${workspaceSlug}/projects/${projectId}/epics/${epicId}/issues/`,
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

  async addIssuesToEpic(
    workspaceSlug: string,
    projectId: string,
    epicId: string,
    data: { issues: string[] }
  ): Promise<void> {
    return this.post(`/api/workspaces/${workspaceSlug}/projects/${projectId}/epics/${epicId}/issues/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async addEpicsToIssue(
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    data: { epics: string[]; removed_epics?: string[] }
  ): Promise<void> {
    return this.post(`/api/workspaces/${workspaceSlug}/projects/${projectId}/issues/${issueId}/epics/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async removeIssuesFromEpicBulk(
    workspaceSlug: string,
    projectId: string,
    epicId: string,
    issueIds: string[]
  ): Promise<void> {
    const promiseDataUrls: any = [];
    issueIds.forEach((issueId) => {
      promiseDataUrls.push(
        this.delete(`/api/workspaces/${workspaceSlug}/projects/${projectId}/epics/${epicId}/issues/${issueId}/`)
      );
    });
    await Promise.all(promiseDataUrls)
      .then((response) => response)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async removeEpicsFromIssueBulk(
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    epicIds: string[]
  ): Promise<void> {
    const promiseDataUrls: any = [];
    epicIds.forEach((epicId) => {
      promiseDataUrls.push(
        this.delete(`/api/workspaces/${workspaceSlug}/projects/${projectId}/epics/${epicId}/issues/${issueId}/`)
      );
    });
    await Promise.all(promiseDataUrls)
      .then((response) => response)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async createEpicLink(
    workspaceSlug: string,
    projectId: string,
    epicId: string,
    data: Partial<EpicLink>
  ): Promise<ILinkDetails> {
    return this.post(`/api/workspaces/${workspaceSlug}/projects/${projectId}/epics/${epicId}/epic-links/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response;
      });
  }

  async updateEpicLink(
    workspaceSlug: string,
    projectId: string,
    epicId: string,
    linkId: string,
    data: Partial<EpicLink>
  ): Promise<ILinkDetails> {
    return this.patch(
      `/api/workspaces/${workspaceSlug}/projects/${projectId}/epics/${epicId}/epic-links/${linkId}/`,
      data
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response;
      });
  }

  async deleteEpicLink(workspaceSlug: string, projectId: string, epicId: string, linkId: string): Promise<any> {
    return this.delete(
      `/api/workspaces/${workspaceSlug}/projects/${projectId}/epics/${epicId}/epic-links/${linkId}/`
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async addEpicToFavorites(
    workspaceSlug: string,
    projectId: string,
    data: {
      epic: string;
    }
  ): Promise<any> {
    return this.post(`/api/workspaces/${workspaceSlug}/projects/${projectId}/user-favorite-epics/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async removeEpicFromFavorites(workspaceSlug: string, projectId: string, epicId: string): Promise<any> {
    return this.delete(`/api/workspaces/${workspaceSlug}/projects/${projectId}/user-favorite-epics/${epicId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
