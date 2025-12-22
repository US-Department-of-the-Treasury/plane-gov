import { useState } from "react";
import { isEmpty } from "lodash-es";
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
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { useProjectSprints, getSprintById } from "@/store/queries/sprint";
import { useIssues } from "@/hooks/store/use-issues";
import { useUserPermissions } from "@/hooks/store/user";
import { useWorkItemFilterInstance } from "@/hooks/store/work-item-filters/use-work-item-filter-instance";

export function SprintEmptyState() {
  // router
  const { workspaceSlug: routerWorkspaceSlug, projectId: routerProjectId, sprintId: routerSprintId } = useParams();
  const workspaceSlug = routerWorkspaceSlug ? routerWorkspaceSlug.toString() : undefined;
  const projectId = routerProjectId ? routerProjectId.toString() : undefined;
  const sprintId = routerSprintId ? routerSprintId.toString() : undefined;
  // states
  const [sprintIssuesListModal, setSprintIssuesListModal] = useState(false);
  // plane hooks
  const { t } = useTranslation();
  // store hooks
  const { data: sprints } = useProjectSprints(workspaceSlug ?? "", projectId ?? "");
  const { issues } = useIssues(EIssuesStoreType.SPRINT);
  const { toggleCreateIssueModal } = useCommandPalette();
  const { allowPermissions } = useUserPermissions();
  // derived values
  const sprintWorkItemFilter = useWorkItemFilterInstance(EIssuesStoreType.SPRINT, sprintId);
  const sprintDetails = getSprintById(sprints, sprintId);
  const isCompletedSprintSnapshotAvailable = !isEmpty(sprintDetails?.progress_snapshot ?? {});
  const isCompletedAndEmpty =
    isCompletedSprintSnapshotAvailable || sprintDetails?.status?.toLowerCase() === "completed";
  const canPerformEmptyStateActions = allowPermissions(
    [EUserProjectRoles.ADMIN, EUserProjectRoles.MEMBER],
    EUserPermissionsLevel.PROJECT
  );

  const handleAddIssuesToSprint = async (data: ISearchIssueResponse[]) => {
    if (!workspaceSlug || !projectId || !sprintId) return;

    const issueIds = data.map((i) => i.id);

    await issues
      .addIssueToSprint(workspaceSlug.toString(), projectId.toString(), sprintId.toString(), issueIds)
      .then(() =>
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: "Success!",
          message: "Work items added to the sprint successfully.",
        })
      )
      .catch(() =>
        setToast({
          type: TOAST_TYPE.ERROR,
          title: "Error!",
          message: "Selected work items could not be added to the sprint. Please try again.",
        })
      );
  };

  return (
    <div className="relative h-full w-full overflow-y-auto">
      <ExistingIssuesListModal
        workspaceSlug={workspaceSlug?.toString()}
        projectId={projectId?.toString()}
        isOpen={sprintIssuesListModal}
        handleClose={() => setSprintIssuesListModal(false)}
        searchParams={{ sprint: true }}
        handleOnSubmit={handleAddIssuesToSprint}
      />
      <div className="grid h-full w-full place-items-center">
        {isCompletedAndEmpty ? (
          // TODO: Empty state ux copy needs to be updated
          <EmptyStateDetailed
            assetKey="work-item"
            title={t("project_sprints.empty_state.completed_no_issues.title")}
            description={t("project_sprints.empty_state.completed_no_issues.description")}
          />
        ) : sprintWorkItemFilter?.hasActiveFilters ? (
          <EmptyStateDetailed
            assetKey="search"
            title={t("common_empty_state.search.title")}
            description={t("common_empty_state.search.description")}
            actions={[
              {
                label: "Clear filters",
                onClick: sprintWorkItemFilter?.clearFilters,
                disabled: !canPerformEmptyStateActions || !sprintWorkItemFilter,
                variant: "secondary",
              },
            ]}
          />
        ) : (
          <EmptyStateDetailed
            assetKey="work-item"
            title={t("project_empty_state.sprint_work_items.title")}
            description={t("project_empty_state.sprint_work_items.description")}
            actions={[
              {
                label: t("project_empty_state.sprint_work_items.cta_primary"),
                onClick: () => {
                  captureClick({ elementName: WORK_ITEM_TRACKER_ELEMENTS.EMPTY_STATE_ADD_BUTTON.SPRINT });
                  toggleCreateIssueModal(true, EIssuesStoreType.SPRINT);
                },
                disabled: !canPerformEmptyStateActions,
                variant: "primary",
                "data-ph-element": WORK_ITEM_TRACKER_ELEMENTS.EMPTY_STATE_ADD_BUTTON.SPRINT,
              },
              {
                label: t("project_empty_state.sprint_work_items.cta_secondary"),
                onClick: () => setSprintIssuesListModal(true),
                disabled: !canPerformEmptyStateActions,
                variant: "secondary",
                "data-ph-element": WORK_ITEM_TRACKER_ELEMENTS.EMPTY_STATE_ADD_BUTTON.SPRINT,
              },
            ]}
          />
        )}
      </div>
    </div>
  );
}
