// plane imports
import { EUserProjectRoles } from "@plane/types";
// components
import { NotAuthorizedView } from "@/components/auth-screens/not-authorized-view";
import { PageHead } from "@/components/core/page-title";
import { EstimateRoot } from "@/components/estimates";
// hooks
import { SettingsContentWrapper } from "@/components/settings/content-wrapper";
import { useProjectDetails } from "@/store/queries/project";
import type { Route } from "./+types/page";

function EstimatesSettingsPage({ params }: Route.ComponentProps) {
  const { workspaceSlug, projectId } = params;
  // Use TanStack Query for project details - properly triggers re-renders when data loads
  const { data: currentProjectDetails, isLoading: isLoadingProject } = useProjectDetails(workspaceSlug, projectId);

  // derived values - use member_role from TanStack Query for accurate re-rendering
  const pageTitle = currentProjectDetails?.name ? `${currentProjectDetails?.name} - Estimates` : undefined;
  const projectMemberRole = currentProjectDetails?.member_role;
  const canPerformProjectAdminActions = projectMemberRole === EUserProjectRoles.ADMIN;

  // Only show NotAuthorized when project data has loaded AND user lacks permissions
  if (!isLoadingProject && currentProjectDetails && !canPerformProjectAdminActions) {
    return <NotAuthorizedView section="settings" isProjectView className="h-auto" />;
  }

  return (
    <SettingsContentWrapper>
      <PageHead title={pageTitle} />
      <div className={`w-full ${canPerformProjectAdminActions ? "" : "pointer-events-none opacity-60"}`}>
        <EstimateRoot workspaceSlug={workspaceSlug} projectId={projectId} isAdmin={canPerformProjectAdminActions} />
      </div>
    </SettingsContentWrapper>
  );
}

export default EstimatesSettingsPage;
