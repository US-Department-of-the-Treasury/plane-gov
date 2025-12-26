import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
// plane imports
import { API_BASE_URL } from "@plane/constants";
import { OAuthOptions } from "@plane/ui";
// helpers
import type { TAuthErrorInfo } from "@/helpers/authentication.helper";
import {
  EAuthModes,
  EAuthSteps,
  EAuthenticationErrorCodes,
  EErrorAlertType,
  authErrorHandler,
} from "@/helpers/authentication.helper";
// hooks
import { useInstance } from "@/hooks/store/use-instance";
// local imports
import { TermsAndConditions } from "../terms-and-conditions";
import { AuthBanner } from "./auth-banner";
import { AuthHeader } from "./auth-header";
import { AuthFormRoot } from "./form-root";
// plane web imports
import { OAUTH_CONFIG, isOAuthEnabled as isOAuthEnabledHelper } from "@/plane-web/helpers/oauth-config";

type TAuthRoot = {
  authMode: EAuthModes;
};

export function AuthRoot(props: TAuthRoot) {
  //router
  const searchParams = useSearchParams();
  // query params
  const emailParam = searchParams.get("email");
  const invitation_id = searchParams.get("invitation_id");
  const workspaceSlug = searchParams.get("slug");
  const error_code = searchParams.get("error_code");
  const next_path = searchParams.get("next_path");
  const skip_oidc = searchParams.get("skip_oidc");
  const { resolvedTheme } = useTheme();
  // props
  const { authMode: currentAuthMode } = props;
  // states
  const [authMode, setAuthMode] = useState<EAuthModes | undefined>(undefined);
  // SECURITY: Start with PASSWORD step to show email+password together
  // This prevents account enumeration attacks (CWE-204)
  const [authStep, setAuthStep] = useState<EAuthSteps>(EAuthSteps.PASSWORD);
  const [email, setEmail] = useState(emailParam ? emailParam.toString() : "");
  const [errorInfo, setErrorInfo] = useState<TAuthErrorInfo | undefined>(undefined);
  const [oidcRedirectCountdown, setOidcRedirectCountdown] = useState<number | null>(null);

  // hooks
  const { config } = useInstance();

  // derived values
  const isOAuthEnabled = isOAuthEnabledHelper(config);

  // Check if OIDC is the only/primary auth method and should auto-redirect
  const shouldAutoRedirectToOidc =
    !skip_oidc && config?.is_oidc_enabled && !config?.is_email_password_enabled && !config?.is_magic_login_enabled;

  useEffect(() => {
    if (!authMode && currentAuthMode) setAuthMode(currentAuthMode);
  }, [currentAuthMode, authMode]);

  // Auto-redirect to OIDC when it's the only auth method
  useEffect(() => {
    if (shouldAutoRedirectToOidc && config?.is_oidc_enabled) {
      // Start countdown
      setOidcRedirectCountdown(3);

      const timer = setInterval(() => {
        setOidcRedirectCountdown((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            // Redirect to OIDC
            const redirectPath = next_path ? encodeURIComponent(next_path) : "";
            window.location.assign(`${API_BASE_URL}/auth/oidc/${redirectPath ? `?next_path=${redirectPath}` : ""}`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [shouldAutoRedirectToOidc, config?.is_oidc_enabled, next_path]);

  useEffect(() => {
    if (error_code && authMode) {
      const errorhandler = authErrorHandler(error_code?.toString() as EAuthenticationErrorCodes);
      if (errorhandler) {
        // password error handler
        if ([EAuthenticationErrorCodes.AUTHENTICATION_FAILED_SIGN_UP].includes(errorhandler.code)) {
          setAuthMode(EAuthModes.SIGN_UP);
          setAuthStep(EAuthSteps.PASSWORD);
        }
        if ([EAuthenticationErrorCodes.AUTHENTICATION_FAILED_SIGN_IN].includes(errorhandler.code)) {
          setAuthMode(EAuthModes.SIGN_IN);
          setAuthStep(EAuthSteps.PASSWORD);
        }
        // Generic authentication failure - stay on current mode and password step
        if ([EAuthenticationErrorCodes.AUTHENTICATION_FAILED].includes(errorhandler.code)) {
          setAuthStep(EAuthSteps.PASSWORD);
        }
        // magic_code error handler
        if (
          [
            EAuthenticationErrorCodes.INVALID_MAGIC_CODE_SIGN_UP,
            EAuthenticationErrorCodes.INVALID_EMAIL_MAGIC_SIGN_UP,
            EAuthenticationErrorCodes.EXPIRED_MAGIC_CODE_SIGN_UP,
            EAuthenticationErrorCodes.EMAIL_CODE_ATTEMPT_EXHAUSTED_SIGN_UP,
          ].includes(errorhandler.code)
        ) {
          setAuthMode(EAuthModes.SIGN_UP);
          setAuthStep(EAuthSteps.UNIQUE_CODE);
        }
        if (
          [
            EAuthenticationErrorCodes.INVALID_MAGIC_CODE_SIGN_IN,
            EAuthenticationErrorCodes.INVALID_EMAIL_MAGIC_SIGN_IN,
            EAuthenticationErrorCodes.EXPIRED_MAGIC_CODE_SIGN_IN,
            EAuthenticationErrorCodes.EMAIL_CODE_ATTEMPT_EXHAUSTED_SIGN_IN,
          ].includes(errorhandler.code)
        ) {
          setAuthMode(EAuthModes.SIGN_IN);
          setAuthStep(EAuthSteps.UNIQUE_CODE);
        }

        setErrorInfo(errorhandler);
      }
    }
  }, [error_code, authMode]);

  if (!authMode) return <></>;

  // Show countdown UI when auto-redirecting to OIDC
  if (oidcRedirectCountdown !== null && oidcRedirectCountdown > 0 && shouldAutoRedirectToOidc) {
    return (
      <div className="flex flex-col justify-center items-center flex-grow w-full py-6 mt-10">
        <div className="relative flex flex-col gap-6 max-w-[22.5rem] w-full text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full border-4 border-custom-primary-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-custom-primary-100">{oidcRedirectCountdown}</span>
            </div>
            <h2 className="text-xl font-semibold text-custom-text-100">
              Redirecting to {config?.oidc_provider_name || "PIV Card"} authentication...
            </h2>
            <p className="text-sm text-custom-text-300">
              You will be redirected in {oidcRedirectCountdown} second{oidcRedirectCountdown !== 1 ? "s" : ""}.
            </p>
          </div>
          <a href="?skip_oidc=true" className="text-sm text-custom-text-300 hover:text-custom-primary-100 underline">
            Can&apos;t use {config?.oidc_provider_name || "PIV Card"}? Click here for alternatives
          </a>
        </div>
      </div>
    );
  }

  const OauthButtonContent = authMode === EAuthModes.SIGN_UP ? "Sign up" : "Sign in";

  const OAuthConfig = OAUTH_CONFIG({ OauthButtonContent, next_path, config, resolvedTheme });

  return (
    <div className="flex flex-col justify-center items-center flex-grow w-full py-6 mt-10">
      <div className="relative flex flex-col gap-6 max-w-[22.5rem] w-full">
        {errorInfo && errorInfo?.type === EErrorAlertType.BANNER_ALERT && (
          <AuthBanner bannerData={errorInfo} handleBannerData={(value) => setErrorInfo(value)} />
        )}
        <AuthHeader
          workspaceSlug={workspaceSlug?.toString() || undefined}
          invitationId={invitation_id?.toString() || undefined}
          invitationEmail={email || undefined}
          authMode={authMode}
          currentAuthStep={authStep}
        />

        {isOAuthEnabled && <OAuthOptions options={OAuthConfig} compact={authStep === EAuthSteps.PASSWORD} />}

        <AuthFormRoot
          authStep={authStep}
          authMode={authMode}
          email={email}
          setEmail={(email) => setEmail(email)}
          setAuthMode={(authMode) => setAuthMode(authMode)}
          setAuthStep={(authStep) => setAuthStep(authStep)}
          setErrorInfo={(errorInfo) => setErrorInfo(errorInfo)}
          currentAuthMode={currentAuthMode}
        />
        <TermsAndConditions />
      </div>
    </div>
  );
}
