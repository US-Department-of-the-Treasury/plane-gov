import { observer } from "mobx-react";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
// plane imports
import { EUserPermissionsLevel } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import type { TPageNavigationTabs } from "@plane/types";
import { EUserProjectRoles } from "@plane/types";
// assets
import darkPagesAsset from "@/app/assets/empty-state/disabled-feature/pages-dark.webp?url";
import lightPagesAsset from "@/app/assets/empty-state/disabled-feature/pages-light.webp?url";
// components
import { PageHead } from "@/components/core/page-title";
import { DetailedEmptyState } from "@/components/empty-state/detailed-empty-state-root";
import { PagesListRoot } from "@/components/pages/list/root";
import { PagesListView } from "@/components/pages/pages-list-view";
// hooks
import { useUserPermissions } from "@/hooks/store/user";
import { useAppRouter } from "@/hooks/use-app-router";
// queries
import { useProjectDetails } from "@/store/queries/project";
// plane web hooks
import { EPageStoreType } from "@/plane-web/hooks/store";
import type { Route } from "./+types/page";

const getPageType = (pageType?: string | null): TPageNavigationTabs => {
  if (pageType === "private") return "private";
  if (pageType === "archived") return "archived";
  return "public";
};

function ProjectPagesPage({ params }: Route.ComponentProps) {
  // router
  const router = useAppRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type");
  const { workspaceSlug, projectId } = params;
  // theme hook
  const { resolvedTheme } = useTheme();
  // plane hooks
  const { t } = useTranslation();
  // queries
  const { data: currentProjectDetails } = useProjectDetails(workspaceSlug, projectId);
  // store hooks
  const { allowPermissions } = useUserPermissions();
  // derived values
  const pageTitle = currentProjectDetails?.name ? `${currentProjectDetails?.name} - Pages` : undefined;
  const canPerformEmptyStateActions = allowPermissions([EUserProjectRoles.ADMIN], EUserPermissionsLevel.PROJECT);
  const resolvedPath = resolvedTheme === "light" ? lightPagesAsset : darkPagesAsset;
  const pageType = getPageType(type);

  // No access to sprint
  if (currentProjectDetails?.page_view === false)
    return (
      <div className="flex items-center justify-center h-full w-full">
        <DetailedEmptyState
          title={t("disabled_project.empty_state.page.title")}
          description={t("disabled_project.empty_state.page.description")}
          assetPath={resolvedPath}
          primaryButton={{
            text: t("disabled_project.empty_state.page.primary_button.text"),
            onClick: () => {
              router.push(`/${workspaceSlug}/settings/projects/${projectId}/features`);
            },
            disabled: !canPerformEmptyStateActions,
          }}
        />
      </div>
    );
  return (
    <>
      <PageHead title={pageTitle} />
      <PagesListView
        pageType={pageType}
        projectId={projectId}
        storeType={EPageStoreType.PROJECT}
        workspaceSlug={workspaceSlug}
      >
        <PagesListRoot pageType={pageType} storeType={EPageStoreType.PROJECT} />
      </PagesListView>
    </>
  );
}

export default observer(ProjectPagesPage);
