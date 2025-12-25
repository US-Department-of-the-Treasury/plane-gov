// components
import { PageHead } from "@/components/core/page-title";
// hooks
import { useWorkspaceDetails } from "@/store/queries/workspace";
import type { Route } from "./+types/page";

function WorkspaceActiveSprintsPage({ params }: Route.ComponentProps) {
  const { workspaceSlug } = params;
  const { data: currentWorkspace } = useWorkspaceDetails(workspaceSlug);
  // derived values
  const pageTitle = currentWorkspace?.name ? `${currentWorkspace?.name} - Active Sprints` : undefined;

  return (
    <>
      <PageHead title={pageTitle} />
    </>
  );
}

export default WorkspaceActiveSprintsPage;
