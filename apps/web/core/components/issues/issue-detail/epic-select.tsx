import React, { useState } from "react";
import { xor } from "lodash-es";
import { observer } from "mobx-react";
import { useTranslation } from "@plane/i18n";
// hooks
// components
import { cn } from "@plane/utils";
import { EpicDropdown } from "@/components/dropdowns/epic/dropdown";
// ui
// helpers
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
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

export const IssueEpicSelect = observer(function IssueEpicSelect(props: TIssueEpicSelect) {
  const { className = "", workspaceSlug, projectId, issueId, issueOperations, disabled = false } = props;
  const { t } = useTranslation();
  // states
  const [isUpdating, setIsUpdating] = useState(false);
  // store hooks
  const {
    issue: { getIssueById },
  } = useIssueDetail();
  // derived values
  const issue = getIssueById(issueId);
  const disableSelect = disabled || isUpdating;

  const handleIssueModuleChange = async (epicIds: string[]) => {
    if (!issue || !issue.epic_ids) return;

    setIsUpdating(true);
    const updatedModuleIds = xor(issue.epic_ids, epicIds);
    const modulesToAdd: string[] = [];
    const modulesToRemove: string[] = [];

    for (const epicId of updatedModuleIds) {
      if (issue.epic_ids.includes(epicId)) {
        modulesToRemove.push(epicId);
      } else {
        modulesToAdd.push(epicId);
      }
    }

    await issueOperations.changeEpicsInIssue?.(workspaceSlug, projectId, issueId, modulesToAdd, modulesToRemove);

    setIsUpdating(false);
  };

  return (
    <div className={cn(`flex h-full items-center gap-1`, className)}>
      <EpicDropdown
        projectId={projectId}
        value={issue?.epic_ids ?? []}
        onChange={handleIssueModuleChange}
        placeholder={t("module.no_module")}
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
});
