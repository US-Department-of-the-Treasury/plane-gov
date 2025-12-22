import React from "react";
import { useParams } from "next/navigation";
// plane imports
import { EIssuesStoreType } from "@plane/types";
// hooks
import { useIssues } from "@/hooks/store/use-issues";
// local imports
import { EpicIssueQuickActions } from "../../quick-action-dropdowns";
import { BaseListRoot } from "../base-list-root";

export function EpicListLayout() {
  const { workspaceSlug, projectId, epicId } = useParams();

  const { issues } = useIssues(EIssuesStoreType.EPIC);

  return (
    <BaseListRoot
      QuickActions={EpicIssueQuickActions}
      addIssuesToView={(issueIds: string[]) => {
        if (!workspaceSlug || !projectId || !epicId) throw new Error();
        return issues.addIssuesToEpic(workspaceSlug.toString(), projectId.toString(), epicId.toString(), issueIds);
      }}
      viewId={epicId?.toString()}
    />
  );
}
