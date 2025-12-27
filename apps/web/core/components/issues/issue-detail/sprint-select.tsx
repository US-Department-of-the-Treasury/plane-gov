import React from "react";
import { useTranslation } from "@plane/i18n";
// components
import { cn } from "@plane/utils";
import { SprintDropdown } from "@/components/dropdowns/sprint";
// queries
import { useIssue, useAddIssueToSprint, useRemoveIssueFromSprint } from "@/store/queries/issue";
// types
import type { TIssueOperations } from "./root";

type TIssueSprintSelect = {
  className?: string;
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  issueOperations: TIssueOperations;
  disabled?: boolean;
};

export function IssueSprintSelect(props: TIssueSprintSelect) {
  const { className = "", workspaceSlug, projectId, issueId, issueOperations, disabled = false } = props;
  const { t } = useTranslation();

  // TanStack Query - fetch current issue
  const { data: issue } = useIssue(workspaceSlug, projectId, issueId);

  // TanStack Query mutations
  const { mutate: addToSprint, isPending: isAdding } = useAddIssueToSprint();
  const { mutate: removeFromSprint, isPending: isRemoving } = useRemoveIssueFromSprint();
  const isUpdating = isAdding || isRemoving;
  const disableSelect = disabled || isUpdating;

  const handleIssueSprintChange = async (sprintId: string | null) => {
    if (!issue || issue.sprint_id === sprintId) return;

    if (sprintId) {
      addToSprint({ workspaceSlug, projectId, sprintId, issueIds: [issueId] });
    } else if (issue.sprint_id) {
      // Need bridgeId for removal - use issueOperations fallback for now
      await issueOperations.removeIssueFromSprint?.(workspaceSlug, projectId, issue.sprint_id, issueId);
    }
  };

  return (
    <div className={cn("flex h-full items-center gap-1", className)}>
      <SprintDropdown
        value={issue?.sprint_id ?? null}
        onChange={handleIssueSprintChange}
        projectId={projectId}
        disabled={disableSelect}
        buttonVariant="transparent-with-text"
        className="group w-full"
        buttonContainerClassName="w-full text-left h-7.5 rounded-sm"
        buttonClassName={`text-body-xs-medium justify-between ${issue?.sprint_id ? "" : "text-placeholder"}`}
        placeholder={t("sprint.no_sprint")}
        hideIcon
        dropdownArrow
        dropdownArrowClassName="h-3.5 w-3.5 hidden group-hover:inline"
      />
    </div>
  );
}
