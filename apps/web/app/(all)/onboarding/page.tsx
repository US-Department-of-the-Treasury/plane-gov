import { observer } from "mobx-react";
import useSWR from "swr";

// components
import { LogoSpinner } from "@/components/common/logo-spinner";
import { OnboardingRoot } from "@/components/onboarding";
// constants
import { USER_WORKSPACES_LIST } from "@/constants/fetch-keys";
// helpers
import { EPageTypes } from "@/helpers/authentication.helper";
// hooks
import { useUser } from "@/hooks/store/user";
// wrappers
import { AuthenticationWrapper } from "@/lib/wrappers/authentication-wrapper";
// services
import { WorkspaceService } from "@/plane-web/services";
import { useWorkspaces } from "@/store/queries/workspace";

const workspaceService = new WorkspaceService();

function OnboardingPage() {
  // store hooks
  const { data: user } = useUser();
  // TanStack Query automatically fetches workspaces
  useWorkspaces();

  // fetching user workspace invitations
  const { isLoading: invitationsLoader, data: invitations } = useSWR(
    `USER_WORKSPACE_INVITATIONS_LIST_${user?.id}`,
    () => {
      if (user?.id) return workspaceService.userWorkspaceInvitations();
    }
  );

  return (
    <AuthenticationWrapper pageType={EPageTypes.ONBOARDING}>
      <div className="flex relative size-full overflow-hidden bg-canvas rounded-lg transition-all ease-in-out duration-300">
        <div className="size-full p-2 flex-grow transition-all ease-in-out duration-300 overflow-hidden">
          <div className="relative flex flex-col h-full w-full overflow-hidden rounded-lg bg-surface-1 shadow-md border border-subtle">
            {user && !invitationsLoader ? (
              <OnboardingRoot invitations={invitations ?? []} />
            ) : (
              <div className="grid h-full w-full place-items-center">
                <LogoSpinner />
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthenticationWrapper>
  );
}

export default observer(OnboardingPage);
