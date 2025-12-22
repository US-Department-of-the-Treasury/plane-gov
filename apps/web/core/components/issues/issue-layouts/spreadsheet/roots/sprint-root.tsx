import React, { useCallback } from "react";
import { useParams } from "next/navigation";
// hooks
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { useProjectSprints, getCompletedSprints } from "@/store/queries/sprint";
import { useUserPermissions } from "@/hooks/store/user";
// components
import { SprintIssueQuickActions } from "../../quick-action-dropdowns";
import { BaseSpreadsheetRoot } from "../base-spreadsheet-root";

export function SprintSpreadsheetLayout() {
  // router
  const { workspaceSlug, projectId, sprintId } = useParams();
  // store hooks
  const { data: sprints } = useProjectSprints(workspaceSlug?.toString() ?? "", projectId?.toString() ?? "");
  const { allowPermissions } = useUserPermissions();
  // auth
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

  if (!sprintId) return null;

  return (
    <BaseSpreadsheetRoot
      QuickActions={SprintIssueQuickActions}
      canEditPropertiesBasedOnProject={canEditIssueProperties}
      isCompletedSprint={isCompletedSprint}
      viewId={sprintId.toString()}
    />
  );
}
