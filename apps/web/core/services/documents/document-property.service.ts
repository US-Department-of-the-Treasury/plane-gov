/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access */
// Note: These rules are disabled because the APIService base class returns untyped responses.
import { API_BASE_URL } from "@plane/constants";
import type {
  TPropertyDefinition,
  TPropertyDefinitionFormData,
  TDocumentPropertyValue,
  TDocumentPropertyValueFormData,
  TBulkDocumentPropertyValues,
} from "@plane/types";
import { APIService } from "@/services/api.service";

/**
 * Service for managing property definitions (workspace-scoped schemas).
 */
export class DocumentPropertyDefinitionService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async fetchAll(
    workspaceSlug: string,
    params?: { document_type?: string; is_system?: boolean }
  ): Promise<TPropertyDefinition[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/documents/properties/`, { params })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async fetchById(workspaceSlug: string, propertyId: string): Promise<TPropertyDefinition> {
    return this.get(`/api/workspaces/${workspaceSlug}/documents/properties/${propertyId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async create(workspaceSlug: string, data: TPropertyDefinitionFormData): Promise<TPropertyDefinition> {
    return this.post(`/api/workspaces/${workspaceSlug}/documents/properties/`, data)
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
    return this.patch(`/api/workspaces/${workspaceSlug}/documents/properties/${propertyId}/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async remove(workspaceSlug: string, propertyId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/documents/properties/${propertyId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}

/**
 * Service for managing page property values.
 */
export class DocumentPropertyValueService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async fetchAll(workspaceSlug: string, documentId: string): Promise<TDocumentPropertyValue[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/documents/${documentId}/properties/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async create(
    workspaceSlug: string,
    documentId: string,
    data: TDocumentPropertyValueFormData
  ): Promise<TDocumentPropertyValue> {
    return this.post(`/api/workspaces/${workspaceSlug}/documents/${documentId}/properties/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async update(
    workspaceSlug: string,
    documentId: string,
    propertyValueId: string,
    data: Partial<TDocumentPropertyValueFormData>
  ): Promise<TDocumentPropertyValue> {
    return this.patch(`/api/workspaces/${workspaceSlug}/documents/${documentId}/properties/${propertyValueId}/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async remove(workspaceSlug: string, documentId: string, propertyValueId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/documents/${documentId}/properties/${propertyValueId}/`)
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
    documentId: string,
    properties: Record<string, unknown>
  ): Promise<TBulkDocumentPropertyValues> {
    return this.post(`/api/workspaces/${workspaceSlug}/documents/${documentId}/properties/bulk/`, { properties })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
