import { useCallback } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// plane imports
import { EIssuesStoreType } from "@plane/types";
// hooks
import { useIssues } from "@/hooks/store/use-issues";
// local imports
import { ModuleIssueQuickActions } from "../../quick-action-dropdowns";
import { BaseCalendarRoot } from "../base-calendar-root";

export const ModuleCalendarLayout = observer(function ModuleCalendarLayout() {
  const { workspaceSlug, projectId, epicId } = useParams();

  const {
    issues: { addIssuesToModule },
  } = useIssues(EIssuesStoreType.EPIC);

  const addIssuesToView = useCallback(
    (issueIds: string[]) => {
      if (!workspaceSlug || !projectId || !epicId) throw new Error();
      return addIssuesToModule(workspaceSlug.toString(), projectId.toString(), epicId.toString(), issueIds);
    },
    [addIssuesToModule, workspaceSlug, projectId, epicId]
  );

  if (!epicId) return null;

  return (
    <BaseCalendarRoot
      QuickActions={ModuleIssueQuickActions}
      addIssuesToView={addIssuesToView}
      viewId={epicId?.toString()}
    />
  );
});
