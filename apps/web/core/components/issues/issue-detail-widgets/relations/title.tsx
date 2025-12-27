import type { FC } from "react";
import React, { useMemo } from "react";
import { useTranslation } from "@plane/i18n";
import { CollapsibleButton } from "@plane/ui";
// stores
import { useIssueRelationStore } from "@/store/issue/issue-details/relation.store";
// Plane-web
import { useTimeLineRelationOptions } from "@/plane-web/components/relations";
// local imports
import { RelationActionButton } from "./quick-action-button";

type Props = {
  isOpen: boolean;
  issueId: string;
  disabled: boolean;
};

export function RelationsCollapsibleTitle(props: Props) {
  const { isOpen, issueId, disabled } = props;
  const { t } = useTranslation();
  // store hooks - use Zustand directly
  const getRelationCountByIssueId = useIssueRelationStore((s) => s.getRelationCountByIssueId);

  const ISSUE_RELATION_OPTIONS = useTimeLineRelationOptions();
  // derived values
  const relationsCount = getRelationCountByIssueId(issueId, ISSUE_RELATION_OPTIONS);

  // indicator element
  const indicatorElement = useMemo(
    () => (
      <span className="flex items-center justify-center ">
        <p className="text-14 text-tertiary !leading-3">{relationsCount}</p>
      </span>
    ),
    [relationsCount]
  );

  return (
    <CollapsibleButton
      isOpen={isOpen}
      title={t("common.relations")}
      indicatorElement={indicatorElement}
      actionItemElement={!disabled && <RelationActionButton issueId={issueId} disabled={disabled} />}
    />
  );
}
