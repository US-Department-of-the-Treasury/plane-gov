"use client";

import { useParams } from "next/navigation";
// components
import { PageHead } from "@/components/core/page-title";
// hooks
import { useWorkspaceDetails } from "@/store/queries/workspace";
// plane web components
import { ContractsView } from "@/plane-web/components/resource-view/contracts-view";

function ContractsPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { data: currentWorkspace } = useWorkspaceDetails(workspaceSlug || "");
  const pageTitle = currentWorkspace?.name ? `${currentWorkspace?.name} - Contracts` : undefined;

  return (
    <>
      <PageHead title={pageTitle} />
      <ContractsView />
    </>
  );
}

export default ContractsPage;
