import { useParams } from "next/navigation";
// ui
import { EUserPermissions, EUserPermissionsLevel, SPRINT_TRACKER_ELEMENTS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { SprintIcon } from "@plane/propel/icons";
import { Breadcrumbs, Header } from "@plane/ui";
// components
import { BreadcrumbLink } from "@/components/common/breadcrumb-link";
import { SprintsViewHeader } from "@/components/sprints/sprints-view-header";
// hooks
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { useUserPermissions } from "@/hooks/store/user";
import { useAppRouter } from "@/hooks/use-app-router";
// queries
import { useProjectDetails } from "@/store/queries/project";
// plane web imports
import { CommonProjectBreadcrumbs } from "@/plane-web/components/breadcrumbs/common";

export function SprintsListHeader() {
  // router
  const router = useAppRouter();
  const { workspaceSlug, projectId } = useParams();

  // store hooks
  const { toggleCreateSprintModal } = useCommandPalette();
  const { allowPermissions } = useUserPermissions();
  const { t } = useTranslation();
  // queries
  const { data: currentProjectDetails, isLoading } = useProjectDetails(
    workspaceSlug?.toString() ?? "",
    projectId?.toString() ?? ""
  );

  const canUserCreateSprint = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.PROJECT,
    workspaceSlug?.toString(),
    projectId?.toString()
  );

  return (
    <Header>
      <Header.LeftItem>
        <Breadcrumbs onBack={router.back} isLoading={isLoading}>
          <CommonProjectBreadcrumbs workspaceSlug={workspaceSlug?.toString()} projectId={projectId?.toString()} />
          <Breadcrumbs.Item
            component={
              <BreadcrumbLink
                label="Sprints"
                href={`/${workspaceSlug}/projects/${currentProjectDetails?.id}/sprints/`}
                icon={<SprintIcon className="h-4 w-4 text-tertiary" />}
                isLast
              />
            }
            isLast
          />
        </Breadcrumbs>
      </Header.LeftItem>
      {canUserCreateSprint && currentProjectDetails ? (
        <Header.RightItem>
          <SprintsViewHeader projectId={currentProjectDetails.id} />
          <Button
            variant="primary"
            size="lg"
            data-ph-element={SPRINT_TRACKER_ELEMENTS.RIGHT_HEADER_ADD_BUTTON}
            onClick={() => {
              toggleCreateSprintModal(true);
            }}
          >
            <div className="sm:hidden block">{t("add")}</div>
            <div className="hidden sm:block">{t("project_sprints.add_sprint")}</div>
          </Button>
        </Header.RightItem>
      ) : (
        <></>
      )}
    </Header>
  );
}
