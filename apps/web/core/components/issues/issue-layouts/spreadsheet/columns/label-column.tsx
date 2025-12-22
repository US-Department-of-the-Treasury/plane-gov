import React, { useMemo } from "react";
import { useParams } from "next/navigation";
// types
import type { TIssue } from "@plane/types";
// hooks
import { useProjectLabels } from "@/store/queries/label";
// components
import { IssuePropertyLabels } from "../../properties";

type Props = {
  issue: TIssue;
  onClose: () => void;
  onChange: (issue: TIssue, data: Partial<TIssue>, updates: any) => void;
  disabled: boolean;
};

export function SpreadsheetLabelColumn(props: Props) {
  const { issue, onChange, disabled, onClose } = props;
  // router
  const { workspaceSlug: routerWorkspaceSlug } = useParams();
  const workspaceSlug = routerWorkspaceSlug?.toString();
  // hooks
  const { data: labels } = useProjectLabels(workspaceSlug ?? "", issue.project_id ?? "");

  const labelMap = useMemo(() => {
    if (!labels) return {};
    return labels.reduce(
      (acc, label) => {
        acc[label.id] = label;
        return acc;
      },
      {} as Record<string, (typeof labels)[0]>
    );
  }, [labels]);

  const defaultLabelOptions = issue?.label_ids?.map((id) => labelMap[id]) || [];

  return (
    <div className="h-11 border-b-[0.5px] border-subtle w-full">
      <IssuePropertyLabels
        projectId={issue.project_id ?? null}
        value={issue.label_ids || []}
        defaultOptions={defaultLabelOptions}
        onChange={(data) => onChange(issue, { label_ids: data }, { changed_property: "labels", change_details: data })}
        className="h-full w-full "
        buttonClassName="px-page-x w-full h-full group-[.selected-issue-row]:bg-accent-primary/5 group-[.selected-issue-row]:hover:bg-accent-primary/10 rounded-none"
        hideDropdownArrow
        maxRender={1}
        disabled={disabled}
        placeholderText="Select labels"
        onClose={onClose}
        noLabelBorder
        fullWidth
        fullHeight
      />
    </div>
  );
}
