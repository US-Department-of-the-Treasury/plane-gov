import type { TWikiPageLite } from "./core";

// Page Relation Types
export type TPageRelationType =
  | "blocks"
  | "blocked_by"
  | "duplicate_of"
  | "duplicated_by"
  | "relates_to"
  | "parent_of"
  | "child_of";

// Page Relation
export type TPageRelation = {
  id: string;
  source_page: string;
  target_page: string;
  relation_type: TPageRelationType;
  workspace: string;
  created_at: string;
  created_by: string | null;
  source_page_detail?: TWikiPageLite;
  target_page_detail?: TWikiPageLite;
};

export type TPageRelationFormData = {
  target_page: string;
  relation_type: TPageRelationType;
};

// Grouped relations response from API
export type TPageRelationsGrouped = {
  [K in TPageRelationType]?: TPageRelation[];
};
