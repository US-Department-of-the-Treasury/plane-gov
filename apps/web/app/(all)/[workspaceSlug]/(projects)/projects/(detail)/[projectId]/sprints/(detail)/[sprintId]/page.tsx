import { observer } from "mobx-react";
// plane imports
import { cn } from "@plane/utils";
// assets
import emptySprint from "@/app/assets/empty-state/sprint.svg?url";
// components
import { EmptyState } from "@/components/common/empty-state";
import { PageHead } from "@/components/core/page-title";
import useSprintsDetails from "@/components/sprints/active-sprint/use-sprints-details";
import { SprintDetailsSidebar } from "@/components/sprints/analytics-sidebar";
import { SprintLayoutRoot } from "@/components/issues/issue-layouts/roots/sprint-layout-root";
// hooks
import { useSprintDetails } from "@/store/queries/sprint";
import { useProjectDetails } from "@/store/queries/project";
import { useAppRouter } from "@/hooks/use-app-router";
import useLocalStorage from "@/hooks/use-local-storage";
import type { Route } from "./+types/page";

function SprintDetailPage({ params }: Route.ComponentProps) {
  // router
  const router = useAppRouter();
  const { workspaceSlug, projectId, sprintId } = params;
  // hooks
  const { setValue, storedValue } = useLocalStorage("sprint_sidebar_collapsed", false);

  // TanStack Query
  const { data: sprint, isLoading } = useSprintDetails(workspaceSlug, projectId, sprintId);
  const { data: project } = useProjectDetails(workspaceSlug, projectId);

  useSprintsDetails({
    workspaceSlug,
    projectId,
    sprintId,
  });
  // derived values
  const isSidebarCollapsed = storedValue ? (storedValue === true ? true : false) : false;
  const pageTitle = project?.name && sprint?.name ? `${project?.name} - ${sprint?.name}` : undefined;

  /**
   * Toggles the sidebar
   */
  const toggleSidebar = () => setValue(!isSidebarCollapsed);

  // const activeLayout = issuesFilter?.issueFilters?.displayFilters?.layout;
  return (
    <>
      <PageHead title={pageTitle} />
      {!sprint && !isLoading ? (
        <EmptyState
          image={emptySprint}
          title="Sprint does not exist"
          description="The sprint you are looking for does not exist or has been deleted."
          primaryButton={{
            text: "View other sprints",
            onClick: () => router.push(`/${workspaceSlug}/projects/${projectId}/sprints`),
          }}
        />
      ) : (
        <>
          <div className="flex h-full w-full">
            <div className="h-full w-full overflow-hidden">
              <SprintLayoutRoot />
            </div>
            {!isSidebarCollapsed && (
              <div
                className={cn(
                  "flex h-full w-[21.5rem] flex-shrink-0 flex-col gap-3.5 overflow-y-auto border-l border-subtle bg-surface-1 px-4 duration-300 vertical-scrollbar scrollbar-sm absolute right-0 z-13 shadow-raised-200"
                )}
              >
                <SprintDetailsSidebar
                  handleClose={toggleSidebar}
                  sprintId={sprintId}
                  projectId={projectId}
                  workspaceSlug={workspaceSlug}
                />
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

export default observer(SprintDetailPage);
