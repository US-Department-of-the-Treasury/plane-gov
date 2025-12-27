import { useCallback } from "react";
import { useParams } from "next/navigation";
// hooks
import { useAddIssuesToEpic } from "@/store/queries/epic";
// local imports
import { EpicIssueQuickActions } from "../../quick-action-dropdowns";
import { BaseCalendarRoot } from "../base-calendar-root";

export function EpicCalendarLayout() {
  const { workspaceSlug, projectId, epicId } = useParams();

  const { mutateAsync: addIssuesToEpic } = useAddIssuesToEpic();

  const addIssuesToView = useCallback(
    (issueIds: string[]) => {
      if (!workspaceSlug || !projectId || !epicId) throw new Error();
      return addIssuesToEpic({
        workspaceSlug: workspaceSlug.toString(),
        projectId: projectId.toString(),
        epicId: epicId.toString(),
        issueIds,
      });
    },
    [addIssuesToEpic, workspaceSlug, projectId, epicId]
  );

  if (!epicId) return null;

  return (
    <BaseCalendarRoot
      QuickActions={EpicIssueQuickActions}
      addIssuesToView={addIssuesToView}
      viewId={epicId?.toString()}
    />
  );
}
