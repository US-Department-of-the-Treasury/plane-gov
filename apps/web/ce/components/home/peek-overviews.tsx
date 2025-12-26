import { IssuePeekOverview } from "@/components/issues/peek-overview";
import { useIssueDetailUIStore } from "@/store/issue/issue-details/ui.store";

export function HomePeekOverviewsRoot() {
  // UI state from Zustand (reactive)
  const peekIssue = useIssueDetailUIStore((state) => state.peekIssue);

  return peekIssue ? <IssuePeekOverview /> : null;
}
