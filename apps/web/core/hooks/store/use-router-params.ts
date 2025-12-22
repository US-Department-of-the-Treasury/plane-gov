"use client";

import { useParams, useSearchParams } from "next/navigation";
import type { TProfileViews } from "@plane/types";

// Re-export useParams for components that need direct access
export { useParams };

/**
 * Router parameters hook using Next.js navigation hooks.
 * Replaces MobX RouterStore with Next.js useParams() and useSearchParams().
 *
 * Migration Note:
 * - This hook now uses Next.js navigation hooks directly
 * - All route parameters come from useParams()
 * - All query parameters come from useSearchParams()
 * - Returns the same interface as the old MobX RouterStore for compatibility
 *
 * @example
 * const { workspaceSlug, projectId, viewId } = useRouterParams();
 */
export function useRouterParams() {
  const params = useParams();
  const searchParams = useSearchParams();

  return {
    // Route parameters from URL path segments
    workspaceSlug: params?.workspaceSlug?.toString(),
    teamspaceId: params?.teamspaceId?.toString(),
    projectId: params?.projectId?.toString(),
    sprintId: params?.sprintId?.toString(),
    epicId: params?.epicId?.toString(),
    viewId: params?.viewId?.toString(),
    globalViewId: params?.globalViewId?.toString(),
    profileViewId: params?.profileViewId?.toString() as TProfileViews | undefined,
    userId: params?.userId?.toString(),
    issueId: params?.issueId?.toString(),
    inboxId: params?.inboxId?.toString(),
    webhookId: params?.webhookId?.toString(),

    // Query parameters from URL search string
    peekId: searchParams?.get("peekId") ?? undefined,
  };
}
