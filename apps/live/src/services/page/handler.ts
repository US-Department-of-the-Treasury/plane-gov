import { AppError } from "@/lib/errors";
import type { HocusPocusServerContext, TDocumentTypes } from "@/types";
// services
import { ProjectPageService } from "./project-page.service";
import { DocumentPageService } from "./document-page.service";

export const getPageService = (documentType: TDocumentTypes, context: HocusPocusServerContext) => {
  if (documentType === "project_page") {
    return new ProjectPageService({
      workspaceSlug: context.workspaceSlug,
      projectId: context.projectId,
      cookie: context.cookie,
    });
  }

  if (documentType === "document_page") {
    return new DocumentPageService({
      workspaceSlug: context.workspaceSlug,
      cookie: context.cookie,
    });
  }

  throw new AppError(`Invalid document type ${String(documentType)} provided.`);
};
