import type { TDocumentLite } from "./document";

// Document Relation Types
export type TDocumentRelationType =
  | "blocks"
  | "blocked_by"
  | "duplicate_of"
  | "duplicated_by"
  | "relates_to"
  | "parent_of"
  | "child_of";

// Document Relation
export type TDocumentRelation = {
  id: string;
  source_page: string;
  target_page: string;
  relation_type: TDocumentRelationType;
  workspace: string;
  created_at: string;
  created_by: string | null;
  source_page_detail?: TDocumentLite;
  target_page_detail?: TDocumentLite;
};

export type TDocumentRelationFormData = {
  target_page: string;
  relation_type: TDocumentRelationType;
};

// Grouped relations response from API
export type TDocumentRelationsGrouped = {
  [K in TDocumentRelationType]?: TDocumentRelation[];
};
