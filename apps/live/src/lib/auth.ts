// plane imports
import type { IncomingHttpHeaders } from "http";
import type { TUserDetails } from "@plane/editor";
import { logger } from "@plane/logger";
import { AppError } from "@/lib/errors";
// services
import { UserService } from "@/services/user.service";
import { WorkspaceService } from "@/services/workspace.service";
// types
import type { HocusPocusServerContext, TDocumentTypes } from "@/types";

/**
 * Authenticate the user
 * @param requestHeaders - The request headers
 * @param context - The context
 * @param token - The token
 * @returns The authenticated user
 */
export const onAuthenticate = async ({
  requestHeaders,
  requestParameters,
  context,
  token,
}: {
  requestHeaders: IncomingHttpHeaders;
  context: HocusPocusServerContext;
  requestParameters: URLSearchParams;
  token: string;
}) => {
  let cookie: string | undefined = undefined;
  let userId: string | undefined = undefined;

  // Extract cookie (fallback to request headers) and userId from token (for scenarios where
  // the cookies are not passed in the request headers)
  try {
    const parsedToken = JSON.parse(token) as TUserDetails;
    userId = parsedToken.id;
    cookie = parsedToken.cookie;
  } catch (error) {
    const appError = new AppError(error, {
      context: { operation: "onAuthenticate" },
    });
    logger.error("Token parsing failed, using request headers", appError);
  } finally {
    // If cookie is still not found, fallback to request headers
    if (!cookie) {
      cookie = requestHeaders.cookie?.toString();
    }
  }

  if (!cookie || !userId) {
    const appError = new AppError("Credentials not provided", { code: "AUTH_MISSING_CREDENTIALS" });
    logger.error("Credentials not provided", appError);
    throw appError;
  }

  // set cookie in context, so it can be used throughout the ws connection
  context.cookie = cookie ?? requestParameters.get("cookie") ?? "";
  context.documentType = requestParameters.get("documentType")?.toString() as TDocumentTypes;
  context.projectId = requestParameters.get("projectId");
  context.userId = userId;
  context.workspaceSlug = requestParameters.get("workspaceSlug");

  // Authenticate the user
  const authResult = await handleAuthentication({
    cookie: context.cookie,
    userId: context.userId,
  });

  // For wiki pages, validate workspace membership
  if (context.documentType === "wiki_page" && context.workspaceSlug) {
    await validateWorkspaceAccess({
      workspaceSlug: context.workspaceSlug,
      cookie: context.cookie,
    });
  }

  return authResult;
};

export const handleAuthentication = async ({ cookie, userId }: { cookie: string; userId: string }) => {
  // fetch current user info
  try {
    const userService = new UserService();
    const user = await userService.currentUser(cookie);
    if (user.id !== userId) {
      throw new AppError("Authentication unsuccessful: User ID mismatch", { code: "AUTH_USER_MISMATCH" });
    }

    return {
      user: {
        id: user.id,
        name: user.display_name,
      },
    };
  } catch (error) {
    const appError = new AppError(error, {
      context: { operation: "handleAuthentication" },
    });
    logger.error("Authentication failed", appError);
    throw new AppError("Authentication unsuccessful", { code: appError.code });
  }
};

/**
 * Validate that the user has access to the workspace
 * @param workspaceSlug - The workspace slug
 * @param cookie - The user's session cookie
 * @throws AppError if the user is not a member of the workspace
 */
export const validateWorkspaceAccess = async ({
  workspaceSlug,
  cookie,
}: {
  workspaceSlug: string;
  cookie: string;
}): Promise<void> => {
  try {
    const workspaceService = new WorkspaceService();
    await workspaceService.validateMembership(workspaceSlug, cookie);
    logger.info(`Workspace access validated for workspace: ${workspaceSlug}`);
  } catch (error) {
    const appError = new AppError(error, {
      context: { operation: "validateWorkspaceAccess", workspaceSlug },
    });
    logger.error("Workspace access denied", appError);
    throw new AppError("Access denied: You are not a member of this workspace", {
      code: "WORKSPACE_ACCESS_DENIED",
    });
  }
};
