import React from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { useTranslation } from "@plane/i18n";
import { CloseIcon } from "@plane/propel/icons";
// plane imports
import { Tooltip } from "@plane/propel/tooltip";
import { cn } from "@plane/utils";
// hooks
import { usePlatformOS } from "@/hooks/use-platform-os";
// store
import { useIssueDetailUIStore } from "@/store/issue/issue-details/ui.store";
// queries
import { useIssue } from "@/store/queries/issue";
import { useProjects, getProjectById } from "@/store/queries/project";
// plane web components
import { IssueIdentifier } from "@/plane-web/components/issues/issue-details/issue-identifier";
// local imports
import { ParentIssuesListModal } from "../parent-issues-list-modal";

type TIssueParentSelect = {
  className?: string;
  disabled?: boolean;
  issueId: string;
  projectId: string;
  workspaceSlug: string;
  handleParentIssue: (_issueId?: string | null) => Promise<void>;
  handleRemoveSubIssue: (
    workspaceSlug: string,
    projectId: string,
    parentIssueId: string,
    issueId: string
  ) => Promise<void>;
  workItemLink: string;
};

export function IssueParentSelect(props: TIssueParentSelect) {
  const {
    className = "",
    disabled = false,
    issueId,
    projectId,
    workspaceSlug,
    handleParentIssue,
    handleRemoveSubIssue,
    workItemLink,
  } = props;
  const { t } = useTranslation();
  // store hooks
  const { data: issue } = useIssue(workspaceSlug, projectId, issueId);
  // Fetch parent issue if exists (parent might be in different project, but we'll use projectId for now)
  const { data: parentIssue } = useIssue(workspaceSlug, issue?.parent_id ? projectId : "", issue?.parent_id ?? "");
  const isParentIssueModalOpen = useIssueDetailUIStore((s) => s.isParentIssueModalOpen);
  const toggleParentIssueModal = useIssueDetailUIStore((s) => s.toggleParentIssueModal);
  const { isMobile } = usePlatformOS();
  // queries
  const { data: projects = [] } = useProjects(workspaceSlug);

  // derived values
  const parentIssueProjectDetails =
    parentIssue && parentIssue.project_id ? getProjectById(projects, parentIssue.project_id) : undefined;

  if (!issue) return <></>;

  return (
    <>
      <ParentIssuesListModal
        projectId={projectId}
        issueId={issueId}
        isOpen={isParentIssueModalOpen === issueId}
        handleClose={() => toggleParentIssueModal(null)}
        onChange={(issue: any) => handleParentIssue(issue?.id)}
      />
      <button
        type="button"
        className={cn(
          "group flex items-center justify-between gap-2 px-2 py-0.5 rounded-sm outline-none",
          {
            "cursor-not-allowed": disabled,
            "hover:bg-layer-transparent-hover": !disabled,
            "bg-layer-transparent-selected": isParentIssueModalOpen,
          },
          className
        )}
        onClick={() => toggleParentIssueModal(issue.id)}
        disabled={disabled}
      >
        {issue.parent_id && parentIssue ? (
          <div className="flex items-center gap-1.5">
            <Tooltip tooltipHeading="Title" tooltipContent={parentIssue.name} isMobile={isMobile}>
              <Link href={workItemLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                {parentIssue?.project_id && parentIssueProjectDetails && (
                  <IssueIdentifier
                    projectId={parentIssue.project_id}
                    issueTypeId={parentIssue.type_id}
                    projectIdentifier={parentIssueProjectDetails?.identifier}
                    issueSequenceId={parentIssue.sequence_id}
                    size="xs"
                    variant="secondary"
                  />
                )}
              </Link>
            </Tooltip>

            {!disabled && (
              <Tooltip tooltipContent={t("common.remove")} position="bottom" isMobile={isMobile}>
                <span
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemoveSubIssue(workspaceSlug, projectId, parentIssue.id, issueId);
                  }}
                >
                  <CloseIcon className="h-2.5 w-2.5 text-tertiary hover:text-danger" />
                </span>
              </Tooltip>
            )}
          </div>
        ) : (
          <span className="text-body-xs-medium text-placeholder">{t("issue.add.parent")}</span>
        )}
        {!disabled && (
          <span
            className={cn("p-1 flex-shrink-0 opacity-0 group-hover:opacity-100", {
              "text-placeholder": !issue.parent_id && !parentIssue,
            })}
          >
            <Pencil className="h-2.5 w-2.5 flex-shrink-0" />
          </span>
        )}
      </button>
    </>
  );
}
