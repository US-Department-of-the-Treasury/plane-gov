/**
 * CE Issue Detail Store - Re-exports core store
 *
 * The CE version previously extended IssueDetail (core) with no additional functionality.
 * Now simply re-exports the core implementation.
 *
 * Note: The IssueDetail store still uses MobX for managing issue detail state (reactions,
 * links, sub-issues, subscriptions, relations, activities, and comments). Migration to
 * TanStack Query is planned for a future phase.
 *
 * Available TanStack Query hooks (already migrated):
 * - useIssue() - Fetch issue details
 * - useIssueActivities() - Fetch issue activities
 * - useIssueLinks() - Fetch issue links
 * - useSubIssues() - Fetch sub-issues
 * - useIssueSubscription() - Fetch subscription status
 *
 * Remaining MobX stores to migrate:
 * - IssueActivityStore (activities + comments integration)
 * - IssueCommentStore (comments CRUD)
 * - IssueReactionStore (reactions)
 * - And other sub-stores
 */

export {
  IssueDetail,
  type IIssueDetail,
} from "@/store/issue/issue-details/root.store";
