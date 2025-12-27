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
  page_types: string[];
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
  page_types?: string[];
  default_value?: unknown;
  options?: TPropertyOption[];
  settings?: Record<string, unknown>;
};

// Page Property Value (instance of property on a page)
export type TPagePropertyValue = {
  id: string;
  page: string;
  property_definition: string;
  value: unknown;
  workspace: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  property_definition_detail?: TPropertyDefinition;
};

export type TPagePropertyValueFormData = {
  property_definition: string;
  value: unknown;
};

// Bulk update response
export type TBulkPagePropertyValues = {
  created: TPagePropertyValue[];
  updated: TPagePropertyValue[];
};
