import React, { useState } from "react";
import { xor } from "lodash-es";
import { useTranslation } from "@plane/i18n";
// hooks
// components
import { cn } from "@plane/utils";
import { EpicDropdown } from "@/components/dropdowns/epic/dropdown";
// ui
// helpers
import { useIssue } from "@/store/queries/issue";
// types
import type { TIssueOperations } from "./root";

type TIssueEpicSelect = {
  className?: string;
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  issueOperations: TIssueOperations;
  disabled?: boolean;
};

export function IssueEpicSelect(props: TIssueEpicSelect) {
  const { className = "", workspaceSlug, projectId, issueId, issueOperations, disabled = false } = props;
  const { t } = useTranslation();
  // states
  const [isUpdating, setIsUpdating] = useState(false);
  // store hooks
  const { data: issue } = useIssue(workspaceSlug, projectId, issueId);
  // derived values
  const disableSelect = disabled || isUpdating;

  const handleIssueEpicChange = async (epicIds: string[]) => {
    if (!issue || !issue.epic_ids) return;

    setIsUpdating(true);
    const updatedEpicIds = xor(issue.epic_ids, epicIds);
    const epicsToAdd: string[] = [];
    const epicsToRemove: string[] = [];

    for (const epicId of updatedEpicIds) {
      if (issue.epic_ids.includes(epicId)) {
        epicsToRemove.push(epicId);
      } else {
        epicsToAdd.push(epicId);
      }
    }

    await issueOperations.changeEpicsInIssue?.(workspaceSlug, projectId, issueId, epicsToAdd, epicsToRemove);

    setIsUpdating(false);
  };

  return (
    <div className={cn(`flex h-full items-center gap-1`, className)}>
      <EpicDropdown
        projectId={projectId}
        value={issue?.epic_ids ?? []}
        onChange={handleIssueEpicChange}
        placeholder={t("epic.no_epic")}
        disabled={disableSelect}
        className="group h-full w-full"
        buttonContainerClassName="w-full text-left h-7.5 rounded-sm"
        buttonClassName={`text-body-xs-medium justify-between ${issue?.epic_ids?.length ? "" : "text-placeholder"}`}
        buttonVariant="transparent-with-text"
        hideIcon
        dropdownArrow
        dropdownArrowClassName="h-3.5 w-3.5 hidden group-hover:inline"
        multiple
        itemClassName="px-2"
      />
    </div>
  );
}
