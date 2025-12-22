import { useParams } from "next/navigation";
// plane imports
import { EUserPermissionsLevel, WORK_ITEM_TRACKER_ELEMENTS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { EmptyStateDetailed } from "@plane/propel/empty-state";
import { EIssuesStoreType, EUserWorkspaceRoles } from "@plane/types";
// hooks
import { captureClick } from "@/helpers/event-tracker.helper";
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { useUserPermissions } from "@/hooks/store/user";
import { useProjects, getJoinedProjectIds } from "@/store/queries/project";

export function GlobalViewEmptyState() {
  // plane imports
  const { t } = useTranslation();
  // router
  const { workspaceSlug } = useParams();
  // store hooks
  const { data: projects } = useProjects(workspaceSlug?.toString() ?? "");
  const workspaceProjectIds = getJoinedProjectIds(projects);
  const { toggleCreateIssueModal, toggleCreateProjectModal } = useCommandPalette();
  const { allowPermissions } = useUserPermissions();
  // derived values
  const hasMemberLevelPermission = allowPermissions(
    [EUserWorkspaceRoles.ADMIN, EUserWorkspaceRoles.MEMBER],
    EUserPermissionsLevel.WORKSPACE
  );

  if (workspaceProjectIds?.length === 0) {
    return (
      <EmptyStateDetailed
        title={t("workspace_projects.empty_state.no_projects.title")}
        description={t("workspace_projects.empty_state.no_projects.description")}
        assetKey="project"
        assetClassName="size-40"
        actions={[
          {
            label: t("workspace_projects.empty_state.no_projects.primary_button.text"),
            onClick: () => {
              toggleCreateProjectModal(true);
              captureClick({ elementName: WORK_ITEM_TRACKER_ELEMENTS.EMPTY_STATE_ADD_BUTTON.GLOBAL_VIEW });
            },
            disabled: !hasMemberLevelPermission,
            variant: "primary",
          },
        ]}
      />
    );
  }

  return (
    <EmptyStateDetailed
      title={t(`workspace_empty_state.views.title`)}
      description={t(`workspace_empty_state.views.description`)}
      assetKey="project"
      assetClassName="size-40"
      actions={[
        {
          label: t(`workspace_empty_state.views.cta_primary`),
          onClick: () => {
            captureClick({ elementName: WORK_ITEM_TRACKER_ELEMENTS.EMPTY_STATE_ADD_BUTTON.GLOBAL_VIEW });
            toggleCreateIssueModal(true, EIssuesStoreType.PROJECT);
          },
          disabled: !hasMemberLevelPermission,
          variant: "primary",
        },
      ]}
    />
  );
}
