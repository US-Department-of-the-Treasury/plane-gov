import React, { useCallback } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// components
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { EIssuesStoreType } from "@plane/types";
// hooks
import { useProjectSprints, getCompletedSprints } from "@/store/queries/sprint";
import { useIssues } from "@/hooks/store/use-issues";
import { useUserPermissions } from "@/hooks/store/user";
// local imports
import { SprintIssueQuickActions } from "../../quick-action-dropdowns";
import { BaseKanBanRoot } from "../base-kanban-root";

export const SprintKanBanLayout = observer(function SprintKanBanLayout() {
  const { workspaceSlug, projectId, sprintId } = useParams();

  // store
  const { issues } = useIssues(EIssuesStoreType.SPRINT);
  const { data: sprints } = useProjectSprints(workspaceSlug?.toString() ?? "", projectId?.toString() ?? "");
  const { allowPermissions } = useUserPermissions();

  const completedSprintIds = getCompletedSprints(sprints).map((sprint) => sprint.id);
  const isCompletedSprint = sprintId ? completedSprintIds.includes(sprintId.toString()) : false;
  const isEditingAllowed = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.PROJECT
  );

  const canEditIssueProperties = useCallback(
    () => !isCompletedSprint && isEditingAllowed,
    [isCompletedSprint, isEditingAllowed]
  );

  const addIssuesToView = useCallback(
    (issueIds: string[]) => {
      if (!workspaceSlug || !projectId || !sprintId) throw new Error();
      return issues.addIssueToSprint(workspaceSlug.toString(), projectId.toString(), sprintId.toString(), issueIds);
    },
    [issues?.addIssueToSprint, workspaceSlug, projectId, sprintId]
  );

  return (
    <BaseKanBanRoot
      QuickActions={SprintIssueQuickActions}
      addIssuesToView={addIssuesToView}
      canEditPropertiesBasedOnProject={canEditIssueProperties}
      isCompletedSprint={isCompletedSprint}
      viewId={sprintId?.toString()}
    />
  );
});
