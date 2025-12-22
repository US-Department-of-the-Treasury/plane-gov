import { observer } from "mobx-react";
// ui
import { CustomMenu } from "@plane/ui";
// helpers
import { generateWorkItemLink } from "@plane/utils";
// hooks
import { useIssue } from "@/store/queries/issue";
// queries
import { useProjects, getProjectById } from "@/store/queries/project";
// plane web components
import { IssueIdentifier } from "@/plane-web/components/issues/issue-details/issue-identifier";

type TIssueParentSiblingItem = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
};

export const IssueParentSiblingItem = observer(function IssueParentSiblingItem(props: TIssueParentSiblingItem) {
  const { workspaceSlug, projectId, issueId } = props;
  // hooks
  const { data: issueDetail } = useIssue(workspaceSlug, projectId, issueId);
  // queries
  const { data: projects = [] } = useProjects(workspaceSlug);

  // derived values
  if (!issueDetail) return <></>;

  const projectDetails = (issueDetail.project_id && getProjectById(projects, issueDetail.project_id)) || undefined;

  const workItemLink = generateWorkItemLink({
    workspaceSlug,
    projectId: issueDetail?.project_id,
    issueId: issueDetail?.id,
    projectIdentifier: projectDetails?.identifier,
    sequenceId: issueDetail?.sequence_id,
  });

  return (
    <>
      <CustomMenu.MenuItem
        key={issueDetail.id}
        onClick={() => window.open(workItemLink, "_blank", "noopener,noreferrer")}
      >
        <div className="flex items-center gap-2 py-0.5">
          {issueDetail.project_id && projectDetails?.identifier && (
            <IssueIdentifier
              projectId={issueDetail.project_id}
              issueTypeId={issueDetail.type_id}
              projectIdentifier={projectDetails?.identifier}
              issueSequenceId={issueDetail.sequence_id}
              size="xs"
            />
          )}
        </div>
      </CustomMenu.MenuItem>
    </>
  );
});
