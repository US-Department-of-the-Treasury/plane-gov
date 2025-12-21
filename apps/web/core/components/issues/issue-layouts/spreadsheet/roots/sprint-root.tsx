import React, { useCallback } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// hooks
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { useSprint } from "@/hooks/store/use-sprint";
import { useUserPermissions } from "@/hooks/store/user";
// components
import { SprintIssueQuickActions } from "../../quick-action-dropdowns";
import { BaseSpreadsheetRoot } from "../base-spreadsheet-root";

export const SprintSpreadsheetLayout = observer(function SprintSpreadsheetLayout() {
  // router
  const { sprintId } = useParams();
  // store hooks
  const { currentProjectCompletedSprintIds } = useSprint();
  const { allowPermissions } = useUserPermissions();
  // auth
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

  if (!sprintId) return null;

  return (
    <BaseSpreadsheetRoot
      QuickActions={SprintIssueQuickActions}
      canEditPropertiesBasedOnProject={canEditIssueProperties}
      isCompletedSprint={isCompletedSprint}
      viewId={sprintId.toString()}
    />
  );
});
