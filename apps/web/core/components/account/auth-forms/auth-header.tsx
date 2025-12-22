import type { FC } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@plane/i18n";
import type { IWorkspaceMemberInvitation } from "@plane/types";
// components
import { LogoSpinner } from "@/components/common/logo-spinner";
import { WorkspaceLogo } from "@/components/workspace/logo";
// helpers
import { EAuthModes, EAuthSteps } from "@/helpers/authentication.helper";
import { WorkspaceService } from "@/plane-web/services";
// services

type TAuthHeader = {
  workspaceSlug: string | undefined;
  invitationId: string | undefined;
  invitationEmail: string | undefined;
  authMode: EAuthModes;
  currentAuthStep: EAuthSteps;
};

const Titles = {
  [EAuthModes.SIGN_IN]: {
    [EAuthSteps.EMAIL]: {
      header: "Work in all dimensions.",
      subHeader: "Welcome back to Plane.",
    },
    [EAuthSteps.PASSWORD]: {
      header: "Work in all dimensions.",
      subHeader: "Welcome back to Plane.",
    },
    [EAuthSteps.UNIQUE_CODE]: {
      header: "Work in all dimensions.",
      subHeader: "Welcome back to Plane.",
    },
  },
  [EAuthModes.SIGN_UP]: {
    [EAuthSteps.EMAIL]: {
      header: "Work in all dimensions.",
      subHeader: "Create your Plane account.",
    },
    [EAuthSteps.PASSWORD]: {
      header: "Work in all dimensions.",
      subHeader: "Create your Plane account.",
    },
    [EAuthSteps.UNIQUE_CODE]: {
      header: "Work in all dimensions.",
      subHeader: "Create your Plane account.",
    },
  },
};

const workSpaceService = new WorkspaceService();

export function AuthHeader(props: TAuthHeader) {
  const { workspaceSlug, invitationId, invitationEmail, authMode, currentAuthStep } = props;
  // plane imports
  const { t } = useTranslation();

  const { data: invitation, isPending: isLoading } = useQuery({
    queryKey: ["workspace-invitation", workspaceSlug, invitationId],
    queryFn: async () => workSpaceService.getWorkspaceInvitation(workspaceSlug!, invitationId!),
    enabled: !!(workspaceSlug && invitationId),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });

  const getHeaderSubHeader = (
    step: EAuthSteps,
    mode: EAuthModes,
    invitation: IWorkspaceMemberInvitation | undefined,
    email: string | undefined
  ) => {
    if (invitation && email && invitation.email === email && invitation.workspace) {
      const workspace = invitation.workspace;
      return {
        header: (
          <div className="relative inline-flex items-center gap-2">
            {t("common.join")}{" "}
            <WorkspaceLogo logo={workspace?.logo_url} name={workspace?.name} classNames="size-9 flex-shrink-0" />{" "}
            {workspace.name}
          </div>
        ),
        subHeader:
          mode == EAuthModes.SIGN_UP
            ? "Create an account to start managing work with your team."
            : "Log in to start managing work with your team.",
      };
    }

    return Titles[mode][step];
  };

  const { header, subHeader } = getHeaderSubHeader(currentAuthStep, authMode, invitation || undefined, invitationEmail);

  if (isLoading)
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LogoSpinner />
      </div>
    );

  return (
    <div className="flex flex-col gap-1">
      <span className="text-h4-semibold text-primary">{typeof header === "string" ? t(header) : header}</span>
      <span className="text-h4-semibold text-placeholder">{subHeader}</span>
    </div>
  );
}
