/**
 * DEPRECATED: This hook has been migrated from MobX to TanStack Query.
 *
 * The MobX-based store pattern has been replaced with TanStack Query hooks for better
 * performance, simpler state management, and automatic caching/refetching.
 *
 * For new code, use the TanStack Query hooks directly from:
 * @see apps/web/core/store/queries/issue.ts
 *
 * Available hooks:
 * - useIssue(workspaceSlug, projectId, issueId) - Fetch single issue
 * - useIssueByIdentifier(workspaceSlug, projectIdentifier, sequenceId) - Fetch by identifier
 * - useIssueActivities(workspaceSlug, projectId, issueId) - Fetch issue activities
 * - useSubIssues(workspaceSlug, projectId, issueId) - Fetch sub-issues
 * - useIssueLinks(workspaceSlug, projectId, issueId) - Fetch issue links
 * - useIssueSubscription(workspaceSlug, projectId, issueId) - Fetch subscription status
 *
 * Migration example:
 * ```ts
 * // Old MobX pattern:
 * const issueDetail = useIssueDetail(EIssueServiceType.ISSUES);
 * const issue = issueDetail.getIssueById(issueId);
 *
 * // New TanStack Query pattern:
 * import { useIssue } from "@/store/queries/issue";
 * const { data: issue, isLoading } = useIssue(workspaceSlug, projectId, issueId);
 * ```
 */

import { useContext } from "react";
import type { TIssueServiceType } from "@plane/types";
import { EIssueServiceType } from "@plane/types";
// mobx store
import { StoreContext } from "@/lib/store-context";
// types
import type { IIssueDetail } from "@/plane-web/store/issue/issue-details/root.store";

/**
 * @deprecated Use TanStack Query hooks from @/store/queries/issue.ts instead
 * This MobX-based hook is maintained for backward compatibility only.
 */
export const useIssueDetail = (serviceType: TIssueServiceType = EIssueServiceType.ISSUES): IIssueDetail => {
  const context = useContext(StoreContext);
  if (context === undefined) throw new Error("useIssueDetail must be used within StoreProvider");
  if (serviceType === EIssueServiceType.EPICS) return context.issue.epicDetail;
  else return context.issue.issueDetail;
};

// Re-export TanStack Query hooks for convenience
export {
  useIssue,
  useIssueByIdentifier,
  useIssueActivities,
  useSubIssues,
  useAddSubIssues,
  useIssueLinks,
  useCreateIssueLink,
  useUpdateIssueLink,
  useDeleteIssueLink,
  useIssueSubscription,
  useToggleIssueSubscription,
  useUpdateIssue,
  useDeleteIssue,
  useArchiveIssue,
} from "@/store/queries/issue";
