import { Outlet } from "react-router";
import { ProjectsAppPowerKProvider } from "@/components/power-k/projects-app-provider";
// local imports
import { WikiSidebar } from "./_sidebar";

function WikiModeLayout() {
  return (
    <>
      <ProjectsAppPowerKProvider />
      <div className="relative flex flex-col h-full w-full overflow-hidden rounded-lg border border-subtle">
        <div id="full-screen-portal" className="inset-0 absolute w-full" />
        <div className="relative flex size-full overflow-hidden">
          <WikiSidebar />
          <main className="relative flex h-full w-full flex-col overflow-hidden bg-surface-1">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}

export default WikiModeLayout;
