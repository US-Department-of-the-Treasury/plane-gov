import React from "react";
// plane imports
import type { TIssueServiceType } from "@plane/types";
import { Collapsible } from "@plane/ui";
// store
import { useIssueDetailUIStore } from "@/store/issue/issue-details/ui.store";
// local imports
import { IssueAttachmentsCollapsibleContent } from "./content";
import { IssueAttachmentsCollapsibleTitle } from "./title";

type Props = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  disabled?: boolean;
  issueServiceType: TIssueServiceType;
};

export function AttachmentsCollapsible(props: Props) {
  const { workspaceSlug, projectId, issueId, disabled = false, issueServiceType } = props;
  // store hooks
  const openWidgets = useIssueDetailUIStore((s) => s.openWidgets);
  const toggleOpenWidget = useIssueDetailUIStore((s) => s.toggleOpenWidget);

  // derived values
  const isCollapsibleOpen = openWidgets.includes("attachments");

  return (
    <Collapsible
      isOpen={isCollapsibleOpen}
      onToggle={() => toggleOpenWidget("attachments")}
      title={
        <IssueAttachmentsCollapsibleTitle
          isOpen={isCollapsibleOpen}
          workspaceSlug={workspaceSlug}
          projectId={projectId}
          issueId={issueId}
          disabled={disabled}
          issueServiceType={issueServiceType}
        />
      }
      buttonClassName="w-full"
    >
      <IssueAttachmentsCollapsibleContent
        workspaceSlug={workspaceSlug}
        projectId={projectId}
        issueId={issueId}
        disabled={disabled}
        issueServiceType={issueServiceType}
      />
    </Collapsible>
  );
}
