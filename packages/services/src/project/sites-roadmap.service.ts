// plane imports
import { API_BASE_URL } from "@plane/constants";
// api service
import { APIService } from "../api.service";

/**
 * Response type for roadmap data
 */
export interface TRoadmapIssue {
  id: string;
  name: string;
  description_stripped: string | null;
  state_id: string;
  state__group: string;
  state__name: string;
  state__color: string;
  priority: string | null;
  vote_count: number;
  label_ids: string[];
  created_at: string;
  target_date: string | null;
  sequence_id: number;
}

export interface TRoadmapState {
  id: string;
  name: string;
  color: string;
  group: string;
  sequence: number;
}

export interface TRoadmapSettings {
  is_votes_enabled: boolean;
  is_comments_enabled: boolean;
  is_reactions_enabled: boolean;
}

export interface TRoadmapResponse {
  states: TRoadmapState[];
  issues: Record<string, TRoadmapIssue[]>;
  counts: Record<string, number>;
  settings: TRoadmapSettings;
}

export interface TRoadmapPublishSettings {
  anchor: string;
  is_roadmap_view: boolean;
  is_votes_enabled: boolean;
  is_comments_enabled: boolean;
  is_reactions_enabled: boolean;
  workspace_slug: string;
  project_id: string;
}

/**
 * Service class for managing roadmap operations within plane sites application.
 * Extends APIService to handle HTTP requests to the roadmap-related endpoints.
 * @extends {APIService}
 * @remarks This service is only available for plane sites
 */
export class SitesRoadmapService extends APIService {
  constructor(BASE_URL?: string) {
    super(BASE_URL || API_BASE_URL);
  }

  /**
   * Retrieves roadmap data for a specific anchor.
   * @param {string} anchor - The anchor identifier
   * @returns {Promise<TRoadmapResponse>} The roadmap data with issues grouped by state group
   * @throws {Error} If the API request fails
   */
  async getRoadmap(anchor: string): Promise<TRoadmapResponse> {
    return this.get(`/api/public/anchor/${anchor}/roadmap/`)
      .then((response) => response?.data as TRoadmapResponse)
      .catch((error: { response: unknown }) => {
        throw error?.response;
      });
  }

  /**
   * Retrieves roadmap settings for a specific anchor.
   * @param {string} anchor - The anchor identifier
   * @returns {Promise<TRoadmapPublishSettings>} The roadmap settings
   * @throws {Error} If the API request fails
   */
  async getSettings(anchor: string): Promise<TRoadmapPublishSettings> {
    return this.get(`/api/public/anchor/${anchor}/roadmap/settings/`)
      .then((response) => response?.data as TRoadmapPublishSettings)
      .catch((error: { response: unknown }) => {
        throw error?.response;
      });
  }
}
