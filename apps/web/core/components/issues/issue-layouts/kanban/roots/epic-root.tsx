import React from "react";
import { useParams } from "next/navigation";
// plane imports
import type { TIssue } from "@plane/types";
import { EIssuesStoreType } from "@plane/types";
// hooks
import { useIssues } from "@/hooks/store/use-issues";
// local imports
import { EpicIssueQuickActions } from "../../quick-action-dropdowns";
import { BaseKanBanRoot } from "../base-kanban-root";

export function EpicKanBanLayout() {
  const { workspaceSlug, projectId, epicId } = useParams();

  // store
  const { issues } = useIssues(EIssuesStoreType.EPIC);

  return (
    <BaseKanBanRoot
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
