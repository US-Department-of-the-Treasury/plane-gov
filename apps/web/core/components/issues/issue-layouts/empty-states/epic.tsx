import { useState } from "react";
import { useParams } from "next/navigation";
// plane imports
import { EUserPermissionsLevel, WORK_ITEM_TRACKER_ELEMENTS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { EmptyStateDetailed } from "@plane/propel/empty-state";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { ISearchIssueResponse } from "@plane/types";
import { EIssuesStoreType, EUserProjectRoles } from "@plane/types";
// components
import { ExistingIssuesListModal } from "@/components/core/modals/existing-issues-list-modal";
import { captureClick } from "@/helpers/event-tracker.helper";
// hooks
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { useIssues } from "@/hooks/store/use-issues";
import { useUserPermissions } from "@/hooks/store/user";
import { useWorkItemFilterInstance } from "@/hooks/store/work-item-filters/use-work-item-filter-instance";

export function EpicEmptyState() {
  // router
  const { workspaceSlug: routerWorkspaceSlug, projectId: routerProjectId, epicId: routerEpicId } = useParams();
  const workspaceSlug = routerWorkspaceSlug ? routerWorkspaceSlug.toString() : undefined;
  const projectId = routerProjectId ? routerProjectId.toString() : undefined;
  const epicId = routerEpicId ? routerEpicId.toString() : undefined;
  // states
  const [epicIssuesListModal, setEpicIssuesListModal] = useState(false);
  // plane hooks
  const { t } = useTranslation();
  // store hooks
  const { issues } = useIssues(EIssuesStoreType.EPIC);
  const { toggleCreateIssueModal } = useCommandPalette();
  const { allowPermissions } = useUserPermissions();
  // derived values
  const epicWorkItemFilter = useWorkItemFilterInstance(EIssuesStoreType.EPIC, epicId);
  const canPerformEmptyStateActions = allowPermissions(
    [EUserProjectRoles.ADMIN, EUserProjectRoles.MEMBER],
    EUserPermissionsLevel.PROJECT
  );

  const handleAddIssuesToEpic = async (data: ISearchIssueResponse[]) => {
    if (!workspaceSlug || !projectId || !epicId) return;

    const issueIds = data.map((i) => i.id);
    await issues
      .addIssuesToEpic(workspaceSlug.toString(), projectId?.toString(), epicId.toString(), issueIds)
      .then(() =>
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: "Success!",
          message: "Work items added to the epic successfully.",
        })
      )
      .catch(() =>
        setToast({
          type: TOAST_TYPE.ERROR,
          title: "Error!",
          message: "Selected work items could not be added to the epic. Please try again.",
        })
      );
  };

  return (
    <div className="relative h-full w-full overflow-y-auto">
      <ExistingIssuesListModal
        workspaceSlug={workspaceSlug?.toString()}
        projectId={projectId?.toString()}
        isOpen={epicIssuesListModal}
        handleClose={() => setEpicIssuesListModal(false)}
        searchParams={{ epic_id: epicId != undefined ? epicId.toString() : "" }}
        handleOnSubmit={handleAddIssuesToEpic}
      />
      <div className="grid h-full w-full place-items-center">
        {epicWorkItemFilter?.hasActiveFilters ? (
          <EmptyStateDetailed
            assetKey="search"
            title={t("common_empty_state.search.title")}
            description={t("common_empty_state.search.description")}
            actions={[
              {
                label: "Clear filters",
                onClick: epicWorkItemFilter?.clearFilters,
                disabled: !canPerformEmptyStateActions || !epicWorkItemFilter,
                variant: "secondary",
              },
            ]}
          />
        ) : (
          <EmptyStateDetailed
            assetKey="work-item"
            title={t("project_empty_state.epic_work_items.title")}
            description={t("project_empty_state.epic_work_items.description")}
            actions={[
              {
                label: t("project_empty_state.epic_work_items.cta_primary"),
                onClick: () => {
                  captureClick({ elementName: WORK_ITEM_TRACKER_ELEMENTS.EMPTY_STATE_ADD_BUTTON.EPIC });
                  toggleCreateIssueModal(true, EIssuesStoreType.EPIC);
                },
                disabled: !canPerformEmptyStateActions,
                variant: "primary",
              },
              {
                label: t("project_empty_state.epic_work_items.cta_secondary"),
                onClick: () => setEpicIssuesListModal(true),
                disabled: !canPerformEmptyStateActions,
                variant: "secondary",
              },
            ]}
          />
        )}
      </div>
    </div>
  );
}
