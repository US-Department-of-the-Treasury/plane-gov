// plane imports
import { API_BASE_URL } from "@plane/constants";
import type { TPublicSprint } from "@plane/types";
// api service
import { APIService } from "../api.service";

/**
 * Service class for managing sprints within plane sites application.
 * Extends APIService to handle HTTP requests to the sprint-related endpoints.
 * @extends {APIService}
 * @remarks This service is only available for plane sites
 */
export class SitesSprintService extends APIService {
  constructor(BASE_URL?: string) {
    super(BASE_URL || API_BASE_URL);
  }

  /**
   * Retrieves list of sprints for a specific anchor.
   * @param anchor - The anchor identifier for the published entity
   * @returns {Promise<TPublicSprint[]>} The list of sprints
   * @throws {Error} If the request fails
   */
  async list(anchor: string): Promise<TPublicSprint[]> {
    return this.get(`/api/public/anchor/${anchor}/sprints/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
