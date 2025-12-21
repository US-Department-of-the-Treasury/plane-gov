import React from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// mobx store
// components
import { EpicIssueQuickActions } from "../../quick-action-dropdowns";
import { BaseSpreadsheetRoot } from "../base-spreadsheet-root";

export const EpicSpreadsheetLayout = observer(function EpicSpreadsheetLayout() {
  const { epicId } = useParams();

  return <BaseSpreadsheetRoot QuickActions={EpicIssueQuickActions} viewId={epicId?.toString()} />;
});
