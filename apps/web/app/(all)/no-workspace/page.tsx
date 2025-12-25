"use client";

import Link from "next/link";
// plane imports
import { PlaneLogo } from "@plane/propel/icons";
// hooks
import { useUser } from "@/hooks/store/user";
// wrappers
import { AuthenticationWrapper } from "@/lib/wrappers/authentication-wrapper";

function NoWorkspacePage() {
  // store hooks
  const { data: currentUser } = useUser();

  return (
    <AuthenticationWrapper>
      <div className="flex h-full flex-col gap-y-2 overflow-hidden sm:flex-row sm:gap-y-0 bg-surface-1">
        <div className="relative h-1/6 flex-shrink-0 sm:w-2/12 md:w-3/12 lg:w-1/5">
          <div className="absolute left-0 top-1/2 h-[0.5px] w-full -translate-y-1/2 border-b-[0.5px] border-subtle sm:left-1/2 sm:top-0 sm:h-screen sm:w-[0.5px] sm:-translate-x-1/2 sm:translate-y-0 sm:border-r-[0.5px] md:left-1/3" />
          <Link
            className="absolute left-5 top-1/2 grid -translate-y-1/2 place-items-center px-3 sm:left-1/2 sm:top-12 sm:-translate-x-[15px] sm:translate-y-0 sm:px-0 sm:py-5 md:left-1/3"
            href="/"
          >
            <PlaneLogo className="h-9 w-auto text-primary" />
          </Link>
          <div className="absolute right-4 top-1/4 -translate-y-1/2 text-13 text-primary sm:fixed sm:right-16 sm:top-12 sm:translate-y-0 sm:py-5">
            {currentUser?.email}
          </div>
        </div>
        <div className="relative flex h-full justify-center px-8 pb-8 sm:w-10/12 sm:items-center sm:justify-start sm:p-0 sm:pr-[8.33%] md:w-9/12 lg:w-4/5">
          <div className="w-4/5 h-full flex flex-col items-center justify-center text-16 font-medium gap-4">
            <div className="text-24 font-semibold text-center">No Workspace Access</div>
            <p className="text-14 text-tertiary break-words text-center max-w-md">
              You don&apos;t have access to any workspaces yet. Please contact your administrator to be added to a
              workspace.
            </p>
            <p className="text-13 text-quaternary text-center">Signed in as {currentUser?.email}</p>
          </div>
        </div>
      </div>
    </AuthenticationWrapper>
  );
}

export default NoWorkspacePage;
