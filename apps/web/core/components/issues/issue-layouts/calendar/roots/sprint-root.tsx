import { useCallback } from "react";
import { useParams } from "next/navigation";
// hooks
import { useProjectSprints, getCompletedSprints } from "@/store/queries/sprint";
import { useAddIssueToSprint } from "@/store/queries/issue";
// components
import { SprintIssueQuickActions } from "../../quick-action-dropdowns";
import { BaseCalendarRoot } from "../base-calendar-root";

export function SprintCalendarLayout() {
  const { workspaceSlug, projectId, sprintId } = useParams();

  const { mutateAsync: addIssueToSprint } = useAddIssueToSprint();
  const { data: sprints } = useProjectSprints(workspaceSlug?.toString() ?? "", projectId?.toString() ?? "");

  const completedSprintIds = getCompletedSprints(sprints).map((sprint) => sprint.id);
  const isCompletedSprint = sprintId ? completedSprintIds.includes(sprintId.toString()) : false;

  const addIssuesToView = useCallback(
    (issueIds: string[]) => {
      if (!workspaceSlug || !projectId || !sprintId) throw new Error();
      return addIssueToSprint({
        workspaceSlug: workspaceSlug.toString(),
        projectId: projectId.toString(),
        sprintId: sprintId.toString(),
        issueIds,
      });
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
}
