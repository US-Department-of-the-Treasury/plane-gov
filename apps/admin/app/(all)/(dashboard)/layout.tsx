import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Outlet } from "react-router";
// components
import { LogoSpinner } from "@/components/common/logo-spinner";
import { NewUserPopup } from "@/components/new-user-popup";
// hooks
import { useCurrentUser } from "@/store/queries";
// local components
import type { Route } from "./+types/layout";
import { AdminHeader } from "./header";
import { AdminSidebar } from "./sidebar";

export default function AdminLayout(_props: Route.ComponentProps) {
  // router
  const { replace } = useRouter();
  // query hooks
  const { data: currentUser, isSuccess, isError, isPending } = useCurrentUser();

  // Determine if user is logged in based on query state
  const isUserLoggedIn = isSuccess ? !!currentUser : isError ? false : undefined;

  useEffect(() => {
    if (isUserLoggedIn === false) replace("/");
  }, [replace, isUserLoggedIn]);

  if (isUserLoggedIn === undefined) {
    return (
      <div className="relative flex h-screen w-full items-center justify-center">
        <LogoSpinner />
      </div>
    );
  }

  if (isUserLoggedIn) {
    return (
      <div className="relative flex h-screen w-screen overflow-hidden">
        <AdminSidebar />
        <main className="relative flex h-full w-full flex-col overflow-hidden bg-surface-1">
          <AdminHeader />
          <div className="h-full w-full overflow-hidden overflow-y-scroll vertical-scrollbar scrollbar-md">
            <Outlet />
          </div>
        </main>
        <NewUserPopup />
      </div>
    );
  }

  return <></>;
}
