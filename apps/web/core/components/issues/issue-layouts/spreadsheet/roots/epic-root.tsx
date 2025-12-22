import React from "react";
import { useParams } from "next/navigation";
// mobx store
// components
import { EpicIssueQuickActions } from "../../quick-action-dropdowns";
import { BaseSpreadsheetRoot } from "../base-spreadsheet-root";

export function EpicSpreadsheetLayout() {
  const { epicId } = useParams();

  return <BaseSpreadsheetRoot QuickActions={EpicIssueQuickActions} viewId={epicId?.toString()} />;
}
