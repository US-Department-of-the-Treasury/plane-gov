import type { FC } from "react";
import React from "react";
import type { TIssueServiceType } from "@plane/types";
import { EIssueServiceType } from "@plane/types";
// local imports
import { IssueAttachmentItemList } from "../../attachment/attachment-item-list";
import { useAttachmentOperations } from "./helper";

type Props = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  disabled: boolean;
  issueServiceType?: TIssueServiceType;
};

export function IssueAttachmentsCollapsibleContent(props: Props) {
  const { workspaceSlug, projectId, issueId, disabled, issueServiceType = EIssueServiceType.ISSUES } = props;
  // helper
  const attachmentHelpers = useAttachmentOperations(workspaceSlug, projectId, issueId, issueServiceType);
  return (
    <IssueAttachmentItemList
      workspaceSlug={workspaceSlug}
      projectId={projectId}
      issueId={issueId}
      disabled={disabled}
      attachmentHelpers={attachmentHelpers}
      issueServiceType={issueServiceType}
    />
  );
}
