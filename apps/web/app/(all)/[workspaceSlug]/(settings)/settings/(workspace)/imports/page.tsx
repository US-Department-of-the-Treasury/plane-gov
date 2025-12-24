// components
import { EUserPermissions } from "@plane/constants";
import { NotAuthorizedView } from "@/components/auth-screens/not-authorized-view";
import { PageHead } from "@/components/core/page-title";
import { IntegrationGuide } from "@/components/integration/guide";
// hooks
import { SettingsContentWrapper } from "@/components/settings/content-wrapper";
import { SettingsHeading } from "@/components/settings/heading";
import { useWorkspaceDetails } from "@/store/queries/workspace";
import type { Route } from "./+types/page";

function ImportsPage({ params }: Route.ComponentProps) {
  // router
  const { workspaceSlug } = params;
  // Use TanStack Query for workspace details - properly triggers re-renders when data loads
  const { data: currentWorkspace, isLoading: isLoadingWorkspace } = useWorkspaceDetails(workspaceSlug);
  // derived values - use role from TanStack Query for accurate re-rendering
  const userWorkspaceRole = currentWorkspace?.role;
  const isAdmin = userWorkspaceRole === EUserPermissions.ADMIN;
  const pageTitle = currentWorkspace?.name ? `${currentWorkspace.name} - Imports` : undefined;

  // Only show NotAuthorized when workspace data has loaded AND user lacks permissions
  if (!isLoadingWorkspace && currentWorkspace && !isAdmin)
    return <NotAuthorizedView section="settings" className="h-auto" />;

  return (
    <SettingsContentWrapper size="lg">
      <PageHead title={pageTitle} />
      <section className="w-full">
        <SettingsHeading title="Imports" />
        <IntegrationGuide />
      </section>
    </SettingsContentWrapper>
  );
}

export default ImportsPage;
