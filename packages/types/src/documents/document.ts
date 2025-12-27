import type { TLogoProps } from "../common";
import type { EDocumentAccess, EDocumentSharePermission, EDocumentAccessLogType } from "../enums";

// Document Type (unified document model)
export type TDocumentType = "page" | "issue" | "epic" | "task";

// Document Collection
export type TDocumentCollection = {
  id: string;
  name: string;
  description: string;
  icon: string;
  parent: string | null;
  sort_order: number;
  workspace: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  child_count?: number;
  document_count?: number;
};

export type TDocumentCollectionFormData = Pick<TDocumentCollection, "name" | "description" | "icon" | "parent">;

// Document
export type TDocument = {
  id: string;
  name: string;
  access: EDocumentAccess;
  owned_by: string;
  collection: string | null;
  collection_detail?: TDocumentCollectionLite | null;
  project: string | null;
  parent: string | null;
  is_locked: boolean;
  locked_by: string | null;
  sort_order: number;
  logo_props: TLogoProps;
  view_props: Record<string, unknown>;
  archived_at: string | null;
  workspace: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  // Unified document model fields
  document_type?: TDocumentType;
  sequence_id?: number;
  state_id?: string | null;
  completed_at?: string | null;
  // Computed fields
  is_owner?: boolean;
  can_edit?: boolean;
  child_count?: number;
  description_stripped?: string;
};

export type TDocumentDetail = TDocument & {
  description_html: string;
  shares?: TDocumentShare[];
  updated_by_detail?: {
    id: string;
    email: string;
    display_name: string;
    avatar: string | null;
  };
};

export type TDocumentLite = Pick<
  TDocument,
  | "id"
  | "name"
  | "access"
  | "parent"
  | "collection"
  | "project"
  | "sort_order"
  | "logo_props"
  | "is_locked"
  | "archived_at"
>;

export type TDocumentCollectionLite = Pick<TDocumentCollection, "id" | "name" | "icon" | "parent">;

export type TDocumentFormData = {
  name?: string;
  access?: EDocumentAccess;
  collection?: string | null;
  project?: string | null;
  parent?: string | null;
  logo_props?: TLogoProps;
  view_props?: Record<string, unknown>;
  description?: Record<string, unknown>;
  description_binary?: string;
  description_html?: string;
  // Unified document model fields
  document_type?: TDocumentType;
  state_id?: string | null;
};

// Document Share
export type TDocumentShare = {
  id: string;
  document: string;
  user: string;
  permission: EDocumentSharePermission;
  workspace: string;
  created_at: string;
  created_by: string | null;
  user_detail?: {
    id: string;
    email: string;
    display_name: string;
    avatar: string | null;
  };
};

export type TDocumentShareFormData = {
  user: string;
  permission: EDocumentSharePermission;
};

// Document Version
export type TDocumentVersion = {
  id: string;
  workspace: string;
  document: string;
  last_saved_at: string;
  owned_by: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type TDocumentVersionDetail = TDocumentVersion & {
  description_binary: string | null;
  description_html: string;
  description_json: Record<string, unknown>;
};

// Document Access Log (for audit)
export type TDocumentAccessLog = {
  id: string;
  document: string;
  user: string;
  access_type: EDocumentAccessLogType;
  ip_address: string | null;
  user_agent: string;
  metadata: Record<string, unknown>;
  workspace: string;
  created_at: string;
  user_detail?: {
    id: string;
    email: string;
    display_name: string;
  };
};

// Filter types
export type TDocumentNavigationTabs = "shared" | "private" | "archived";

export type TDocumentFiltersSortKey = "name" | "created_at" | "updated_at";

export type TDocumentFiltersSortBy = "asc" | "desc";

export type TDocumentFilterProps = {
  created_at?: string[] | null;
  created_by?: string[] | null;
  collection?: string | null;
  access?: EDocumentAccess | null;
};

export type TDocumentFilters = {
  searchQuery: string;
  sortKey: TDocumentFiltersSortKey;
  sortBy: TDocumentFiltersSortBy;
  filters?: TDocumentFilterProps;
};

// Document payload for updates
export type TDocumentUpdatePayload = {
  description_binary: string;
  description_html: string;
  description: Record<string, unknown>;
};

// Version list response
export type TDocumentVersionListResponse = {
  results: TDocumentVersion[];
  count: number;
  next_offset: number | null;
};
