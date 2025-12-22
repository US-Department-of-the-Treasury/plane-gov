import type { TIssue } from "@plane/types";
// components
// hooks
import { useSubIssues } from "@/store/queries/issue";
// types
import { IssueParentSiblingItem } from "./sibling-item";

export type TIssueParentSiblings = {
  workspaceSlug: string;
  currentIssue: TIssue;
  parentIssue: TIssue;
};

export function IssueParentSiblings(props: TIssueParentSiblings) {
  const { workspaceSlug, currentIssue, parentIssue } = props;
  // hooks
  const { data: subIssuesData, isLoading } = useSubIssues(workspaceSlug, parentIssue.project_id ?? "", parentIssue.id);

  const subIssues = Array.isArray(subIssuesData?.sub_issues) ? subIssuesData.sub_issues : [];

  return (
    <div className="my-1">
      {isLoading ? (
        <div className="flex items-center gap-2 whitespace-nowrap px-1 py-1 text-left text-11 text-secondary">
          Loading
        </div>
      ) : subIssues && subIssues.length > 0 ? (
        subIssues.map(
          (subIssue) =>
            currentIssue.id !== subIssue.id && (
              <IssueParentSiblingItem
                key={subIssue.id}
                workspaceSlug={workspaceSlug}
                projectId={parentIssue.project_id ?? ""}
                issueId={subIssue.id}
              />
            )
        )
      ) : (
        <div className="flex items-center gap-2 whitespace-nowrap px-1 py-1 text-left text-11 text-secondary">
          No sibling work items
        </div>
      )}
    </div>
  );
}
