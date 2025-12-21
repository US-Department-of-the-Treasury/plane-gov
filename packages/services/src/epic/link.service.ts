// types
import type { ILinkDetails, EpicLink } from "@plane/types";
// services
import { APIService } from "../api.service";

/**
 * Service class for handling epic link related operations.
 * Extends the base APIService class to interact with epic link endpoints.
 */
export class EpicLinkService extends APIService {
  /**
   * Creates an instance of EpicLinkService.
   * @param {string} baseURL - The base URL for the API endpoints
   */
  constructor(baseURL: string) {
    super(baseURL);
  }

  /**
   * Creates a new epic link.
   * @param {string} workspaceSlug - The unique identifier for the workspace
   * @param {string} projectId - The unique identifier for the project
   * @param {string} epicId - The unique identifier for the epic
   * @param {Partial<EpicLink>} data - The epic link data to be created
   * @returns {Promise<ILinkDetails>} The created epic link details
   * @throws {Error} When the API request fails
   */
  async create(
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

  /**
   * Updates an existing epic link.
   * @param {string} workspaceSlug - The unique identifier for the workspace
   * @param {string} projectId - The unique identifier for the project
   * @param {string} epicId - The unique identifier for the epic
   * @param {string} linkId - The unique identifier for the link to update
   * @param {Partial<EpicLink>} data - The epic link data to be updated
   * @returns {Promise<ILinkDetails>} The updated epic link details
   * @throws {Error} When the API request fails
   */
  async update(
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

  /**
   * Deletes an epic link.
   * @param {string} workspaceSlug - The unique identifier for the workspace
   * @param {string} projectId - The unique identifier for the project
   * @param {string} epicId - The unique identifier for the epic
   * @param {string} linkId - The unique identifier for the link to delete
   * @returns {Promise<any>} Response data from the server
   * @throws {Error} When the API request fails
   */
  async destroy(workspaceSlug: string, projectId: string, epicId: string, linkId: string): Promise<any> {
    return this.delete(
      `/api/workspaces/${workspaceSlug}/projects/${projectId}/epics/${epicId}/epic-links/${linkId}/`
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
