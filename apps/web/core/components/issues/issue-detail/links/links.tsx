// hooks
import { useIssueLinks } from "@/store/queries/issue";
import { IssueLinkDetail } from "./link-detail";
import type { TLinkOperations } from "./root";

export type TLinkOperationsModal = Exclude<TLinkOperations, "create">;

export type TIssueLinkList = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  linkOperations: TLinkOperationsModal;
  disabled?: boolean;
};

export function IssueLinkList(props: TIssueLinkList) {
  // props
  const { workspaceSlug, projectId, issueId, linkOperations, disabled = false } = props;
  // hooks
  const { data: issueLinks } = useIssueLinks(workspaceSlug, projectId, issueId);

  if (!issueLinks || issueLinks.length === 0) return <></>;

  return (
    <div className="space-y-2">
      {issueLinks.map((link) => (
        <IssueLinkDetail key={link.id} link={link} linkOperations={linkOperations} isNotAllowed={disabled} />
      ))}
    </div>
  );
}
