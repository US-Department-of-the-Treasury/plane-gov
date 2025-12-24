import { useState } from "react";

import { Search } from "lucide-react";
// types
import { EUserPermissions, MEMBER_TRACKER_ELEMENTS, MEMBER_TRACKER_EVENTS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IWorkspaceBulkInviteFormData } from "@plane/types";
import { cn } from "@plane/utils";
// components
import { NotAuthorizedView } from "@/components/auth-screens/not-authorized-view";
import { CountChip } from "@/components/common/count-chip";
import { PageHead } from "@/components/core/page-title";
import { MemberListFiltersDropdown } from "@/components/project/dropdowns/filters/member-list";
import { SettingsContentWrapper } from "@/components/settings/content-wrapper";
import { WorkspaceMembersList } from "@/components/workspace/settings/members-list";
import { DevGenerateFakeUsers } from "@/components/workspace/settings/dev-generate-fake-users";
// helpers
import { captureError, captureSuccess } from "@/helpers/event-tracker.helper";
// hooks
import { useMember } from "@/hooks/store/use-member";
import { useWorkspaceDetails } from "@/store/queries/workspace";
import { useWorkspaceMembers, useInviteWorkspaceMembers } from "@/store/queries/member";
// plane web components
import { SendWorkspaceInvitationModal, MembersActivityButton } from "@/plane-web/components/workspace/members";
import type { Route } from "./+types/page";

function WorkspaceMembersSettingsPage({ params }: Route.ComponentProps) {
  // states
  const [inviteModal, setInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  // router
  const { workspaceSlug } = params;
  // store hooks
  const {
    workspace: { filtersStore },
  } = useMember();
  const { data: currentWorkspace, isLoading: isLoadingWorkspace } = useWorkspaceDetails(workspaceSlug);
  const { data: workspaceMembers } = useWorkspaceMembers(workspaceSlug);
  const { mutate: inviteWorkspaceMembers } = useInviteWorkspaceMembers();
  const { t } = useTranslation();

  // derived values
  const workspaceMemberIds = workspaceMembers?.map((m) => m.id);

  // Permission checks - use role from TanStack Query for accurate re-rendering
  const userWorkspaceRole = currentWorkspace?.role;
  const canPerformWorkspaceAdminActions = userWorkspaceRole === EUserPermissions.ADMIN;
  const canPerformWorkspaceMemberActions =
    userWorkspaceRole === EUserPermissions.ADMIN || userWorkspaceRole === EUserPermissions.MEMBER;

  const handleWorkspaceInvite = (data: IWorkspaceBulkInviteFormData) => {
    inviteWorkspaceMembers(
      {
        workspaceSlug,
        data,
      },
      {
        onSuccess: () => {
          setInviteModal(false);

          captureSuccess({
            eventName: MEMBER_TRACKER_EVENTS.invite,
            payload: {
              emails: data.emails.map((email) => email.email),
            },
          });

          setToast({
            type: TOAST_TYPE.SUCCESS,
            title: "Success!",
            message: t("workspace_settings.settings.members.invitations_sent_successfully"),
          });
        },
        onError: (error: unknown) => {
          let message = undefined;
          if (error instanceof Error) {
            const err = error as Error & { error?: string };
            message = err.error;
          }
          captureError({
            eventName: MEMBER_TRACKER_EVENTS.invite,
            payload: {
              emails: data.emails.map((email) => email.email),
            },
            error: error as Error,
          });

          setToast({
            type: TOAST_TYPE.ERROR,
            title: "Error!",
            message: `${message ?? t("something_went_wrong_please_try_again")}`,
          });
        },
      }
    );
  };

  // Handler for role filter updates
  const handleRoleFilterUpdate = (role: string) => {
    const currentFilters = filtersStore.filters;
    const currentRoles = currentFilters?.roles || [];
    const updatedRoles = currentRoles.includes(role)
      ? currentRoles.filter((r: string) => r !== role)
      : [...currentRoles, role];

    filtersStore.updateFilters({
      roles: updatedRoles.length > 0 ? updatedRoles : undefined,
    });
  };

  // derived values
  const pageTitle = currentWorkspace?.name ? `${currentWorkspace.name} - Members` : undefined;
  const appliedRoleFilters = filtersStore.filters?.roles || [];

  // if user is not authorized to view this page
  // Only show NotAuthorized when workspace data has loaded AND user lacks permissions
  // Use TanStack Query loading state for accurate timing of permission check
  if (!isLoadingWorkspace && currentWorkspace && !canPerformWorkspaceMemberActions) {
    return <NotAuthorizedView section="settings" className="h-auto" />;
  }

  return (
    <SettingsContentWrapper size="lg">
      <PageHead title={pageTitle} />
      <SendWorkspaceInvitationModal
        isOpen={inviteModal}
        onClose={() => setInviteModal(false)}
        onSubmit={handleWorkspaceInvite}
      />
      <section
        className={cn("w-full h-full", {
          "opacity-60": !canPerformWorkspaceMemberActions,
        })}
      >
        <div className="flex justify-between gap-4 pb-3.5 items-center">
          <h4 className="flex items-center gap-2.5 text-h5-medium">
            {t("workspace_settings.settings.members.title")}
            {workspaceMemberIds && workspaceMemberIds.length > 0 && (
              <CountChip count={workspaceMemberIds.length} className="h-5 m-auto" />
            )}
          </h4>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-md border border-subtle bg-surface-1 px-2.5 py-1.5">
              <Search className="h-3.5 w-3.5 text-placeholder" />
              <input
                className="w-full max-w-[234px] border-none bg-transparent text-body-xs-regular outline-none placeholder:text-placeholder"
                placeholder={`${t("search")}...`}
                value={searchQuery}
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <MemberListFiltersDropdown
              appliedFilters={appliedRoleFilters}
              handleUpdate={handleRoleFilterUpdate}
              memberType="workspace"
            />
            <MembersActivityButton workspaceSlug={workspaceSlug} />
            {canPerformWorkspaceAdminActions && (
              <>
                <DevGenerateFakeUsers workspaceSlug={workspaceSlug} />
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setInviteModal(true)}
                  data-ph-element={MEMBER_TRACKER_ELEMENTS.HEADER_ADD_BUTTON}
                >
                  {t("workspace_settings.settings.members.add_member")}
                </Button>
              </>
            )}
          </div>
        </div>
        <WorkspaceMembersList searchQuery={searchQuery} isAdmin={canPerformWorkspaceAdminActions} />
      </section>
    </SettingsContentWrapper>
  );
}

export default WorkspaceMembersSettingsPage;
