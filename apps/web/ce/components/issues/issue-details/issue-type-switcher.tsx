import { useParams } from "next/navigation";
// store hooks
import { useIssue } from "@/store/queries/issue";
// plane web components
import { IssueIdentifier } from "@/plane-web/components/issues/issue-details/issue-identifier";

export type TIssueTypeSwitcherProps = {
  issueId: string;
  disabled: boolean;
};

export function IssueTypeSwitcher(props: TIssueTypeSwitcherProps) {
  const { issueId } = props;
  // router
  const { workspaceSlug, projectId } = useParams();

  // TanStack Query - fetch issue
  const { data: issue } = useIssue(workspaceSlug?.toString() ?? "", projectId?.toString() ?? "", issueId ?? "");

  if (!issue || !issue.project_id) return <></>;

  return <IssueIdentifier issueId={issueId} projectId={issue.project_id} size="md" enableClickToCopyIdentifier />;
}
