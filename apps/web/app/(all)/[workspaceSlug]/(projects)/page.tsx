// components
import { useTranslation } from "@plane/i18n";
import { AppHeader } from "@/components/core/app-header";
import { ContentWrapper } from "@/components/core/content-wrapper";
import { PageHead } from "@/components/core/page-title";
import { WorkspaceHomeView } from "@/components/home";
// hooks
import { useWorkspaceDetails } from "@/store/queries/workspace";
// local components
import { WorkspaceDashboardHeader } from "./header";
import type { Route } from "./+types/page";

function WorkspaceDashboardPage({ params }: Route.ComponentProps) {
  const { workspaceSlug } = params;
  const { data: currentWorkspace } = useWorkspaceDetails(workspaceSlug);
  const { t } = useTranslation();
  // derived values
  const pageTitle = currentWorkspace?.name ? `${currentWorkspace?.name} - ${t("home.title")}` : undefined;

  return (
    <>
      <AppHeader header={<WorkspaceDashboardHeader />} />
      <ContentWrapper>
        <PageHead title={pageTitle} />
        <WorkspaceHomeView />
      </ContentWrapper>
    </>
  );
}

export default WorkspaceDashboardPage;
