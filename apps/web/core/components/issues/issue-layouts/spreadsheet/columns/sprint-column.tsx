import React, { useCallback } from "react";
import { useParams } from "next/navigation";
// types
import { WORK_ITEM_TRACKER_EVENTS } from "@plane/constants";
import type { TIssue } from "@plane/types";
// components
import { SprintDropdown } from "@/components/dropdowns/sprint";
// hooks
import { captureSuccess } from "@/helpers/event-tracker.helper";
import { useIssuesStore } from "@/hooks/use-issue-layout-store";

type Props = {
  issue: TIssue;
  onClose: () => void;
  disabled: boolean;
};

export function SpreadsheetSprintColumn(props: Props) {
  const { issue, disabled, onClose } = props;
  // router
  const { workspaceSlug } = useParams();
  // hooks
  const {
    issues: { addSprintToIssue, removeSprintFromIssue },
  } = useIssuesStore();

  const handleSprint = useCallback(
    async (sprintId: string | null) => {
      if (!workspaceSlug || !issue || !issue.project_id || issue.sprint_id === sprintId) return;
      if (sprintId) await addSprintToIssue(workspaceSlug.toString(), issue.project_id, sprintId, issue.id);
      else await removeSprintFromIssue(workspaceSlug.toString(), issue.project_id, issue.id);
      captureSuccess({
        eventName: WORK_ITEM_TRACKER_EVENTS.update,
        payload: {
          id: issue.id,
        },
      });
    },
    [workspaceSlug, issue, addSprintToIssue, removeSprintFromIssue]
  );

  return (
    <div className="h-11 border-b-[0.5px] border-subtle">
      <SprintDropdown
        projectId={issue.project_id ?? undefined}
        value={issue.sprint_id}
        onChange={handleSprint}
        disabled={disabled}
        placeholder="Select sprint"
        buttonVariant="transparent-with-text"
        buttonContainerClassName="w-full relative flex items-center p-2 group-[.selected-issue-row]:bg-accent-primary/5 group-[.selected-issue-row]:hover:bg-accent-primary/10 px-page-x"
        buttonClassName="relative leading-4 h-4.5 bg-transparent hover:bg-transparent px-0"
        onClose={onClose}
      />
    </div>
  );
}
