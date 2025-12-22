"use client";

// components
import { PageHead } from "@/components/core/page-title";
// plane web components
import { ResourceViewRoot } from "@/plane-web/components/resource-view";
// hooks
import { useWorkspaceDetails } from "@/store/queries/workspace";
import type { Route } from "./+types/page";

function ResourceViewPage({ params }: Route.ComponentProps) {
  const { workspaceSlug } = params;
  const { data: currentWorkspace } = useWorkspaceDetails(workspaceSlug);
  // derived values
  const pageTitle = currentWorkspace?.name ? `${currentWorkspace?.name} - Resource View` : undefined;

  return (
    <>
      <PageHead title={pageTitle} />
      <ResourceViewRoot />
    </>
  );
}

export default ResourceViewPage;
