import { useParams } from "next/navigation";
// plane imports
import { EUserPermissions, EUserPermissionsLevel, EPIC_TRACKER_ELEMENTS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
// ui
import { Button } from "@plane/propel/button";
import { EpicIcon } from "@plane/propel/icons";
import { Breadcrumbs, Header } from "@plane/ui";
// components
import { BreadcrumbLink } from "@/components/common/breadcrumb-link";
import { EpicViewHeader } from "@/components/epics";
// hooks
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { useUserPermissions } from "@/hooks/store/user";
import { useAppRouter } from "@/hooks/use-app-router";
// queries
import { useProjects } from "@/store/queries/project";
// plane web imports
import { CommonProjectBreadcrumbs } from "@/plane-web/components/breadcrumbs/common";

export function EpicsListHeader() {
  // router
  const router = useAppRouter();
  const { workspaceSlug, projectId } = useParams();
  // store hooks
  const { toggleCreateEpicModal } = useCommandPalette();
  const { allowPermissions } = useUserPermissions();
  // queries
  const { isLoading } = useProjects(workspaceSlug?.toString() ?? "");

  const { t } = useTranslation();

  // auth
  const canUserCreateEpic = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.PROJECT
  );

  return (
    <Header>
      <Header.LeftItem>
        <div>
          <Breadcrumbs onBack={router.back} isLoading={isLoading}>
            <CommonProjectBreadcrumbs workspaceSlug={workspaceSlug?.toString()} projectId={projectId?.toString()} />
            <Breadcrumbs.Item
              component={
                <BreadcrumbLink
                  label="Epics"
                  href={`/${workspaceSlug}/projects/${projectId}/epics/`}
                  icon={<EpicIcon className="h-4 w-4 text-tertiary" />}
                  isLast
                />
              }
              isLast
            />
          </Breadcrumbs>
        </div>
      </Header.LeftItem>
      <Header.RightItem>
        <EpicViewHeader />
        {canUserCreateEpic ? (
          <Button
            variant="primary"
            data-ph-element={EPIC_TRACKER_ELEMENTS.RIGHT_HEADER_ADD_BUTTON}
            onClick={() => {
              toggleCreateEpicModal(true);
            }}
            size="lg"
          >
            <div className="sm:hidden block">{t("add")}</div>
            <div className="hidden sm:block">{t("project_epic.add_epic")}</div>
          </Button>
        ) : (
          <></>
        )}
      </Header.RightItem>
    </Header>
  );
}
