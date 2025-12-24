import { useTranslation } from "@plane/i18n";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { EUserProjectRoles  } from "@plane/types";
import type {IProject} from "@plane/types";
// ui
// components
import { NotAuthorizedView } from "@/components/auth-screens/not-authorized-view";
import { AutoArchiveAutomation, AutoCloseAutomation } from "@/components/automation";
import { PageHead } from "@/components/core/page-title";
// hooks
import { SettingsContentWrapper } from "@/components/settings/content-wrapper";
import { SettingsHeading } from "@/components/settings/heading";
import { useProjectDetails, useUpdateProject } from "@/store/queries/project";
// plane web imports
import { CustomAutomationsRoot } from "@/plane-web/components/automations/root";
import type { Route } from "./+types/page";

function AutomationSettingsPage({ params }: Route.ComponentProps) {
  // router
  const { workspaceSlug, projectId } = params;
  // Use TanStack Query for project details - properly triggers re-renders when data loads
  const { data: projectDetails, isLoading: isLoadingProject } = useProjectDetails(workspaceSlug, projectId);
  const { mutate: updateProject } = useUpdateProject();

  const { t } = useTranslation();

  // derived values - use member_role from TanStack Query for accurate re-rendering
  const projectMemberRole = projectDetails?.member_role;
  const canPerformProjectAdminActions = projectMemberRole === EUserProjectRoles.ADMIN;

  const handleChange = (formData: Partial<IProject>) => {
    if (!projectDetails) return;
    updateProject(
      { workspaceSlug, projectId, data: formData },
      {
        onError: () => {
          setToast({
            type: TOAST_TYPE.ERROR,
            title: "Error!",
            message: "Something went wrong. Please try again.",
          });
        },
      }
    );
  };

  // derived values
  const pageTitle = projectDetails?.name ? `${projectDetails?.name} - Automations` : undefined;

  // Only show NotAuthorized when project data has loaded AND user lacks permissions
  if (!isLoadingProject && projectDetails && !canPerformProjectAdminActions) {
    return <NotAuthorizedView section="settings" isProjectView className="h-auto" />;
  }

  return (
    <SettingsContentWrapper size="lg">
      <PageHead title={pageTitle} />
      <section className={`w-full ${canPerformProjectAdminActions ? "" : "opacity-60"}`}>
        <SettingsHeading
          title={t("project_settings.automations.heading")}
          description={t("project_settings.automations.description")}
        />
        <AutoArchiveAutomation handleChange={handleChange} />
        <AutoCloseAutomation handleChange={handleChange} />
      </section>
      <CustomAutomationsRoot projectId={projectId} workspaceSlug={workspaceSlug} />
    </SettingsContentWrapper>
  );
}

export default AutomationSettingsPage;
