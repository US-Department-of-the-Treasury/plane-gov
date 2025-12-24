// plane imports
import { useTranslation } from "@plane/i18n";
import { EUserProjectRoles, EUserWorkspaceRoles } from "@plane/types";
// components
import { NotAuthorizedView } from "@/components/auth-screens/not-authorized-view";
import { PageHead } from "@/components/core/page-title";
// hooks
import { ProjectMemberList } from "@/components/project/member-list";
import { ProjectSettingsMemberDefaults } from "@/components/project/project-settings-member-defaults";
import { SettingsContentWrapper } from "@/components/settings/content-wrapper";
import { SettingsHeading } from "@/components/settings/heading";
import { useProjectDetails } from "@/store/queries/project";
import { useWorkspaceDetails } from "@/store/queries/workspace";
// plane web imports
import { ProjectTeamspaceList } from "@/plane-web/components/projects/teamspaces/teamspace-list";
import { getProjectSettingsPageLabelI18nKey } from "@/plane-web/helpers/project-settings";
import type { Route } from "./+types/page";

function MembersSettingsPage({ params }: Route.ComponentProps) {
  // router
  const { workspaceSlug, projectId } = params;
  // plane hooks
  const { t } = useTranslation();
  // Use TanStack Query for project and workspace details - properly triggers re-renders when data loads
  const { data: currentProjectDetails, isLoading: isLoadingProject } = useProjectDetails(workspaceSlug, projectId);
  const { data: currentWorkspace, isLoading: isLoadingWorkspace } = useWorkspaceDetails(workspaceSlug);
  // derived values - use roles from TanStack Query for accurate re-rendering
  const pageTitle = currentProjectDetails?.name ? `${currentProjectDetails?.name} - Members` : undefined;
  const projectMemberRole = currentProjectDetails?.member_role;
  const workspaceRole = currentWorkspace?.role;
  const isProjectMemberOrAdmin =
    projectMemberRole === EUserProjectRoles.ADMIN || projectMemberRole === EUserProjectRoles.MEMBER;
  const isWorkspaceAdmin = workspaceRole === EUserWorkspaceRoles.ADMIN;
  const canPerformProjectMemberActions = isProjectMemberOrAdmin || isWorkspaceAdmin;

  // Only show NotAuthorized when data has loaded AND user lacks permissions
  const isLoading = isLoadingProject || isLoadingWorkspace;
  if (!isLoading && currentProjectDetails && !canPerformProjectMemberActions) {
    return <NotAuthorizedView section="settings" isProjectView className="h-auto" />;
  }

  return (
    <SettingsContentWrapper size="lg">
      <PageHead title={pageTitle} />
      <SettingsHeading title={t(getProjectSettingsPageLabelI18nKey("members", "common.members"))} />
      <ProjectSettingsMemberDefaults projectId={projectId} workspaceSlug={workspaceSlug} />
      <ProjectTeamspaceList projectId={projectId} workspaceSlug={workspaceSlug} />
      <ProjectMemberList projectId={projectId} workspaceSlug={workspaceSlug} />
    </SettingsContentWrapper>
  );
}

export default MembersSettingsPage;
