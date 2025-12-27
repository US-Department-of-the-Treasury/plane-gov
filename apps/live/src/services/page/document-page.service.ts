import { AppError } from "@/lib/errors";
import { PageService } from "./extended.service";

interface DocumentPageServiceParams {
  workspaceSlug: string | null;
  cookie: string | null;
  [key: string]: unknown;
}

export class DocumentPageService extends PageService {
  protected basePath: string;

  constructor(params: DocumentPageServiceParams) {
    super();
    const { workspaceSlug } = params;
    if (!workspaceSlug) throw new AppError("Workspace slug is required.");
    // validate cookie
    if (!params.cookie) throw new AppError("Cookie is required.");
    // set cookie
    this.setHeader("Cookie", params.cookie);
    // set base path - document pages are workspace-scoped, not project-scoped
    this.basePath = `/api/workspaces/${workspaceSlug}/documents`;
  }
}
