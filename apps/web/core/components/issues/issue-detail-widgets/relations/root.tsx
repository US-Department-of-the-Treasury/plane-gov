import React from "react";
// plane imports
import type { TIssueServiceType } from "@plane/types";
import { Collapsible } from "@plane/ui";
// store
import { useIssueDetailUIStore } from "@/store/issue/issue-details/ui.store";
// local imports
import { RelationsCollapsibleContent } from "./content";
import { RelationsCollapsibleTitle } from "./title";

type Props = {
  workspaceSlug: string;
  issueId: string;
  disabled?: boolean;
  issueServiceType: TIssueServiceType;
};

export function RelationsCollapsible(props: Props) {
  const { workspaceSlug, issueId, disabled = false, issueServiceType } = props;
  // store hooks
  const openWidgets = useIssueDetailUIStore((s) => s.openWidgets);
  const toggleOpenWidget = useIssueDetailUIStore((s) => s.toggleOpenWidget);
  // derived values
  const isCollapsibleOpen = openWidgets.includes("relations");

  return (
    <Collapsible
      isOpen={isCollapsibleOpen}
      onToggle={() => toggleOpenWidget("relations")}
      title={
        <RelationsCollapsibleTitle
          isOpen={isCollapsibleOpen}
          issueId={issueId}
          disabled={disabled}
        />
      }
      buttonClassName="w-full"
    >
      <RelationsCollapsibleContent
        workspaceSlug={workspaceSlug}
        issueId={issueId}
        disabled={disabled}
        issueServiceType={issueServiceType}
      />
    </Collapsible>
  );
}
