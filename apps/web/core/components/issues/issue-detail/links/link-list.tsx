// plane imports
import type { TIssueServiceType } from "@plane/types";
// hooks
import { useIssueLinks } from "@/store/queries/issue";
// local imports
import { IssueLinkItem } from "./link-item";
import type { TLinkOperations } from "./root";

type TLinkOperationsModal = Exclude<TLinkOperations, "create">;

type TLinkList = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  linkOperations: TLinkOperationsModal;
  disabled?: boolean;
  issueServiceType: TIssueServiceType;
};

export function LinkList(props: TLinkList) {
  // props
  const { workspaceSlug, projectId, issueId, linkOperations, disabled = false, issueServiceType } = props;
  // tanstack query
  const { data: issueLinks } = useIssueLinks(workspaceSlug, projectId, issueId);

  if (!issueLinks || issueLinks.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 pt-4">
      {issueLinks.map((link) => (
        <IssueLinkItem
          key={link.id}
          link={link}
          linkOperations={linkOperations}
          isNotAllowed={disabled}
          issueServiceType={issueServiceType}
        />
      ))}
    </div>
  );
}
