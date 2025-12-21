import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// ui
import { EUserPermissions, EUserPermissionsLevel, CYCLE_TRACKER_ELEMENTS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { SprintIcon } from "@plane/propel/icons";
import { Breadcrumbs, Header } from "@plane/ui";
// components
import { BreadcrumbLink } from "@/components/common/breadcrumb-link";
import { SprintsViewHeader } from "@/components/sprints/sprints-view-header";
// hooks
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { useProject } from "@/hooks/store/use-project";
import { useUserPermissions } from "@/hooks/store/user";
import { useAppRouter } from "@/hooks/use-app-router";
// plane web imports
import { CommonProjectBreadcrumbs } from "@/plane-web/components/breadcrumbs/common";

export const SprintsListHeader = observer(function SprintsListHeader() {
  // router
  const router = useAppRouter();
  const { workspaceSlug, projectId } = useParams();

  // store hooks
  const { toggleCreateSprintModal } = useCommandPalette();
  const { allowPermissions } = useUserPermissions();
  const { currentProjectDetails, loader } = useProject();
  const { t } = useTranslation();

  const canUserCreateSprint = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.PROJECT
  );

  return (
    <Header>
      <Header.LeftItem>
        <Breadcrumbs onBack={router.back} isLoading={loader === "init-loader"}>
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
            data-ph-element={CYCLE_TRACKER_ELEMENTS.RIGHT_HEADER_ADD_BUTTON}
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
});
