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
  const { data: subIssues, isLoading } = useSubIssues(
    workspaceSlug,
    parentIssue.project_id ?? "",
    parentIssue.id
  );

  return (
    <div className="my-1">
      {isLoading ? (
        <div className="flex items-center gap-2 whitespace-nowrap px-1 py-1 text-left text-11 text-secondary">
          Loading
        </div>
      ) : subIssues && subIssues.length > 0 ? (
        subIssues.map(
          (subIssue) =>
            currentIssue.id !== subIssue && (
              <IssueParentSiblingItem
                key={subIssue}
                workspaceSlug={workspaceSlug}
                projectId={parentIssue.project_id ?? ""}
                issueId={subIssue}
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
