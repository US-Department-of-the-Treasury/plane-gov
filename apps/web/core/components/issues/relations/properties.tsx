import type { FC } from "react";
import React from "react";
// components
import type { TIssuePriorities, TIssueServiceType } from "@plane/types";
import { EIssueServiceType } from "@plane/types";
import { MemberCombobox } from "@/components/dropdowns/member/member-combobox";
import { PriorityCombobox } from "@/components/dropdowns/priority-combobox";
import { StateCombobox } from "@/components/dropdowns/state/state-combobox";
// hooks
import { useIssue } from "@/store/queries/issue";
// types
import type { TRelationIssueOperations } from "../issue-detail-widgets/relations/helper";

type Props = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  disabled: boolean;
  issueOperations: TRelationIssueOperations;
  issueServiceType?: TIssueServiceType;
};

export function RelationIssueProperty(props: Props) {
  const {
    workspaceSlug,
    projectId,
    issueId,
    disabled,
    issueOperations,
    issueServiceType = EIssueServiceType.ISSUES,
  } = props;
  // hooks
  const { data: issue } = useIssue(workspaceSlug, projectId, issueId);

  // if issue is not found, return empty
  if (!issue) return <></>;

  // handlers
  const handleStateChange = (val: string) =>
    issue.project_id &&
    issueOperations.update(workspaceSlug, issue.project_id, issueId, {
      state_id: val,
    });

  const handlePriorityChange = (val: TIssuePriorities) =>
    issue.project_id &&
    issueOperations.update(workspaceSlug, issue.project_id, issueId, {
      priority: val,
    });

  const handleAssigneeChange = (val: string[]) =>
    issue.project_id &&
    issueOperations.update(workspaceSlug, issue.project_id, issueId, {
      assignee_ids: val,
    });

  return (
    <div className="relative flex items-center gap-2">
      <div className="h-5 flex-shrink-0">
        <StateCombobox
          value={issue.state_id}
          projectId={issue.project_id ?? undefined}
          onChange={handleStateChange}
          disabled={disabled}
          buttonVariant="border-with-text"
        />
      </div>

      <div className="h-5 flex-shrink-0">
        <PriorityCombobox
          value={issue.priority}
          onChange={handlePriorityChange}
          disabled={disabled}
          buttonVariant="border-without-text"
          buttonClassName="border"
        />
      </div>

      <div className="h-5 flex-shrink-0">
        <MemberCombobox
          value={issue.assignee_ids ?? []}
          projectId={issue.project_id ?? undefined}
          onChange={handleAssigneeChange}
          disabled={disabled}
          multiple
          buttonVariant={(issue?.assignee_ids || []).length > 0 ? "transparent-without-text" : "border-without-text"}
          buttonClassName={(issue?.assignee_ids || []).length > 0 ? "hover:bg-transparent px-0" : ""}
        />
      </div>
    </div>
  );
}
