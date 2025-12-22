import type { ReactNode } from "react";
// components
import { LogoSpinner } from "@/components/common/logo-spinner";
import { InstanceNotReady, MaintenanceView } from "@/components/instance";
// hooks
import { useInstanceInfo } from "@/store/queries/instance";

type TInstanceWrapper = {
  children: ReactNode;
};

export function InstanceWrapper(props: TInstanceWrapper) {
  const { children } = props;
  // TanStack Query - fetch instance info
  const { isPending, data: instanceInfo, error } = useInstanceInfo();

  // loading state
  if (isPending && !instanceInfo)
    return (
      <div className="relative flex h-screen w-full items-center justify-center">
        <LogoSpinner />
      </div>
    );

  if (error) return <MaintenanceView />;

  // instance is not ready and setup is not done
  if (instanceInfo?.instance?.is_setup_done === false) return <InstanceNotReady />;

  return <>{children}</>;
}
