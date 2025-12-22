import { IssuePeekOverview } from "@/components/issues/peek-overview";
import { useIssueDetail } from "@/hooks/store/use-issue-detail";

export function HomePeekOverviewsRoot() {
  const { peekIssue } = useIssueDetail();

  return peekIssue ? <IssuePeekOverview /> : null;
}
