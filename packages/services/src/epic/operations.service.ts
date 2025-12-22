// types
// import type { IEpic, ILinkDetails, EpicLink, TIssuesResponse } from "@plane/types";
// services
import { APIService } from "../api.service";

export class EpicOperationService extends APIService {
  constructor(baseURL: string) {
    super(baseURL);
  }

  /**
   * Add issues to an epic
   * @param {string} workspaceSlug - The slug of the workspace
   * @param {string} projectId - The ID of the project
   * @param {string} epicId - The ID of the epic
   * @param {object} data - The data to be sent in the request body
   * @param {string[]} data.issues - The IDs of the issues to be added
   * @returns {Promise<void>}
   */
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

  /**
   * Add epics to an issue
   * @param {string} workspaceSlug - The slug of the workspace
   * @param {string} projectId - The ID of the project
   * @param {string} issueId - The ID of the issue
   * @param {object} data - The data to be sent in the request body
   * @param {string[]} data.epics - The IDs of the epics to be added
   * @param {string[]} [data.removed_epics] - The IDs of the epics to be removed
   * @returns {Promise<void>}
   */
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

  /**
   * Remove issues from an epic
   * @param {string} workspaceSlug - The slug of the workspace
   * @param {string} projectId - The ID of the project
   * @param {string} epicId - The ID of the epic
   * @param {string[]} issueIds - The IDs of the issues to be removed
   * @returns {Promise<void>}
   */
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

  /**
   * Remove epics from an issue
   * @param {string} workspaceSlug - The slug of the workspace
   * @param {string} projectId - The ID of the project
   * @param {string} issueId - The ID of the issue
   * @param {string[]} epicIds - The IDs of the epics to be removed
   * @returns {Promise<void>}
   */
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

  /**
   * Add an epic to favorites
   * @param {string} workspaceSlug - The slug of the workspace
   * @param {string} projectId - The ID of the project
   * @param {object} data - The data to be sent in the request body
   * @param {string} data.epic - The ID of the epic to be added
   * @returns {Promise<any>}
   */
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

  /**
   * Remove an epic from favorites
   * @param {string} workspaceSlug - The slug of the workspace
   * @param {string} projectId - The ID of the project
   * @param {string} epicId - The ID of the epic to be removed
   * @returns {Promise<any>}
   */
  async removeEpicFromFavorites(workspaceSlug: string, projectId: string, epicId: string): Promise<any> {
    return this.delete(`/api/workspaces/${workspaceSlug}/projects/${projectId}/user-favorite-epics/${epicId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
