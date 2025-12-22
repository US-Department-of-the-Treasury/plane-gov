import type { FC } from "react";
import React, { useMemo } from "react";
// plane imports
import { useTranslation } from "@plane/i18n";
import type { TIssueServiceType } from "@plane/types";
import { CollapsibleButton } from "@plane/ui";
// hooks
import { useIssue } from "@/store/queries/issue";
// local imports
import { IssueLinksActionButton } from "./quick-action-button";

type Props = {
  isOpen: boolean;
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  disabled: boolean;
  issueServiceType: TIssueServiceType;
};

export function IssueLinksCollapsibleTitle(props: Props) {
  const { isOpen, workspaceSlug, projectId, issueId, disabled, issueServiceType } = props;
  // translation
  const { t } = useTranslation();
  // query hooks
  const { data: issue } = useIssue(workspaceSlug, projectId, issueId);

  // derived values
  const linksCount = issue?.link_count ?? 0;

  // indicator element
  const indicatorElement = useMemo(
    () => (
      <span className="flex items-center justify-center ">
        <p className="text-14 text-tertiary !leading-3">{linksCount}</p>
      </span>
    ),
    [linksCount]
  );

  return (
    <CollapsibleButton
      isOpen={isOpen}
      title={t("common.links")}
      indicatorElement={indicatorElement}
      actionItemElement={
        !disabled && <IssueLinksActionButton issueServiceType={issueServiceType} disabled={disabled} />
      }
    />
  );
}
