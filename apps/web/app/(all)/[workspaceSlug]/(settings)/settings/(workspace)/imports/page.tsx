// components
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { NotAuthorizedView } from "@/components/auth-screens/not-authorized-view";
import { PageHead } from "@/components/core/page-title";
import IntegrationGuide from "@/components/integration/guide";
// hooks
import { SettingsContentWrapper } from "@/components/settings/content-wrapper";
import { SettingsHeading } from "@/components/settings/heading";
import { useWorkspaceDetails } from "@/store/queries/workspace";
import { useUserPermissions } from "@/hooks/store/user";
import type { Route } from "./+types/page";

function ImportsPage({ params }: Route.ComponentProps) {
  // router
  const { workspaceSlug } = params;
  // store hooks
  const { data: currentWorkspace } = useWorkspaceDetails(workspaceSlug);
  const { allowPermissions } = useUserPermissions();
  // derived values
  const isAdmin = allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.WORKSPACE);
  const pageTitle = currentWorkspace?.name ? `${currentWorkspace.name} - Imports` : undefined;

  if (!isAdmin) return <NotAuthorizedView section="settings" className="h-auto" />;

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
