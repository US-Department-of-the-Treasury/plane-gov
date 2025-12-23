import { logger } from "@plane/logger";
import { AppError } from "@/lib/errors";
import { APIService } from "@/services/api.service";

interface WorkspaceMemberResponse {
  id: string;
  member: {
    id: string;
    email: string;
    display_name: string;
  };
  role: number;
}

/**
 * WorkspaceService - Validates workspace membership for authorization
 */
export class WorkspaceService extends APIService {
  constructor() {
    super();
  }

  /**
   * Check if the current user is a member of the workspace
   * @param workspaceSlug - The workspace slug
   * @param cookie - The user's session cookie
   * @returns The workspace member details if the user is a member
   * @throws AppError if the user is not a member or the request fails
   */
  async validateMembership(workspaceSlug: string, cookie: string): Promise<WorkspaceMemberResponse> {
    return this.get<WorkspaceMemberResponse>(`/api/workspaces/${workspaceSlug}/workspace-members/me/`, {
      headers: {
        Cookie: cookie,
      },
    })
      .then((response: { data: WorkspaceMemberResponse }) => response?.data)
      .catch((error: unknown) => {
        const appError = new AppError(error, {
          context: { operation: "validateWorkspaceMembership", workspaceSlug },
        });

        // Check for 403/404 which indicates user is not a member
        if (appError.statusCode === 403 || appError.statusCode === 404) {
          logger.warn(`User is not a member of workspace: ${workspaceSlug}`);
          throw new AppError("User is not authorized to access this workspace", {
            code: "WORKSPACE_ACCESS_DENIED",
            statusCode: 403,
          });
        }

        logger.error("Failed to validate workspace membership", appError);
        throw appError;
      });
  }
}
