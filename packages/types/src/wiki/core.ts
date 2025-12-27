import type { TLogoProps } from "../common";
import type { EWikiPageAccess, EWikiSharePermission, EWikiAccessLogType } from "../enums";

// Wiki Collection
export type TWikiCollection = {
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
  page_count?: number;
};

export type TWikiCollectionFormData = Pick<TWikiCollection, "name" | "description" | "icon" | "parent">;

// Wiki Page
export type TWikiPage = {
  id: string;
  name: string;
  access: EWikiPageAccess;
  owned_by: string;
  collection: string | null;
  collection_detail?: TWikiCollectionLite | null;
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
  // Computed fields
  is_owner?: boolean;
  can_edit?: boolean;
  child_count?: number;
  description_stripped?: string;
};

export type TWikiPageDetail = TWikiPage & {
  description_html: string;
  shares?: TWikiPageShare[];
  updated_by_detail?: {
    id: string;
    email: string;
    display_name: string;
    avatar: string | null;
  };
};

export type TWikiPageLite = Pick<
  TWikiPage,
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

export type TWikiCollectionLite = Pick<TWikiCollection, "id" | "name" | "icon" | "parent">;

export type TWikiPageFormData = {
  name?: string;
  access?: EWikiPageAccess;
  collection?: string | null;
  project?: string | null;
  parent?: string | null;
  logo_props?: TLogoProps;
  view_props?: Record<string, unknown>;
  description?: Record<string, unknown>;
  description_binary?: string;
  description_html?: string;
};

// Wiki Page Share
export type TWikiPageShare = {
  id: string;
  page: string;
  user: string;
  permission: EWikiSharePermission;
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

export type TWikiPageShareFormData = {
  user: string;
  permission: EWikiSharePermission;
};

// Wiki Page Version
export type TWikiPageVersion = {
  id: string;
  workspace: string;
  page: string;
  last_saved_at: string;
  owned_by: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type TWikiPageVersionDetail = TWikiPageVersion & {
  description_binary: string | null;
  description_html: string;
  description_json: Record<string, unknown>;
};

// Wiki Page Access Log (for audit)
export type TWikiPageAccessLog = {
  id: string;
  page: string;
  user: string;
  access_type: EWikiAccessLogType;
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
export type TWikiPageNavigationTabs = "shared" | "private" | "archived";

export type TWikiPageFiltersSortKey = "name" | "created_at" | "updated_at";

export type TWikiPageFiltersSortBy = "asc" | "desc";

export type TWikiPageFilterProps = {
  created_at?: string[] | null;
  created_by?: string[] | null;
  collection?: string | null;
  access?: EWikiPageAccess | null;
};

export type TWikiPageFilters = {
  searchQuery: string;
  sortKey: TWikiPageFiltersSortKey;
  sortBy: TWikiPageFiltersSortBy;
  filters?: TWikiPageFilterProps;
};

// Document payload for updates
export type TWikiDocumentPayload = {
  description_binary: string;
  description_html: string;
  description: Record<string, unknown>;
};

// Version list response
export type TWikiPageVersionListResponse = {
  results: TWikiPageVersion[];
  count: number;
  next_offset: number | null;
};
