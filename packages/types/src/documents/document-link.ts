// Document Link (external URL)
export type TDocumentLink = {
  id: string;
  page: string;
  title: string;
  url: string;
  metadata: Record<string, unknown>;
  workspace: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type TDocumentLinkFormData = {
  title: string;
  url: string;
};
