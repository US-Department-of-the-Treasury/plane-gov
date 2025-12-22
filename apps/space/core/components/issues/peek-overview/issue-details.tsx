// plane imports
import { RichTextEditor } from "@/components/editor/rich-text-editor";
// store
import { usePublishSettings } from "@/store/queries";
// types
import type { IIssue } from "@/types/issue";
// local imports
import { IssueReactions } from "./issue-reaction";

type Props = {
  anchor: string;
  issueDetails: IIssue;
};

export function PeekOverviewIssueDetails(props: Props) {
  const { anchor, issueDetails } = props;
  // store
  const { project_details, workspace: workspaceID } = usePublishSettings(anchor);
  // derived values
  const description = issueDetails.description_html;

  return (
    <div className="space-y-2">
      <h6 className="text-14 font-medium text-placeholder">
        {project_details?.identifier}-{issueDetails?.sequence_id}
      </h6>
      <h4 className="break-words text-20 font-medium">{issueDetails.name}</h4>
      {description && description !== "" && description !== "<p></p>" && (
        <RichTextEditor
          editable={false}
          anchor={anchor}
          id={issueDetails.id}
          initialValue={description}
          workspaceId={workspaceID?.toString() ?? ""}
        />
      )}
      <IssueReactions anchor={anchor} />
    </div>
  );
}
