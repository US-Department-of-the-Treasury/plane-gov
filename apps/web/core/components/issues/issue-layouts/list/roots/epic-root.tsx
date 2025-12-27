import React from "react";
import { useParams } from "next/navigation";
// plane imports
import type { TIssue } from "@plane/types";
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
      addIssuesToView={(async (issueIds: string[]) => {
        if (!workspaceSlug || !projectId || !epicId) throw new Error();
        await issues.addIssuesToEpic(workspaceSlug.toString(), projectId.toString(), epicId.toString(), issueIds);
        return {} as TIssue;
      }) as (issueIds: string[]) => Promise<TIssue>}
      viewId={epicId?.toString()}
    />
  );
}
