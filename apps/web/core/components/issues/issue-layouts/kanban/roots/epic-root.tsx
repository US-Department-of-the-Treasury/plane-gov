import { useCallback } from "react";
import { useParams } from "next/navigation";
// plane imports
import type { TIssue } from "@plane/types";
// hooks
import { useAddIssuesToEpic } from "@/store/queries/epic";
// local imports
import { EpicIssueQuickActions } from "../../quick-action-dropdowns";
import { BaseKanBanRoot } from "../base-kanban-root";

export function EpicKanBanLayout() {
  const { workspaceSlug, projectId, epicId } = useParams();

  // store
  const { mutateAsync: addIssuesToEpic } = useAddIssuesToEpic();

  const addIssuesToView = useCallback(
    async (issueIds: string[]): Promise<TIssue> => {
      if (!workspaceSlug || !projectId || !epicId) throw new Error();
      await addIssuesToEpic({
        workspaceSlug: workspaceSlug.toString(),
        projectId: projectId.toString(),
        epicId: epicId.toString(),
        issueIds,
      });
      return {} as TIssue;
    },
    [addIssuesToEpic, workspaceSlug, projectId, epicId]
  );

  return (
    <BaseKanBanRoot
      QuickActions={EpicIssueQuickActions}
      addIssuesToView={addIssuesToView}
      viewId={epicId?.toString()}
    />
  );
}
