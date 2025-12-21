import React, { useCallback } from "react";
import { xor } from "lodash-es";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// types
import { WORK_ITEM_TRACKER_EVENTS } from "@plane/constants";
import type { TIssue } from "@plane/types";
// components
import { EpicDropdown } from "@/components/dropdowns/epic/dropdown";
// constants
// hooks
import { captureSuccess } from "@/helpers/event-tracker.helper";
import { useIssuesStore } from "@/hooks/use-issue-layout-store";

type Props = {
  issue: TIssue;
  onClose: () => void;
  disabled: boolean;
};

export const SpreadsheetEpicColumn = observer(function SpreadsheetEpicColumn(props: Props) {
  const { issue, disabled, onClose } = props;
  // router
  const { workspaceSlug } = useParams();
  // hooks
  const {
    issues: { changeEpicsInIssue },
  } = useIssuesStore();

  const handleEpic = useCallback(
    async (epicIds: string[] | null) => {
      if (!workspaceSlug || !issue || !issue.project_id || !issue.epic_ids || !epicIds) return;

      const updatedModuleIds = xor(issue.epic_ids, epicIds);
      const modulesToAdd: string[] = [];
      const modulesToRemove: string[] = [];
      for (const epicId of updatedModuleIds) {
        if (issue.epic_ids.includes(epicId)) modulesToRemove.push(epicId);
        else modulesToAdd.push(epicId);
      }
      changeEpicsInIssue(workspaceSlug.toString(), issue.project_id, issue.id, modulesToAdd, modulesToRemove);

      captureSuccess({
        eventName: WORK_ITEM_TRACKER_EVENTS.update,
        payload: {
          id: issue.id,
        },
      });
    },
    [workspaceSlug, issue, changeEpicsInIssue]
  );

  return (
    <div className="h-11 border-b-[0.5px] border-subtle">
      <EpicDropdown
        projectId={issue?.project_id ?? undefined}
        value={issue?.epic_ids ?? []}
        onChange={handleEpic}
        disabled={disabled}
        placeholder="Select modules"
        buttonVariant="transparent-with-text"
        buttonContainerClassName="w-full relative flex items-center p-2 group-[.selected-issue-row]:bg-accent-primary/5 group-[.selected-issue-row]:hover:bg-accent-primary/10 px-page-x"
        buttonClassName="relative leading-4 h-4.5 bg-transparent hover:bg-transparent !px-0"
        onClose={onClose}
        multiple
        showCount
        showTooltip
      />
    </div>
  );
});
