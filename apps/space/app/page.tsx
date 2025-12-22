import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
// plane imports
import { isValidNextPath } from "@plane/utils";
// components
import { UserLoggedIn } from "@/components/account/user-logged-in";
import { LogoSpinner } from "@/components/common/logo-spinner";
import { AuthView } from "@/components/views";
// store hooks
import { useCurrentUser } from "@/store/queries";
import type { Route } from "./+types/page";

export const headers: Route.HeadersFunction = () => ({
  "X-Frame-Options": "SAMEORIGIN",
});

export default function HomePage() {
  const { data: currentUser, isLoading } = useCurrentUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const nextPath = searchParams.get("next_path");

  const isAuthenticated = !!currentUser;

  useEffect(() => {
    if (currentUser && isAuthenticated && nextPath && isValidNextPath(nextPath)) {
      router.replace(nextPath);
    }
  }, [currentUser, isAuthenticated, nextPath, router]);

  if (isLoading)
    return (
      <div className="bg-surface-1 flex h-screen min-h-[500px] w-full justify-center items-center">
        <LogoSpinner />
      </div>
    );

  if (currentUser && isAuthenticated) {
    if (nextPath && isValidNextPath(nextPath)) {
      return (
        <div className="bg-surface-1 flex h-screen min-h-[500px] w-full justify-center items-center">
          <LogoSpinner />
        </div>
      );
    }
    return <UserLoggedIn />;
  }

  return <AuthView />;
}
