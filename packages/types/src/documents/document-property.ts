// Property Types (EAV pattern)
export type TPropertyType =
  | "text"
  | "number"
  | "select"
  | "multi_select"
  | "date"
  | "datetime"
  | "checkbox"
  | "url"
  | "email"
  | "phone"
  | "relation"
  | "user"
  | "multi_user";

// Property Definition (workspace-scoped schema)
export type TPropertyDefinition = {
  id: string;
  workspace: string;
  name: string;
  slug: string;
  property_type: TPropertyType;
  description: string;
  is_required: boolean;
  is_system: boolean;
  document_types: string[];
  default_value: unknown;
  options: TPropertyOption[];
  settings: Record<string, unknown>;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type TPropertyOption = {
  id: string;
  value: string;
  color?: string;
  icon?: string;
};

export type TPropertyDefinitionFormData = {
  name: string;
  slug?: string;
  property_type: TPropertyType;
  description?: string;
  is_required?: boolean;
  document_types?: string[];
  default_value?: unknown;
  options?: TPropertyOption[];
  settings?: Record<string, unknown>;
};

// Document Property Value (instance of property on a document)
export type TDocumentPropertyValue = {
  id: string;
  document: string;
  property_definition: string;
  value: unknown;
  workspace: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  property_definition_detail?: TPropertyDefinition;
};

export type TDocumentPropertyValueFormData = {
  property_definition: string;
  value: unknown;
};

// Bulk update response
export type TBulkDocumentPropertyValues = {
  created: TDocumentPropertyValue[];
  updated: TDocumentPropertyValue[];
};
