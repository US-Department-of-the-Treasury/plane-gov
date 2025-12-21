"use client";

import { observer } from "mobx-react";
// components
import { PageHead } from "@/components/core/page-title";
// hooks
import { useWorkspace } from "@/hooks/store/use-workspace";
// plane web components
import { ResourceViewRoot } from "@/plane-web/components/resource-view";

const ResourceViewPage = observer(function ResourceViewPage() {
  const { currentWorkspace } = useWorkspace();
  // derived values
  const pageTitle = currentWorkspace?.name ? `${currentWorkspace?.name} - Resource View` : undefined;

  return (
    <>
      <PageHead title={pageTitle} />
      <ResourceViewRoot />
    </>
  );
});

export default ResourceViewPage;
