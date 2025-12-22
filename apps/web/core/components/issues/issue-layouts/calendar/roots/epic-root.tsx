import { useCallback } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// plane imports
import { EIssuesStoreType } from "@plane/types";
// hooks
import { useIssues } from "@/hooks/store/use-issues";
// local imports
import { EpicIssueQuickActions } from "../../quick-action-dropdowns";
import { BaseCalendarRoot } from "../base-calendar-root";

export const EpicCalendarLayout = observer(function EpicCalendarLayout() {
  const { workspaceSlug, projectId, epicId } = useParams();

  const {
    issues: { addIssuesToEpic },
  } = useIssues(EIssuesStoreType.EPIC);

  const addIssuesToView = useCallback(
    (issueIds: string[]) => {
      if (!workspaceSlug || !projectId || !epicId) throw new Error();
      return addIssuesToEpic(workspaceSlug.toString(), projectId.toString(), epicId.toString(), issueIds);
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
});
