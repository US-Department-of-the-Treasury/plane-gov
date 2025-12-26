import { useMemo } from "react";
import { useLocation, useNavigate, useParams as useParamsRR, useSearchParams as useSearchParamsRR } from "react-router";
import { ensureTrailingSlash } from "./helper";

export function useRouter() {
  const navigate = useNavigate();
  return useMemo(
    () => ({
      push: (to: string) => {
        // Defer navigation to avoid state updates during render
        setTimeout(() => navigate(ensureTrailingSlash(to)), 0);
      },
      replace: (to: string) => {
        // Defer navigation to avoid state updates during render
        setTimeout(() => navigate(ensureTrailingSlash(to), { replace: true }), 0);
      },
      back: () => {
        setTimeout(() => navigate(-1), 0);
      },
      forward: () => {
        setTimeout(() => navigate(1), 0);
      },
      refresh: () => {
        location.reload();
      },
      prefetch: async (_to: string) => {
        // no-op in this shim
      },
    }),
    [navigate]
  );
}

export function usePathname(): string {
  const { pathname } = useLocation();
  return pathname;
}

export function useSearchParams(): URLSearchParams {
  const [searchParams] = useSearchParamsRR();
  return searchParams;
}

export function useParams() {
  return useParamsRR();
}

/**
 * Redirect function for compat with Next.js redirect()
 *
 * NOTE: This is a compat shim that does NOT work the same as Next.js redirect().
 * Next.js redirect() throws a special error that Next.js catches, which doesn't
 * work in React Router context. For redirects in page components, use:
 *   import { Navigate } from "react-router";
 *   return <Navigate to="/path" replace />;
 *
 * This function performs a hard navigation as a fallback.
 */
export function redirect(to: string): never {
  // Client-side redirect using location.replace
  if (typeof window !== "undefined") {
    window.location.replace(to);
  }
  // This function should not be called in a render context
  // If you see this error, use React Router's Navigate component instead
  throw new Error(
    `redirect() called server-side or in unsupported context. ` +
      `Use <Navigate to="${to}" replace /> instead.`
  );
}
