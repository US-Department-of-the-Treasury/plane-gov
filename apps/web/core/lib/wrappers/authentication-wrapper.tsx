import type { ReactNode } from "react";

import { useSearchParams, usePathname } from "next/navigation";
// components
import { LogoSpinner } from "@/components/common/logo-spinner";
// helpers
import { EPageTypes } from "@/helpers/authentication.helper";
// hooks
import { useAppRouter } from "@/hooks/use-app-router";
import { useCurrentUser, useCurrentUserSettings } from "@/store/queries/user";
import { useWorkspaces } from "@/store/queries/workspace";

type TPageType = EPageTypes;

type TAuthenticationWrapper = {
  children: ReactNode;
  pageType?: TPageType;
};

const isValidURL = (url: string): boolean => {
  const disallowedSchemes = /^(https?|ftp):\/\//i;
  return !disallowedSchemes.test(url);
};

export function AuthenticationWrapper(props: TAuthenticationWrapper) {
  const pathname = usePathname();
  const router = useAppRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next_path");
  // props
  const { children, pageType = EPageTypes.AUTHENTICATED } = props;
  // TanStack Query hooks
  const { isPending: isUserLoading, data: currentUser } = useCurrentUser();
  const { data: currentUserSettings } = useCurrentUserSettings();
  const { data: workspaces, isLoading: workspacesLoader } = useWorkspaces();

  // For government deployments: skip onboarding entirely
  // User either has workspace access or they don't
  const hasWorkspaceAccess = workspaces && workspaces.length > 0;

  const getWorkspaceRedirectionUrl = (): string => {
    // If no workspaces, show the no-workspace page
    if (!hasWorkspaceAccess) return "/no-workspace";

    // validating the nextPath from the router query
    if (nextPath && isValidURL(nextPath.toString())) {
      return nextPath.toString();
    }

    // validate the last and fallback workspace_slug
    const currentWorkspaceSlug =
      currentUserSettings?.workspace?.last_workspace_slug || currentUserSettings?.workspace?.fallback_workspace_slug;

    // validate the current workspace_slug is available in the user's workspace list
    const isCurrentWorkspaceValid = workspaces
      ? workspaces.findIndex((workspace) => workspace.slug === currentWorkspaceSlug)
      : -1;

    if (isCurrentWorkspaceValid >= 0) return `/${currentWorkspaceSlug}`;

    // Default to first workspace if settings don't have a valid one
    if (workspaces && workspaces.length > 0) return `/${workspaces[0].slug}`;

    return "/no-workspace";
  };

  if ((isUserLoading || workspacesLoader) && !currentUser?.id)
    return (
      <div className="relative flex h-screen w-full items-center justify-center">
        <LogoSpinner />
      </div>
    );

  if (pageType === EPageTypes.PUBLIC) return <>{children}</>;

  if (pageType === EPageTypes.NON_AUTHENTICATED) {
    if (!currentUser?.id) return <>{children}</>;
    else {
      const currentRedirectRoute = getWorkspaceRedirectionUrl();
      router.push(currentRedirectRoute);
      return <></>;
    }
  }

  // Redirect /onboarding to workspace or no-workspace page
  if (pageType === EPageTypes.ONBOARDING) {
    if (!currentUser?.id) {
      router.push(`/${pathname ? `?next_path=${pathname}` : ``}`);
      return <></>;
    } else {
      const currentRedirectRoute = getWorkspaceRedirectionUrl();
      router.replace(currentRedirectRoute);
      return <></>;
    }
  }

  if (pageType === EPageTypes.SET_PASSWORD) {
    if (!currentUser?.id) {
      router.push(`/${pathname ? `?next_path=${pathname}` : ``}`);
      return <></>;
    } else {
      if (currentUser && !currentUser?.is_password_autoset) {
        const currentRedirectRoute = getWorkspaceRedirectionUrl();
        router.push(currentRedirectRoute);
        return <></>;
      } else return <>{children}</>;
    }
  }

  if (pageType === EPageTypes.AUTHENTICATED) {
    if (currentUser?.id) {
      return <>{children}</>;
    } else {
      router.push(`/${pathname ? `?next_path=${pathname}` : ``}`);
      return <></>;
    }
  }

  return <>{children}</>;
}
