import type { FC } from "react";
import { useMemo } from "react";
// plane imports
import { useTranslation } from "@plane/i18n";
import type { TIssue, TIssueServiceType } from "@plane/types";
import { EIssueServiceType } from "@plane/types";
import { CircularProgressIndicator, CollapsibleButton } from "@plane/ui";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useSubIssues } from "@/store/queries/issue";
import { SubWorkItemTitleActions } from "./title-actions";

type Props = {
  isOpen: boolean;
  parentIssueId: string;
  disabled: boolean;
  issueServiceType?: TIssueServiceType;
  projectId: string;
  workspaceSlug: string;
};

export function SubIssuesCollapsibleTitle(props: Props) {
  const {
    isOpen,
    parentIssueId,
    disabled,
    issueServiceType = EIssueServiceType.ISSUES,
    projectId,
    workspaceSlug,
  } = props;
  // translation
  const { t } = useTranslation();
  // store hooks (keep for filters if needed)
  const {
    subIssues: { filters },
  } = useIssueDetail(issueServiceType);
  // queries
  const { data: subIssuesData } = useSubIssues(workspaceSlug, projectId, parentIssueId);

  // derived values
  const subIssues = (subIssuesData?.sub_issues ?? []) as TIssue[];
  const subIssuesDistribution = subIssuesData?.state_distribution;

  // if there are no sub-issues, return null
  if (!subIssues || subIssues.length === 0) return null;

  // calculate percentage of completed sub-issues
  const completedCount: number = subIssuesDistribution?.completed?.length ?? 0;
  const totalCount: number = subIssues.length;
  const percentage: number = completedCount > 0 && totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <CollapsibleButton
      isOpen={isOpen}
      title={`${issueServiceType === EIssueServiceType.EPICS ? t("issue.label", { count: 1 }) : t("common.sub_work_items")}`}
      indicatorElement={
        <div className="flex items-center gap-1.5 text-tertiary text-13">
          <CircularProgressIndicator size={18} percentage={percentage} strokeWidth={3} />
          <span>
            {completedCount}/{totalCount} {t("common.done")}
          </span>
        </div>
      }
      actionItemElement={
        <SubWorkItemTitleActions
          projectId={projectId}
          parentId={parentIssueId}
          disabled={disabled}
          issueServiceType={issueServiceType}
        />
      }
    />
  );
}
