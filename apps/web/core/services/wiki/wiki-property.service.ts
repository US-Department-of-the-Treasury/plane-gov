/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access */
// Note: These rules are disabled because the APIService base class returns untyped responses.
import { API_BASE_URL } from "@plane/constants";
import type {
  TPropertyDefinition,
  TPropertyDefinitionFormData,
  TPagePropertyValue,
  TPagePropertyValueFormData,
  TBulkPagePropertyValues,
} from "@plane/types";
import { APIService } from "@/services/api.service";

/**
 * Service for managing property definitions (workspace-scoped schemas).
 */
export class WikiPropertyDefinitionService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async fetchAll(
    workspaceSlug: string,
    params?: { page_type?: string; is_system?: boolean }
  ): Promise<TPropertyDefinition[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/wiki/properties/`, { params })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async fetchById(workspaceSlug: string, propertyId: string): Promise<TPropertyDefinition> {
    return this.get(`/api/workspaces/${workspaceSlug}/wiki/properties/${propertyId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async create(workspaceSlug: string, data: TPropertyDefinitionFormData): Promise<TPropertyDefinition> {
    return this.post(`/api/workspaces/${workspaceSlug}/wiki/properties/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async update(
    workspaceSlug: string,
    propertyId: string,
    data: Partial<TPropertyDefinitionFormData>
  ): Promise<TPropertyDefinition> {
    return this.patch(`/api/workspaces/${workspaceSlug}/wiki/properties/${propertyId}/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async remove(workspaceSlug: string, propertyId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/wiki/properties/${propertyId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}

/**
 * Service for managing page property values.
 */
export class WikiPropertyValueService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async fetchAll(workspaceSlug: string, pageId: string): Promise<TPagePropertyValue[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/properties/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async create(workspaceSlug: string, pageId: string, data: TPagePropertyValueFormData): Promise<TPagePropertyValue> {
    return this.post(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/properties/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async update(
    workspaceSlug: string,
    pageId: string,
    propertyValueId: string,
    data: Partial<TPagePropertyValueFormData>
  ): Promise<TPagePropertyValue> {
    return this.patch(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/properties/${propertyValueId}/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async remove(workspaceSlug: string, pageId: string, propertyValueId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/properties/${propertyValueId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  /**
   * Bulk update multiple properties at once.
   * Accepts a map of property slug/ID to value.
   */
  async bulkUpdate(
    workspaceSlug: string,
    pageId: string,
    properties: Record<string, unknown>
  ): Promise<TBulkPagePropertyValues> {
    return this.post(`/api/workspaces/${workspaceSlug}/wiki/pages/${pageId}/properties/bulk/`, { properties })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
