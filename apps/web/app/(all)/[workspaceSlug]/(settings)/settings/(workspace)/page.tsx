// plane imports
import { useTranslation } from "@plane/i18n";
// components
import { PageHead } from "@/components/core/page-title";
import { SettingsContentWrapper } from "@/components/settings/content-wrapper";
import { WorkspaceDetails } from "@/components/workspace/settings/workspace-details";
// hooks
import { useWorkspaceDetails } from "@/store/queries/workspace";
import type { Route } from "./+types/page";

function WorkspaceSettingsPage({ params }: Route.ComponentProps) {
  // router
  const { workspaceSlug } = params;
  // store hooks
  const { data: currentWorkspace } = useWorkspaceDetails(workspaceSlug);
  const { t } = useTranslation();
  // derived values
  const pageTitle = currentWorkspace?.name
    ? t("workspace_settings.page_label", { workspace: currentWorkspace.name })
    : undefined;

  return (
    <SettingsContentWrapper>
      <PageHead title={pageTitle} />
      <WorkspaceDetails />
    </SettingsContentWrapper>
  );
}

export default WorkspaceSettingsPage;
