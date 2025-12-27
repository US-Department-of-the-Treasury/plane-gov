import { useCallback } from "react";
import { useParams } from "next/navigation";
// plane imports
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import type { TIssue } from "@plane/types";
// hooks
import { useProjectSprints, getCompletedSprints } from "@/store/queries/sprint";
import { useAddIssueToSprint } from "@/store/queries/issue";
import { useUserPermissions } from "@/hooks/store/user";
// types
import { SprintIssueQuickActions } from "../../quick-action-dropdowns";
import { BaseListRoot } from "../base-list-root";

export function SprintListLayout() {
  const { workspaceSlug, projectId, sprintId } = useParams();
  // store
  const { mutateAsync: addIssueToSprint } = useAddIssueToSprint();
  const { data: sprints } = useProjectSprints(workspaceSlug?.toString() ?? "", projectId?.toString() ?? "");
  const { allowPermissions } = useUserPermissions();

  const completedSprintIds = getCompletedSprints(sprints).map((sprint) => sprint.id);
  const isCompletedSprint = sprintId ? completedSprintIds.includes(sprintId.toString()) : false;
  const isEditingAllowed = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.PROJECT,
    workspaceSlug?.toString(),
    projectId?.toString()
  );

  const canEditIssueProperties = useCallback(
    () => !isCompletedSprint && isEditingAllowed,
    [isCompletedSprint, isEditingAllowed]
  );

  const addIssuesToView = useCallback(
    async (issueIds: string[]): Promise<TIssue> => {
      if (!workspaceSlug || !projectId || !sprintId) throw new Error();
      await addIssueToSprint({
        workspaceSlug: workspaceSlug.toString(),
        projectId: projectId.toString(),
        sprintId: sprintId.toString(),
        issueIds,
      });
      return {} as TIssue;
    },
    [addIssueToSprint, workspaceSlug, projectId, sprintId]
  );

  return (
    <BaseListRoot
      QuickActions={SprintIssueQuickActions}
      addIssuesToView={addIssuesToView}
      canEditPropertiesBasedOnProject={canEditIssueProperties}
      isCompletedSprint={isCompletedSprint}
      viewId={sprintId?.toString()}
    />
  );
}
