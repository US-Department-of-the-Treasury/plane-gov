import React from "react";
import { usePathname, useSearchParams } from "next/navigation";
// hooks
import { generateQueryParams } from "@plane/utils";
import { useAppRouter } from "@/hooks/use-app-router";
import { useModuleDetails, useArchivedModules } from "@/store/queries/module";
// components
import { ModuleAnalyticsSidebar } from "./";

type Props = {
  projectId: string;
  workspaceSlug: string;
  isArchived?: boolean;
};

export function ModulePeekOverview({
  projectId,
  workspaceSlug,
  isArchived = false,
}: Props) {
  // router
  const router = useAppRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const peekModule = searchParams.get("peekModule");
  // refs
  const ref = React.useRef(null);

  // TanStack Query hooks - fetch module details automatically when peekModule changes
  // The hooks have built-in enabled logic based on parameter truthiness
  // For archived modules, fetch all archived modules (the specific module will be in the list)
  useArchivedModules(workspaceSlug, projectId);
  // For non-archived modules, fetch specific module details
  useModuleDetails(workspaceSlug, projectId, peekModule?.toString() ?? "");

  const handleClose = () => {
    const query = generateQueryParams(searchParams, ["peekModule"]);
    router.push(`${pathname}?${query}`);
  };

  return (
    <>
      {peekModule && (
        <div
          ref={ref}
          className="flex h-full w-full max-w-[24rem] flex-shrink-0 flex-col gap-3.5 overflow-y-auto border-l border-subtle bg-surface-1 px-6 duration-300 absolute md:relative right-0 z-[9]"
          style={{
            boxShadow:
              "0px 1px 4px 0px rgba(0, 0, 0, 0.06), 0px 2px 4px 0px rgba(16, 24, 40, 0.06), 0px 1px 8px -1px rgba(16, 24, 40, 0.06)",
          }}
        >
          <ModuleAnalyticsSidebar
            moduleId={peekModule?.toString() ?? ""}
            handleClose={handleClose}
            isArchived={isArchived}
          />
        </div>
      )}
    </>
  );
}
