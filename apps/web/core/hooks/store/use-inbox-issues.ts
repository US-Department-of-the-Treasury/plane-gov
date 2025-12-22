import { useContext } from "react";
// mobx store
import { StoreContext } from "@/lib/store-context";
import type { IInboxIssueStore } from "@/store/inbox/inbox-issue.store";

/**
 * Legacy MobX-style hook for accessing individual inbox issue functionality.
 * This hook maintains backward compatibility with existing components.
 *
 * For new code, prefer using the individual TanStack Query hooks directly:
 * - useInboxIssue(workspaceSlug, projectId, inboxIssueId)
 * - useUpdateInboxIssueStatus, useUpdateInboxIssueDuplicate
 * - useUpdateInboxIssueSnooze, useUpdateInboxIssue
 * - etc.
 *
 * @deprecated Use individual TanStack Query hooks from @/store/queries instead
 */
export const useInboxIssues = (inboxIssueId: string): IInboxIssueStore => {
  const context = useContext(StoreContext);
  if (context === undefined) throw new Error("useInboxIssues must be used within StoreProvider");
  return context.projectInbox.getIssueInboxByIssueId(inboxIssueId);
};

// Re-export all inbox issue hooks from queries for direct access
export {
  useInboxIssue,
  useUpdateInboxIssueStatus,
  useUpdateInboxIssueDuplicate,
  useUpdateInboxIssueSnooze,
  useUpdateInboxIssue,
  useUpdateProjectIssueFromInbox,
  useDeleteInboxIssue,
  getInboxIssueById,
} from "@/store/queries";
