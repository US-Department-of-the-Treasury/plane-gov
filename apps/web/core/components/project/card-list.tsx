import { useParams } from "next/navigation";
// plane imports
import { EUserPermissionsLevel, EUserPermissions, PROJECT_TRACKER_ELEMENTS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { EmptyStateDetailed } from "@plane/propel/empty-state";
import { ContentWrapper } from "@plane/ui";
// components
import { calculateTotalFilters } from "@plane/utils";
import { ProjectsLoader } from "@/components/ui/loader/projects-loader";
import { captureClick } from "@/helpers/event-tracker.helper";
// hooks
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { useProjectFilter } from "@/hooks/store/use-project-filter";
import { useUserPermissions } from "@/hooks/store/user";
// queries
import { useProjects, getProjectById } from "@/store/queries/project";
// local imports
import { ProjectCard } from "./card";

type TProjectCardListProps = {
  totalProjectIds?: string[];
  filteredProjectIds?: string[];
};

export function ProjectCardList(props: TProjectCardListProps) {
  const { totalProjectIds: totalProjectIdsProps, filteredProjectIds: filteredProjectIdsProps } = props;
  // router
  const { workspaceSlug } = useParams();
  // plane hooks
  const { t } = useTranslation();
  // store hooks
  const { toggleCreateProjectModal } = useCommandPalette();
  const { currentWorkspaceDisplayFilters, currentWorkspaceFilters } = useProjectFilter();
  const { allowPermissions } = useUserPermissions();
  // queries
  const { data: projects, isLoading } = useProjects(workspaceSlug?.toString());

  // derived values
  const workspaceProjectIds = totalProjectIdsProps ?? projects?.map((p) => p.id);
  const filteredProjectIds = filteredProjectIdsProps ?? projects?.map((p) => p.id);

  // permissions
  const canPerformEmptyStateActions = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.WORKSPACE
  );

  if (!filteredProjectIds || !workspaceProjectIds || isLoading) return <ProjectsLoader />;

  if (workspaceProjectIds?.length === 0 && !currentWorkspaceDisplayFilters?.archived_projects)
    return (
      <EmptyStateDetailed
        title={t("workspace_projects.empty_state.general.title")}
        description={t("workspace_projects.empty_state.general.description")}
        assetKey="project"
        assetClassName="size-40"
        actions={[
          {
            label: t("workspace_projects.empty_state.general.primary_button.text"),
            onClick: () => {
              toggleCreateProjectModal(true);
              captureClick({ elementName: PROJECT_TRACKER_ELEMENTS.EMPTY_STATE_CREATE_PROJECT_BUTTON });
            },
            disabled: !canPerformEmptyStateActions,
            variant: "primary",
          },
        ]}
      />
    );

  if (filteredProjectIds.length === 0)
    return (
      <EmptyStateDetailed
        title={
          currentWorkspaceDisplayFilters?.archived_projects &&
          calculateTotalFilters(currentWorkspaceFilters ?? {}) === 0
            ? t("workspace_empty_state.projects_archived.title")
            : t("common_empty_state.search.title")
        }
        description={
          currentWorkspaceDisplayFilters?.archived_projects &&
          calculateTotalFilters(currentWorkspaceFilters ?? {}) === 0
            ? t("workspace_empty_state.projects_archived.description")
            : t("common_empty_state.search.description")
        }
        assetKey={
          currentWorkspaceDisplayFilters?.archived_projects &&
          calculateTotalFilters(currentWorkspaceFilters ?? {}) === 0
            ? "archived-work-item"
            : "search"
        }
        assetClassName="size-40"
      />
    );

  return (
    <ContentWrapper>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {filteredProjectIds.map((projectId) => {
          const projectDetails = getProjectById(projects, projectId);
          if (!projectDetails) return;
          return <ProjectCard key={projectDetails.id} project={projectDetails} />;
        })}
      </div>
    </ContentWrapper>
  );
}
