import { useContext } from "react";
// mobx store
import { StoreContext } from "@/lib/store-context";
import type { IProjectInboxStore } from "@/plane-web/store/project-inbox.store";

/**
 * Legacy MobX-style hook for accessing inbox functionality.
 * This hook maintains backward compatibility with existing components.
 *
 * For new code, prefer using the individual TanStack Query hooks directly:
 * - useInboxIssues, useInfiniteInboxIssues, useInboxIssue
 * - useCreateInboxIssue, useUpdateInboxIssueStatus, useDeleteInboxIssue
 * - etc.
 *
 * @deprecated Use individual TanStack Query hooks from @/store/queries instead
 */
export const useProjectInbox = (): IProjectInboxStore => {
  const context = useContext(StoreContext);
  if (context === undefined) throw new Error("useProjectInbox must be used within StoreProvider");
  return context.projectInbox;
};

// Re-export all inbox hooks from queries for direct access
export {
  useInboxIssues,
  useInfiniteInboxIssues,
  useInboxIssue,
  useCreateInboxIssue,
  useUpdateInboxIssueStatus,
  useUpdateInboxIssueDuplicate,
  useUpdateInboxIssueSnooze,
  useUpdateInboxIssue,
  useUpdateProjectIssueFromInbox,
  useDeleteInboxIssue,
  getInboxIssueById,
  getInboxIssueIds,
} from "@/store/queries";
