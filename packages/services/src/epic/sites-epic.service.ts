// plane imports
import { API_BASE_URL } from "@plane/constants";
// api service
import type { TPublicEpic } from "@plane/types";
import { APIService } from "../api.service";

/**
 * Service class for managing epics within plane sites application.
 * Extends APIService to handle HTTP requests to the epic-related endpoints.
 * @extends {APIService}
 * @remarks This service is only available for plane sites
 */
export class SitesEpicService extends APIService {
  constructor(BASE_URL?: string) {
    super(BASE_URL || API_BASE_URL);
  }

  /**
   * Retrieves a list of epics for a specific anchor.
   * @param {string} anchor - The anchor identifier
   * @returns {Promise<TPublicEpic[]>} The list of epics
   * @throws {Error} If the API request fails
   */
  async list(anchor: string): Promise<TPublicEpic[]> {
    return this.get(`/api/public/anchor/${anchor}/epics/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
