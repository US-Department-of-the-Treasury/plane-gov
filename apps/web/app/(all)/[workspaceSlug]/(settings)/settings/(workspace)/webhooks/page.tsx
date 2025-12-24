import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";
// plane imports
import { EUserPermissions, WORKSPACE_SETTINGS_TRACKER_ELEMENTS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
// components
import { EmptyStateCompact } from "@plane/propel/empty-state";
import { NotAuthorizedView } from "@/components/auth-screens/not-authorized-view";
import { PageHead } from "@/components/core/page-title";
import { SettingsContentWrapper } from "@/components/settings/content-wrapper";
import { SettingsHeading } from "@/components/settings/heading";
import { WebhookSettingsLoader } from "@/components/ui/loader/settings/web-hook";
import { WebhooksList, CreateWebhookModal } from "@/components/web-hooks";
// hooks
import { captureClick } from "@/helpers/event-tracker.helper";
import { useWebhook } from "@/hooks/store/use-webhook";
import { useWorkspaceDetails } from "@/store/queries/workspace";
import { queryKeys } from "@/store/queries/query-keys";
import type { Route } from "./+types/page";

function WebhooksListPage({ params }: Route.ComponentProps) {
  // states
  const [showCreateWebhookModal, setShowCreateWebhookModal] = useState(false);
  // router
  const { workspaceSlug } = params;
  // plane hooks
  const { t } = useTranslation();
  // mobx store
  const { fetchWebhooks, webhooks, clearSecretKey, webhookSecretKey, createWebhook } = useWebhook();
  // Use TanStack Query for workspace details - properly triggers re-renders when data loads
  const { data: currentWorkspace, isLoading: isLoadingWorkspace } = useWorkspaceDetails(workspaceSlug);
  // derived values - use role from TanStack Query for accurate re-rendering
  const userWorkspaceRole = currentWorkspace?.role;
  const canPerformWorkspaceAdminActions = userWorkspaceRole === EUserPermissions.ADMIN;

  useQuery({
    queryKey: queryKeys.webhooks.all(workspaceSlug),
    queryFn: () => fetchWebhooks(workspaceSlug),
    enabled: canPerformWorkspaceAdminActions,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const pageTitle = currentWorkspace?.name
    ? `${currentWorkspace.name} - ${t("workspace_settings.settings.webhooks.title")}`
    : undefined;

  // clear secret key when modal is closed.
  useEffect(() => {
    if (!showCreateWebhookModal && webhookSecretKey) clearSecretKey();
  }, [showCreateWebhookModal, webhookSecretKey, clearSecretKey]);

  // Only show NotAuthorized when workspace data has loaded AND user lacks permissions
  if (!isLoadingWorkspace && currentWorkspace && !canPerformWorkspaceAdminActions) {
    return <NotAuthorizedView section="settings" className="h-auto" />;
  }

  if (!webhooks) return <WebhookSettingsLoader />;

  return (
    <SettingsContentWrapper>
      <PageHead title={pageTitle} />
      <div className="w-full">
        <CreateWebhookModal
          createWebhook={createWebhook}
          clearSecretKey={clearSecretKey}
          currentWorkspace={currentWorkspace ?? null}
          isOpen={showCreateWebhookModal}
          onClose={() => {
            setShowCreateWebhookModal(false);
          }}
        />
        <SettingsHeading
          title={t("workspace_settings.settings.webhooks.title")}
          description={t("workspace_settings.settings.webhooks.description")}
          button={{
            label: t("workspace_settings.settings.webhooks.add_webhook"),
            onClick: () => {
              captureClick({
                elementName: WORKSPACE_SETTINGS_TRACKER_ELEMENTS.HEADER_ADD_WEBHOOK_BUTTON,
              });
              setShowCreateWebhookModal(true);
            },
          }}
        />
        {Object.keys(webhooks).length > 0 ? (
          <div className="flex h-full w-full flex-col">
            <WebhooksList />
          </div>
        ) : (
          <div className="flex h-full w-full flex-col">
            <div className="h-full w-full flex items-center justify-center">
              <EmptyStateCompact
                assetKey="webhook"
                title={t("settings_empty_state.webhooks.title")}
                description={t("settings_empty_state.webhooks.description")}
                actions={[
                  {
                    label: t("settings_empty_state.webhooks.cta_primary"),
                    onClick: () => {
                      captureClick({
                        elementName: WORKSPACE_SETTINGS_TRACKER_ELEMENTS.EMPTY_STATE_ADD_WEBHOOK_BUTTON,
                      });
                      setShowCreateWebhookModal(true);
                    },
                  },
                ]}
                align="start"
                rootClassName="py-20"
              />
            </div>
          </div>
        )}
      </div>
    </SettingsContentWrapper>
  );
}

export default WebhooksListPage;
