import { useQuery } from "@tanstack/react-query";
// components
import { EUserPermissions } from "@plane/constants";
import { NotAuthorizedView } from "@/components/auth-screens/not-authorized-view";
import { PageHead } from "@/components/core/page-title";
import { SingleIntegrationCard } from "@/components/integration";
import { SettingsContentWrapper } from "@/components/settings/content-wrapper";
import { IntegrationAndImportExportBanner } from "@/components/ui/integration-and-import-export-banner";
import { IntegrationsSettingsLoader } from "@/components/ui/loader/settings/integration";
// hooks
import { useWorkspaceDetails } from "@/store/queries/workspace";
// services
import { IntegrationService } from "@/services/integrations";
import { queryKeys } from "@/store/queries/query-keys";
import type { Route } from "./+types/page";

const integrationService = new IntegrationService();

function WorkspaceIntegrationsPage({ params }: Route.ComponentProps) {
  // router
  const { workspaceSlug } = params;
  // Use TanStack Query for workspace details - properly triggers re-renders when data loads
  const { data: currentWorkspace, isLoading: isLoadingWorkspace } = useWorkspaceDetails(workspaceSlug);

  // derived values - use role from TanStack Query for accurate re-rendering
  const userWorkspaceRole = currentWorkspace?.role;
  const isAdmin = userWorkspaceRole === EUserPermissions.ADMIN;
  const pageTitle = currentWorkspace?.name ? `${currentWorkspace.name} - Integrations` : undefined;
  const { data: appIntegrations } = useQuery({
    queryKey: queryKeys.integrations.app(),
    queryFn: () => integrationService.getAppIntegrationsList(),
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Only show NotAuthorized when workspace data has loaded AND user lacks permissions
  if (!isLoadingWorkspace && currentWorkspace && !isAdmin)
    return <NotAuthorizedView section="settings" className="h-auto" />;

  return (
    <SettingsContentWrapper size="lg">
      <PageHead title={pageTitle} />
      <section className="w-full overflow-y-auto">
        <IntegrationAndImportExportBanner bannerName="Integrations" />
        <div>
          {appIntegrations ? (
            appIntegrations.map((integration) => (
              <SingleIntegrationCard key={integration.id} integration={integration} />
            ))
          ) : (
            <IntegrationsSettingsLoader />
          )}
        </div>
      </section>
    </SettingsContentWrapper>
  );
}

export default WorkspaceIntegrationsPage;
