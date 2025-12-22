import type { FC } from "react";
// local imports
import { ArchivedIssueQuickActions } from "../../quick-action-dropdowns";
import { BaseListRoot } from "../base-list-root";

export function ArchivedIssueListLayout() {
  const canEditPropertiesBasedOnProject = () => false;

  return (
    <BaseListRoot
      QuickActions={ArchivedIssueQuickActions}
      canEditPropertiesBasedOnProject={canEditPropertiesBasedOnProject}
    />
  );
}
