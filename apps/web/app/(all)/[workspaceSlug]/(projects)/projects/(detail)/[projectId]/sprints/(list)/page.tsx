import { useState } from "react";
import { observer } from "mobx-react";
// plane imports
import { useTheme } from "next-themes";
import { EUserPermissionsLevel, SPRINT_TRACKER_ELEMENTS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { EmptyStateDetailed } from "@plane/propel/empty-state";
import type { TSprintFilters } from "@plane/types";
import { EUserProjectRoles } from "@plane/types";
// components
import { Header, EHeaderVariant } from "@plane/ui";
import { calculateTotalFilters } from "@plane/utils";
// assets
import darkEmptyState from "@/app/assets/empty-state/disabled-feature/sprints-dark.webp?url";
import lightEmptyState from "@/app/assets/empty-state/disabled-feature/sprints-light.webp?url";
// components
import { PageHead } from "@/components/core/page-title";
import { SprintAppliedFiltersList } from "@/components/sprints/applied-filters";
import { SprintsView } from "@/components/sprints/sprints-view";
import { SprintCreateUpdateModal } from "@/components/sprints/modal";
import { DetailedEmptyState } from "@/components/empty-state/detailed-empty-state-root";
import { SprintEpicListLayoutLoader } from "@/components/ui/loader/sprint-module-list-loader";
// hooks
import { useSprint } from "@/hooks/store/use-sprint";
import { useSprintFilter } from "@/hooks/store/use-sprint-filter";
import { useProject } from "@/hooks/store/use-project";
import { useUserPermissions } from "@/hooks/store/user";
import { useAppRouter } from "@/hooks/use-app-router";
import type { Route } from "./+types/page";

function ProjectSprintsPage({ params }: Route.ComponentProps) {
  // states
  const [createModal, setCreateModal] = useState(false);
  // store hooks
  const { currentProjectSprintIds, loader } = useSprint();
  const { getProjectById, currentProjectDetails } = useProject();
  // router
  const router = useAppRouter();
  const { workspaceSlug, projectId } = params;
  // theme hook
  const { resolvedTheme } = useTheme();
  // plane hooks
  const { t } = useTranslation();
  // sprint filters hook
  const { clearAllFilters, currentProjectFilters, updateFilters } = useSprintFilter();
  const { allowPermissions } = useUserPermissions();
  // derived values
  const resolvedEmptyState = resolvedTheme === "light" ? lightEmptyState : darkEmptyState;
  const totalSprints = currentProjectSprintIds?.length ?? 0;
  const project = getProjectById(projectId);
  const pageTitle = project?.name ? `${project?.name} - ${t("common.sprints", { count: 2 })}` : undefined;
  const hasAdminLevelPermission = allowPermissions([EUserProjectRoles.ADMIN], EUserPermissionsLevel.PROJECT);
  const hasMemberLevelPermission = allowPermissions(
    [EUserProjectRoles.ADMIN, EUserProjectRoles.MEMBER],
    EUserPermissionsLevel.PROJECT
  );

  const handleRemoveFilter = (key: keyof TSprintFilters, value: string | null) => {
    let newValues = currentProjectFilters?.[key] ?? [];

    if (!value) newValues = [];
    else newValues = newValues.filter((val) => val !== value);

    updateFilters(projectId, { [key]: newValues });
  };

  // No access to sprint
  if (currentProjectDetails?.sprint_view === false)
    return (
      <div className="flex items-center justify-center h-full w-full">
        <DetailedEmptyState
          title={t("disabled_project.empty_state.sprint.title")}
          description={t("disabled_project.empty_state.sprint.description")}
          assetPath={resolvedEmptyState}
          primaryButton={{
            text: t("disabled_project.empty_state.sprint.primary_button.text"),
            onClick: () => {
              router.push(`/${workspaceSlug}/settings/projects/${projectId}/features`);
            },
            disabled: !hasAdminLevelPermission,
          }}
        />
      </div>
    );

  if (loader) return <SprintEpicListLayoutLoader />;

  return (
    <>
      <PageHead title={pageTitle} />
      <div className="w-full h-full">
        <SprintCreateUpdateModal
          workspaceSlug={workspaceSlug}
          projectId={projectId}
          isOpen={createModal}
          handleClose={() => setCreateModal(false)}
        />
        {totalSprints === 0 ? (
          <div className="h-full place-items-center">
            <EmptyStateDetailed
              assetKey="sprint"
              title={t("project_empty_state.sprints.title")}
              description={t("project_empty_state.sprints.description")}
              actions={[
                {
                  label: t("project_empty_state.sprints.cta_primary"),
                  onClick: () => setCreateModal(true),
                  variant: "primary",
                  disabled: !hasMemberLevelPermission,
                  "data-ph-element": SPRINT_TRACKER_ELEMENTS.EMPTY_STATE_ADD_BUTTON,
                },
              ]}
            />
          </div>
        ) : (
          <>
            {calculateTotalFilters(currentProjectFilters ?? {}) !== 0 && (
              <Header variant={EHeaderVariant.TERNARY}>
                <SprintAppliedFiltersList
                  appliedFilters={currentProjectFilters ?? {}}
                  handleClearAllFilters={() => clearAllFilters(projectId)}
                  handleRemoveFilter={handleRemoveFilter}
                />
              </Header>
            )}

            <SprintsView workspaceSlug={workspaceSlug} projectId={projectId} />
          </>
        )}
      </div>
    </>
  );
}

export default observer(ProjectSprintsPage);
