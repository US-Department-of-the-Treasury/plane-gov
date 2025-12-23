"use client";

// components
import { PageHead } from "@/components/core/page-title";
// plane web components
import { ResourceViewRoot } from "@/plane-web/components/resource-view";
// hooks
import { useWorkspaceDetails } from "@/store/queries/workspace";
import { useParams } from "react-router";

function ResourcesPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { data: currentWorkspace } = useWorkspaceDetails(workspaceSlug || "");
  // derived values
  const pageTitle = currentWorkspace?.name ? `${currentWorkspace?.name} - Resources` : undefined;

  return (
    <>
      <PageHead title={pageTitle} />
      <ResourceViewRoot />
    </>
  );
}

export default ResourcesPage;
