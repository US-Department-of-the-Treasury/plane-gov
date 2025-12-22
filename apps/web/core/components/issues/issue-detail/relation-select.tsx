import React from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { CloseIcon } from "@plane/propel/icons";
// Plane
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { Tooltip } from "@plane/propel/tooltip";
import type { ISearchIssueResponse } from "@plane/types";
import { cn, generateWorkItemLink } from "@plane/utils";
// components
import { ExistingIssuesListModal } from "@/components/core/modals/existing-issues-list-modal";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { usePlatformOS } from "@/hooks/use-platform-os";
// queries
import { useProjects, getProjectById } from "@/store/queries/project";
import { useIssue } from "@/store/queries/issue";
// Plane web imports
import { useTimeLineRelationOptions } from "@/plane-web/components/relations";
import type { TIssueRelationTypes } from "@/plane-web/types";
import type { TRelationObject } from "../issue-detail-widgets/relations";

type TIssueRelationSelect = {
  className?: string;
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  relationKey: TIssueRelationTypes;
  disabled?: boolean;
};

export function IssueRelationSelect(props: TIssueRelationSelect) {
  const { className = "", workspaceSlug, projectId, issueId, relationKey, disabled = false } = props;
  // hooks
  const {
    createRelation,
    removeRelation,
    relation: { getRelationByIssueIdRelationType },
    isRelationModalOpen,
    toggleRelationModal,
  } = useIssueDetail();
  const { isMobile } = usePlatformOS();
  // queries
  const { data: projects = [] } = useProjects(workspaceSlug);
  const relationIssueIds = getRelationByIssueIdRelationType(issueId, relationKey);
  const ISSUE_RELATION_OPTIONS = useTimeLineRelationOptions();

  const onSubmit = async (data: ISearchIssueResponse[]) => {
    if (data.length === 0) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Error!",
        message: "Please select at least one work item.",
      });
      return;
    }

    await createRelation(
      workspaceSlug,
      projectId,
      issueId,
      relationKey,
      data.map((i) => i.id)
    );

    toggleRelationModal(null, null);
  };

  if (!relationIssueIds) return null;

  const isRelationKeyModalActive =
    isRelationModalOpen?.relationType === relationKey && isRelationModalOpen?.issueId === issueId;

  const currRelationOption: TRelationObject | undefined = ISSUE_RELATION_OPTIONS[relationKey];

  return (
    <>
      <ExistingIssuesListModal
        workspaceSlug={workspaceSlug}
        projectId={projectId}
        isOpen={isRelationKeyModalActive}
        handleClose={() => toggleRelationModal(null, null)}
        searchParams={{ issue_relation: true, issue_id: issueId }}
        handleOnSubmit={onSubmit}
        workspaceLevelToggle
      />

      <button
        type="button"
        className={cn(
          "group flex items-center gap-2 rounded-sm px-2 py-0.5 outline-none",
          {
            "cursor-not-allowed": disabled,
            "hover:bg-layer-1": !disabled,
            "bg-layer-1": isRelationKeyModalActive,
          },
          className
        )}
        onClick={() => toggleRelationModal(issueId, relationKey)}
        disabled={disabled}
      >
        <div className="flex w-full items-start justify-between">
          {relationIssueIds.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 py-0.5">
              {relationIssueIds.map((relationIssueId) => {
                return (
                  <RelationIssueItem
                    key={relationIssueId}
                    workspaceSlug={workspaceSlug}
                    projectId={projectId}
                    issueId={issueId}
                    relationIssueId={relationIssueId}
                    relationKey={relationKey}
                    projects={projects}
                    currRelationOption={currRelationOption}
                    disabled={disabled}
                    isMobile={isMobile}
                    removeRelation={removeRelation}
                  />
                );
              })}
            </div>
          ) : (
            <span className="text-body-xs-regular text-placeholder">{currRelationOption?.placeholder}</span>
          )}
          {!disabled && (
            <span
              className={cn("flex-shrink-0 p-1 opacity-0 group-hover:opacity-100", {
                "text-placeholder": relationIssueIds.length === 0,
              })}
            >
              <Pencil className="h-2.5 w-2.5 flex-shrink-0" />
            </span>
          )}
        </div>
      </button>
    </>
  );
}

// Separate component to fetch individual issue data
function RelationIssueItem({
  workspaceSlug,
  projectId,
  issueId,
  relationIssueId,
  relationKey,
  projects,
  currRelationOption,
  disabled,
  isMobile,
  removeRelation,
}: {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  relationIssueId: string;
  relationKey: TIssueRelationTypes;
  projects: any[];
  currRelationOption: TRelationObject | undefined;
  disabled: boolean;
  isMobile: boolean;
  removeRelation: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    relationKey: TIssueRelationTypes,
    relationIssueId: string
  ) => void;
}) {
  // Fetch the related issue data - we may not know its project_id
  const { data: currentIssue } = useIssue(workspaceSlug, projectId, relationIssueId);

  if (!currentIssue) return null;

  const projectDetails = getProjectById(projects, currentIssue.project_id);

  return (
    <div
      className={`group flex items-center gap-1 rounded-sm px-1.5 pb-1 pt-1 leading-3 hover:bg-surface-2 ${currRelationOption?.className}`}
    >
      <Tooltip tooltipHeading="Title" tooltipContent={currentIssue.name} isMobile={isMobile}>
        <Link
          href={generateWorkItemLink({
            workspaceSlug,
            projectId: projectDetails?.id,
            issueId: currentIssue.id,
            projectIdentifier: projectDetails?.identifier,
            sequenceId: currentIssue?.sequence_id,
          })}
          target="_blank"
          rel="noopener noreferrer"
          className="text-caption-sm-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {`${projectDetails?.identifier}-${currentIssue?.sequence_id}`}
        </Link>
      </Tooltip>
      {!disabled && (
        <Tooltip tooltipContent="Remove" position="bottom" isMobile={isMobile}>
          <span
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              removeRelation(workspaceSlug, projectId, issueId, relationKey, relationIssueId);
            }}
          >
            <CloseIcon className="h-2.5 w-2.5 text-tertiary hover:text-danger" />
          </span>
        </Tooltip>
      )}
    </div>
  );
}
