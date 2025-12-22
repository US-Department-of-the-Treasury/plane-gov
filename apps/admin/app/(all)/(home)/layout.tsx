import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Outlet } from "react-router";
// hooks
import { useCurrentUser } from "@/store/queries";

export default function RootLayout() {
  // router
  const { replace } = useRouter();
  // query hooks
  const { data: currentUser, isSuccess, isError } = useCurrentUser();

  // Determine if user is logged in based on query state
  const isUserLoggedIn = isSuccess ? !!currentUser : isError ? false : undefined;

  useEffect(() => {
    if (isUserLoggedIn === true) replace("/general");
  }, [replace, isUserLoggedIn]);

  return (
    <div className="relative z-10 flex flex-col items-center w-screen h-screen overflow-hidden overflow-y-auto pt-6 pb-10 px-8 bg-surface-1">
      <Outlet />
    </div>
  );
}
