"use client";

import { useParams } from "next/navigation";
// components
import { PageHead } from "@/components/core/page-title";
// hooks
import { useWorkspaceDetails } from "@/store/queries/workspace";
// plane web components
import { AssignmentsView } from "@/plane-web/components/resource-view/assignments-view";

function AssignmentsPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { data: currentWorkspace } = useWorkspaceDetails(workspaceSlug || "");
  const pageTitle = currentWorkspace?.name ? `${currentWorkspace?.name} - Assignments` : undefined;

  return (
    <>
      <PageHead title={pageTitle} />
      <AssignmentsView />
    </>
  );
}

export default AssignmentsPage;
