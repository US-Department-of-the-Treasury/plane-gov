import { observer } from "mobx-react";
// components
import { PageHead } from "@/components/core/page-title";
// hooks
import { useWorkspace } from "@/hooks/store/use-workspace";
// plane web components
import { WorkspaceActiveSprintsRoot } from "@/plane-web/components/active-sprints";

function WorkspaceActiveSprintsPage() {
  const { currentWorkspace } = useWorkspace();
  // derived values
  const pageTitle = currentWorkspace?.name ? `${currentWorkspace?.name} - Active Sprints` : undefined;

  return (
    <>
      <PageHead title={pageTitle} />
      <WorkspaceActiveSprintsRoot />
    </>
  );
}

export default observer(WorkspaceActiveSprintsPage);
