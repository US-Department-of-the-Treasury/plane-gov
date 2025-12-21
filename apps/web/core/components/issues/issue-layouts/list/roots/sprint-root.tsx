import React, { useCallback } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// plane imports
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { EIssuesStoreType } from "@plane/types";
// hooks
import { useSprint } from "@/hooks/store/use-sprint";
import { useIssues } from "@/hooks/store/use-issues";
import { useUserPermissions } from "@/hooks/store/user";
// types
import { SprintIssueQuickActions } from "../../quick-action-dropdowns";
import { BaseListRoot } from "../base-list-root";

export const SprintListLayout = observer(function SprintListLayout() {
  const { workspaceSlug, projectId, sprintId } = useParams();
  // store
  const { issues } = useIssues(EIssuesStoreType.CYCLE);
  const { currentProjectCompletedSprintIds } = useSprint(); // mobx store
  const { allowPermissions } = useUserPermissions();

  const isCompletedSprint =
    sprintId && currentProjectCompletedSprintIds ? currentProjectCompletedSprintIds.includes(sprintId.toString()) : false;
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
    <BaseListRoot
      QuickActions={SprintIssueQuickActions}
      addIssuesToView={addIssuesToView}
      canEditPropertiesBasedOnProject={canEditIssueProperties}
      isCompletedSprint={isCompletedSprint}
      viewId={sprintId?.toString()}
    />
  );
});
