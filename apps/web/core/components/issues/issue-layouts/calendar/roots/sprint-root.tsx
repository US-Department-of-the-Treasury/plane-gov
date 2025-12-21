import { useCallback } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { EIssuesStoreType } from "@plane/types";
// hooks
import { useSprint } from "@/hooks/store/use-sprint";
import { useIssues } from "@/hooks/store/use-issues";
// components
import { SprintIssueQuickActions } from "../../quick-action-dropdowns";
import { BaseCalendarRoot } from "../base-calendar-root";

export const SprintCalendarLayout = observer(function SprintCalendarLayout() {
  const { currentProjectCompletedSprintIds } = useSprint();
  const { workspaceSlug, projectId, sprintId } = useParams();

  const {
    issues: { addIssueToSprint },
  } = useIssues(EIssuesStoreType.SPRINT);

  const isCompletedSprint =
    sprintId && currentProjectCompletedSprintIds ? currentProjectCompletedSprintIds.includes(sprintId.toString()) : false;

  const addIssuesToView = useCallback(
    (issueIds: string[]) => {
      if (!workspaceSlug || !projectId || !sprintId) throw new Error();
      return addIssueToSprint(workspaceSlug.toString(), projectId.toString(), sprintId.toString(), issueIds);
    },
    [addIssueToSprint, workspaceSlug, projectId, sprintId]
  );

  if (!sprintId) return null;

  return (
    <BaseCalendarRoot
      QuickActions={SprintIssueQuickActions}
      addIssuesToView={addIssuesToView}
      isCompletedSprint={isCompletedSprint}
      viewId={sprintId?.toString()}
    />
  );
});
