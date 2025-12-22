import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// plane imports
import type { TIssueIdentifierProps, TIssueTypeIdentifier } from "@plane/types";
// hooks
import { useProjects, getProjectById } from "@/store/queries/project";
import { useIssue } from "@/store/queries/issue";
import { IdentifierText } from "@/components/issues/issue-detail/identifier-text";

export const IssueIdentifier = observer(function IssueIdentifier(props: TIssueIdentifierProps) {
  const { projectId, variant, size, displayProperties, enableClickToCopyIdentifier = false } = props;
  // store hooks
  const { workspaceSlug } = useParams();
  const { data: projects } = useProjects(workspaceSlug?.toString() ?? "");

  // Determine if the component is using store data or not
  const isUsingStoreData = "issueId" in props;

  // TanStack Query - fetch issue if using store data
  const { data: issue } = useIssue(
    workspaceSlug?.toString() ?? "",
    projectId ?? "",
    isUsingStoreData ? props.issueId : ""
  );

  // derived values
  const project = getProjectById(projects, projectId);
  const projectIdentifier = isUsingStoreData ? project?.identifier : props.projectIdentifier;
  const issueSequenceId = isUsingStoreData ? issue?.sequence_id : props.issueSequenceId;
  const shouldRenderIssueID = displayProperties ? displayProperties.key : true;

  if (!shouldRenderIssueID) return null;

  return (
    <div className="shrink-0 flex items-center space-x-2">
      <IdentifierText
        identifier={`${projectIdentifier}-${issueSequenceId}`}
        enableClickToCopyIdentifier={enableClickToCopyIdentifier}
        variant={variant}
        size={size}
      />
    </div>
  );
});

export const IssueTypeIdentifier = observer(function IssueTypeIdentifier(_props: TIssueTypeIdentifier) {
  return <></>;
});
