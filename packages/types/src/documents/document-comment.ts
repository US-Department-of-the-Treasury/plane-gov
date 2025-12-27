import type { IUserLite } from "../users";

// Document Comment
export type TDocumentComment = {
  id: string;
  page: string;
  actor: string;
  comment_html: string;
  comment_json: Record<string, unknown>;
  comment_stripped: string;
  access: "INTERNAL" | "EXTERNAL";
  workspace: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  actor_detail?: IUserLite;
  reaction_count?: Record<string, number>;
};

export type TDocumentCommentFormData = {
  comment_html: string;
  comment_json?: Record<string, unknown>;
  access?: "INTERNAL" | "EXTERNAL";
};

// Comment Reaction
export type TDocumentCommentReaction = {
  id: string;
  comment: string;
  actor: string;
  reaction: string;
  workspace: string;
  created_at: string;
  actor_detail?: IUserLite;
};

export type TDocumentCommentReactionFormData = {
  reaction: string;
};
